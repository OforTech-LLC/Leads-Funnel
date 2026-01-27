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
 *   Checks notification timestamps on the lead record to prevent
 *   duplicate notifications on message replay.
 *
 * Partial Failure:
 *   Returns batchItemFailures for SQS partial batch failure handling.
 */

import type { SQSEvent, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import type {
  NotificationWorkerConfig,
  FeatureFlags,
  LeadRecord,
  LeadAssignedEventDetail,
  LeadUnassignedEventDetail,
} from './types.js';
import { dispatchNotifications } from '../lib/notifications/dispatcher.js';

// =============================================================================
// Client Initialization (reused across invocations)
// =============================================================================

let docClient: DynamoDBDocumentClient | null = null;
let ssmClient: SSMClient | null = null;

function getDocClient(region: string): DynamoDBDocumentClient {
  if (!docClient) {
    const client = new DynamoDBClient({ region });
    docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
  }
  return docClient;
}

function getSsmClient(region: string): SSMClient {
  if (!ssmClient) {
    ssmClient = new SSMClient({ region });
  }
  return ssmClient;
}

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
// Structured Logging
// =============================================================================

interface LogParams {
  level: 'info' | 'warn' | 'error';
  message: string;
  leadId?: string;
  funnelId?: string;
  eventType?: string;
  errorCode?: string;
  [key: string]: unknown;
}

function log(entry: LogParams): void {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'notification-worker',
      ...entry,
    })
  );
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
    log({
      level: 'warn',
      message: 'Feature flag SSM path not configured, using defaults',
    });
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
    log({
      level: 'error',
      message: 'Failed to load feature flags',
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
    log({
      level: 'error',
      message: 'Failed to get lead',
      leadId,
      funnelId,
      errorCode: 'DDB_GET_ERROR',
      error: errorMessage,
    });
    throw error;
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
      log({
        level: 'warn',
        message: 'Unknown event detail type',
        eventType: detailType,
      });
      return null;
    }

    const detail = envelope.detail;

    if (!detail || !detail.leadId || !detail.funnelId) {
      log({
        level: 'error',
        message: 'Invalid event detail: missing leadId or funnelId',
        eventType: detailType,
      });
      return null;
    }

    return {
      detailType: detailType as 'lead.assigned' | 'lead.unassigned',
      detail,
    };
  } catch {
    log({
      level: 'error',
      message: 'Failed to parse SQS message body as JSON',
      errorCode: 'PARSE_ERROR',
    });
    return null;
  }
}

// =============================================================================
// Duplicate Prevention
// =============================================================================

/**
 * Check if notifications have already been sent for this lead event.
 *
 * Uses notification timestamps on the lead record to detect duplicates:
 * - notifiedInternalAt: Internal notifications already sent
 * - notifiedOrgAt: Org notifications already sent
 *
 * @returns true if notifications have already been sent (duplicate)
 */
function isAlreadyNotified(lead: LeadRecord, eventType: string): boolean {
  if (eventType === 'lead.assigned') {
    // For assigned events, check both internal and org timestamps
    return !!(lead.notifiedInternalAt && lead.notifiedOrgAt);
  }

  if (eventType === 'lead.unassigned') {
    // For unassigned events, only internal notification is sent
    return !!lead.notifiedInternalAt;
  }

  return false;
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
 * 3. Check for duplicate notifications
 * 4. Dispatch all applicable notifications
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

  log({
    level: 'info',
    message: 'Processing notification event',
    leadId,
    funnelId,
    eventType: detailType,
  });

  // Load lead from DynamoDB
  const lead = await getLead(config, leadId, funnelId);

  if (!lead) {
    log({
      level: 'warn',
      message: 'Lead not found for notification',
      leadId,
      funnelId,
    });
    // Lead may have been deleted - do not retry
    return;
  }

  // Check for duplicate notifications
  if (isAlreadyNotified(lead, detailType)) {
    log({
      level: 'info',
      message: 'Notifications already sent for this event (duplicate)',
      leadId,
      funnelId,
      eventType: detailType,
    });
    return;
  }

  // Dispatch all notifications
  await dispatchNotifications(config, featureFlags, detail, lead);

  log({
    level: 'info',
    message: 'Notification processing complete',
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

  log({
    level: 'info',
    message: 'Notification worker invoked',
    recordCount: event.Records.length,
  });

  // Check feature flag
  const featureFlags = await loadFeatureFlags(config);

  if (!featureFlags.enable_notification_service) {
    log({
      level: 'info',
      message: 'Notification service disabled via feature flag',
    });

    // Return success for all records (no-op)
    return { batchItemFailures: [] };
  }

  // Validate configuration
  if (!config.ddbTableName) {
    log({
      level: 'error',
      message: 'DDB_TABLE_NAME not configured',
      errorCode: 'CONFIG_ERROR',
    });

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
      log({
        level: 'error',
        message: 'Failed to process notification record',
        messageId: record.messageId,
        errorCode: 'PROCESSING_ERROR',
        error: errorMessage,
      });

      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  log({
    level: 'info',
    message: 'Notification worker completed',
    totalRecords: event.Records.length,
    failedRecords: batchItemFailures.length,
  });

  return { batchItemFailures };
}
