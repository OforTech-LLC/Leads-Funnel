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
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { GetParameterCommand } from '@aws-sdk/client-ssm';
import { getDocClient, getSsmClient } from '../lib/clients.js';
import { getAllFlags } from '../lib/feature-flags.js';
import { normalizeFeatureFlags } from '../lib/feature-flag-utils.js';
import { createLogger } from '../lib/logging.js';
import { dispatchNotifications } from '../lib/notifications/dispatcher.js';
import * as leadsDb from '../lib/db/leads.js';
import { DB_PREFIXES, DB_SORT_KEYS } from '../lib/constants.js';
const log = createLogger('notification-worker');
// =============================================================================
// Configuration
// =============================================================================
function loadConfig() {
    const fallbackTable = process.env.DDB_TABLE_NAME || '';
    return {
        awsRegion: process.env.AWS_REGION || 'us-east-1',
        env: process.env.ENV || 'dev',
        leadsTableName: process.env.PLATFORM_LEADS_TABLE_NAME || fallbackTable,
        orgsTableName: process.env.ORGS_TABLE_NAME || fallbackTable,
        usersTableName: process.env.USERS_TABLE_NAME || fallbackTable,
        membershipsTableName: process.env.MEMBERSHIPS_TABLE_NAME || fallbackTable,
        notificationsTableName: process.env.NOTIFICATIONS_TABLE || process.env.NOTIFICATIONS_TABLE_NAME || fallbackTable,
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
let cachedFeatureFlags = null;
let featureFlagsCacheExpiry = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const DEFAULT_WORKER_FLAGS = {
    enable_assignment_service: false,
    enable_notification_service: false,
    enable_email_notifications: false,
    enable_sms_notifications: false,
    enable_twilio_sms: false,
    enable_sns_sms: false,
};
const WORKER_FLAG_KEYS = [
    'enable_assignment_service',
    'enable_notification_service',
    'enable_email_notifications',
    'enable_sms_notifications',
    'enable_twilio_sms',
    'enable_sns_sms',
];
function pickWorkerFlags(flags) {
    return WORKER_FLAG_KEYS.reduce((acc, key) => {
        acc[key] = flags[key] ?? DEFAULT_WORKER_FLAGS[key];
        return acc;
    }, { ...DEFAULT_WORKER_FLAGS });
}
/**
 * Load feature flags from SSM Parameter Store with 60s in-memory cache.
 */
async function loadFeatureFlags(config) {
    const now = Date.now();
    if (cachedFeatureFlags && now < featureFlagsCacheExpiry) {
        return cachedFeatureFlags;
    }
    if (!config.featureFlagSsmPath) {
        log.warn('Feature flag SSM path not configured, falling back to per-flag SSM');
        const flags = pickWorkerFlags(await getAllFlags());
        cachedFeatureFlags = flags;
        featureFlagsCacheExpiry = now + CACHE_TTL_MS;
        return flags;
    }
    try {
        const client = getSsmClient(config.awsRegion);
        const result = await client.send(new GetParameterCommand({
            Name: config.featureFlagSsmPath,
            WithDecryption: true,
        }));
        if (!result.Parameter?.Value) {
            throw new Error('Empty feature flag parameter');
        }
        const parsed = JSON.parse(result.Parameter.Value);
        const normalized = normalizeFeatureFlags(parsed || {});
        const flags = pickWorkerFlags(normalized);
        cachedFeatureFlags = flags;
        featureFlagsCacheExpiry = now + CACHE_TTL_MS;
        return flags;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log.error('Failed to load feature flags', {
            errorCode: 'SSM_LOAD_ERROR',
            error: errorMessage,
        });
        if (cachedFeatureFlags) {
            return cachedFeatureFlags;
        }
        return DEFAULT_WORKER_FLAGS;
    }
}
// =============================================================================
// DynamoDB Operations
// =============================================================================
/**
 * Load a lead record from DynamoDB.
 */
async function getLead(_config, leadId, funnelId) {
    try {
        return (await leadsDb.getLead(funnelId, leadId));
    }
    catch (error) {
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
async function claimNotificationLock(config, leadId, funnelId) {
    const client = getDocClient(config.awsRegion);
    try {
        await client.send(new UpdateCommand({
            TableName: config.leadsTableName,
            Key: {
                pk: `${DB_PREFIXES.LEAD}${funnelId}#${leadId}`,
                sk: DB_SORT_KEYS.META,
            },
            UpdateExpression: 'SET notifiedAt = :now',
            ConditionExpression: 'attribute_not_exists(notifiedAt)',
            ExpressionAttributeValues: { ':now': new Date().toISOString() },
        }));
        return true;
    }
    catch (err) {
        if (err &&
            typeof err === 'object' &&
            'name' in err &&
            err.name === 'ConditionalCheckFailedException') {
            log.info('Notification already sent, skipping duplicate', { leadId, funnelId });
            return false;
        }
        throw err;
    }
}
/**
 * Parse the EventBridge event from an SQS message body.
 *
 * The SQS message contains the full EventBridge event envelope:
 * {
 *   "source": "kanjona.leads",
 *   "detail-type": "lead.assigned",
 *   "detail": { ... }
 * }
 */
function parseEvent(messageBody) {
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
            detailType: detailType,
            detail,
        };
    }
    catch {
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
async function processRecord(config, featureFlags, messageBody) {
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
export async function handler(event) {
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
    if (!config.leadsTableName) {
        log.error('PLATFORM_LEADS_TABLE_NAME not configured', { errorCode: 'CONFIG_ERROR' });
        // Fail all records so they are retried after config fix
        return {
            batchItemFailures: event.Records.map((record) => ({
                itemIdentifier: record.messageId,
            })),
        };
    }
    // Process each record, collecting failures
    const batchItemFailures = [];
    for (const record of event.Records) {
        try {
            await processRecord(config, featureFlags, record.body);
        }
        catch (error) {
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
//# sourceMappingURL=notification-worker.js.map