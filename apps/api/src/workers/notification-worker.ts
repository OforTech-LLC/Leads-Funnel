/**
 * Notification Worker - SQS Lambda Handler
 *
 * Processes lead.assigned and lead.unassigned events from the
 * notification-queue (SQS). Dispatches email and SMS notifications
 * to internal ops and organization members.
 *
 * Event Flow:
 *   lead.assigned / lead.unassigned (EventBridge) -> SQS notification-queue -> this handler
 *
 * Notification Targets:
 *   lead.assigned:
 *     - Internal ops (email + SMS)
 *     - Assigned org members (based on org notification policy)
 *
 *   lead.unassigned:
 *     - Internal ops only (alert notification)
 *
 * Idempotency:
 *   Uses DynamoDB conditional update to atomically claim notification
 *   ownership before dispatching, preventing duplicate notifications
 *   on message replay.
 *
 * Partial Failure:
 *   Returns batchItemFailures for SQS partial batch failure handling.
 */

import type { SQSEvent, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { GetParameterCommand } from '@aws-sdk/client-ssm';
import type {
  NotificationWorkerConfig,
  FeatureFlags,
  LeadRecord,
  LeadAssignedEventDetail,
  LeadUnassignedEventDetail,
} from './types.js';
import { getDocClient, getSsmClient } from '../lib/clients.js';
import { createLogger } from '../lib/logging.js';
import { dispatchNotifications } from '../lib/notifications/dispatcher.js';

const log = createLogger('notification-worker');

// =============================================================================
// Configuration
// =============================================================================

function loadConfig(): NotificationWorkerConfig {
  return {
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    env: (process.env.ENV as 'dev' | 'prod') || 'dev',
    ddbTableName: process.env.DDB_TABLE_NAME || '',
    featureFlagSsmPath: process.env.FEATURE_FLAG_SSM_PATH || '',
    internalRecipientsSsmPath: process.env.INTERNAL_RECIPIENTS_SSM_PATH || '',
    sesFromAddress: process.env.SES_FROM_ADDRESS || 'noreply@kanjona.com',
    twilioSecretArn: process.env.TWILIO_SECRET_ARN || '',
    snsTopicArn: process.env.SNS_TOPIC_ARN || '',
  };
}

// =============================================================================
// Feature Flag Caching
// =============================================================================

let cachedFeatureFlags: FeatureFlags | null = null;
let featureFlagsCacheExpiry = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Load feature flags from SSM Parameter Store with 60s in-memory cache.
 */
async function loadFeatureFlags(config: NotificationWorkerConfig): Promise<FeatureFlags> {
  const now = Date.now();

  if (cachedFeatureFlags && now < featureFlagsCacheExpiry) {
    return cachedFeatureFlags;
  }

  if (!config.featureFlagSsmPath) {
    log.warn('Feature flag SSM path not configured, using defaults');
    return {
      enable_assignment_service: false,
      enable_notification_service: false,
      enable_email_notifications: false,
      enable_sms_notifications: false,
      enable_twilio: false,
      enable_sns_sms: false,
    };
  }

  try {
    const client = getSsmClient(config.awsRegion);
    const result = await client.send(
      new GetParameterCommand({
        Name: config.featureFlagSsmPath,
        WithDecryption: true,
      })
    );

    if (!result.Parameter?.Value) {
      throw new Error('Empty feature flag parameter');
    }

    const flags = JSON.parse(result.Parameter.Value) as FeatureFlags;
    cachedFeatureFlags = flags;
    featureFlagsCacheExpiry = now + CACHE_TTL_MS;

    return flags;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to load feature flags', {
      errorCode: 'SSM_LOAD_ERROR',
      error: errorMessage,
    });

    if (cachedFeatureFlags) {
      return cachedFeatureFlags;
    }

    return {
      enable_assignment_service: false,
      enable_notification_service: false,
      enable_email_notifications: false,
      enable_sms_notifications: false,
      enable_twilio: false,
      enable_sns_sms: false,
    };
  }
}

// =============================================================================
// DynamoDB Operations
// =============================================================================

/**
 * Load a lead record from DynamoDB.
 */
async function getLead(
  config: NotificationWorkerConfig,
  leadId: string,
  funnelId: string
): Promise<LeadRecord | null> {
  const client = getDocClient(config.awsRegion);

  try {
    const result = await client.send(
      new GetCommand({
        TableName: config.ddbTableName,
        Key: {
          pk: `LEAD#${leadId}`,
          sk: `FUNNEL#${funnelId}`,
        },
      })
    );

    return (result.Item as LeadRecord) || null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to get lead', {
      leadId,
      funnelId,
      errorCode: 'DDB_GET_ERROR',
      error: errorMessage,
    });
    throw error;
  }
}

/**
 * Claim notification lock using a DynamoDB conditional update.
 *
 * This prevents duplicate notifications by atomically setting a
 * notifiedAt timestamp only if one does not already exist.
 *
 * @returns true if the lock was claimed (caller should send notifications)
 * @returns false if already notified (caller should skip)
 */
async function claimNotificationLock(
  config: NotificationWorkerConfig,
  leadId: string,
  funnelId: string
): Promise<boolean> {
  const client = getDocClient(config.awsRegion);

  try {
    await client.send(
      new UpdateCommand({
        TableName: config.ddbTableName,
        Key: {
          pk: `LEAD#${leadId}`,
          sk: `FUNNEL#${funnelId}`,
        },
        UpdateExpression: 'SET notifiedAt = :now',
        ConditionExpression: 'attribute_not_exists(notifiedAt)',
        ExpressionAttributeValues: { ':now': new Date().toISOString() },
      })
    );
    return true;
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'name' in err &&
      err.name === 'ConditionalCheckFailedException'
    ) {
      log.info('Notification already sent, skipping duplicate', { leadId, funnelId });
      return false;
    }
    throw err;
  }
}

// =============================================================================
// Event Parsing
// =============================================================================

interface ParsedEvent {
  detailType: 'lead.assigned' | 'lead.unassigned';
  detail: LeadAssignedEventDetail | LeadUnassignedEventDetail;
}

/**
 * Parse the EventBridge event from an SQS message body.
 *
 * The SQS message contains the full EventBridge event envelope:
 * {
 *   "source": "kanjona.funnel",
 *   "detail-type": "lead.assigned",
 *   "detail": { ... }
 * }
 */
function parseEvent(messageBody: string): ParsedEvent | null {
  try {
    const envelope = JSON.parse(messageBody);

    const detailType = envelope['detail-type'] || envelope.detailType;

    if (detailType !== 'lead.assigned' && detailType !== 'lead.unassigned') {
      log.warn('Unknown event detail type', { eventType: detailType });
      return null;
    }

    const detail = envelope.detail;

    if (!detail || !detail.leadId || !detail.funnelId) {
      log.error('Invalid event detail: missing leadId or funnelId', {
        eventType: detailType,
      });
      return null;
    }

    return {
      detailType: detailType as 'lead.assigned' | 'lead.unassigned',
      detail,
    };
  } catch {
    log.error('Failed to parse SQS message body as JSON', {
      errorCode: 'PARSE_ERROR',
    });
    return null;
  }
}

// =============================================================================
// Single Record Processing
// =============================================================================

/**
 * Process a single notification event from the SQS queue.
 *
 * Flow:
 * 1. Parse the event envelope
 * 2. Load the lead record
 * 3. Claim notification lock (conditional write to prevent duplicates)
 * 4. If lock acquired, dispatch all applicable notifications
 */
async function processRecord(
  config: NotificationWorkerConfig,
  featureFlags: FeatureFlags,
  messageBody: string
): Promise<void> {
  // Parse event
  const parsed = parseEvent(messageBody);

  if (!parsed) {
    // Malformed message - do not retry
    return;
  }

  const { detailType, detail } = parsed;
  const { leadId, funnelId } = detail;

  log.info('Processing notification event', {
    leadId,
    funnelId,
    eventType: detailType,
  });

  // Load lead from DynamoDB
  const lead = await getLead(config, leadId, funnelId);

  if (!lead) {
    log.warn('Lead not found for notification', { leadId, funnelId });
    // Lead may have been deleted - do not retry
    return;
  }

  // Claim notification lock using conditional write (prevents duplicate notifications)
  const lockClaimed = await claimNotificationLock(config, leadId, funnelId);
  if (!lockClaimed) {
    // Already notified - duplicate message
    return;
  }

  // Lock claimed - dispatch all notifications
  await dispatchNotifications(config, featureFlags, detail, lead);

  log.info('Notification processing complete', {
    leadId,
    funnelId,
    eventType: detailType,
  });
}

// =============================================================================
// Lambda Handler
// =============================================================================

/**
 * SQS Lambda handler for the notification queue.
 *
 * Processes a batch of SQS messages containing lead.assigned and
 * lead.unassigned events. Uses partial batch failure reporting.
 *
 * @param event - SQS event containing one or more messages
 * @returns SQSBatchResponse with list of failed message IDs
 */
export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const config = loadConfig();

  log.info('Notification worker invoked', { recordCount: event.Records.length });

  // Check feature flag
  const featureFlags = await loadFeatureFlags(config);

  if (!featureFlags.enable_notification_service) {
    log.info('Notification service disabled via feature flag');

    // Return success for all records (no-op)
    return { batchItemFailures: [] };
  }

  // Validate configuration
  if (!config.ddbTableName) {
    log.error('DDB_TABLE_NAME not configured', { errorCode: 'CONFIG_ERROR' });

    // Fail all records so they are retried after config fix
    return {
      batchItemFailures: event.Records.map((record) => ({
        itemIdentifier: record.messageId,
      })),
    };
  }

  // Process each record, collecting failures
  const batchItemFailures: SQSBatchItemFailure[] = [];

  for (const record of event.Records) {
    try {
      await processRecord(config, featureFlags, record.body);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to process notification record', {
        messageId: record.messageId,
        errorCode: 'PROCESSING_ERROR',
        error: errorMessage,
      });

      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  log.info('Notification worker completed', {
    totalRecords: event.Records.length,
    failedRecords: batchItemFailures.length,
  });

  return { batchItemFailures };
}
