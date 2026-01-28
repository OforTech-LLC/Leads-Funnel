/**
 * Assignment Worker - SQS Lambda Handler
 *
 * Processes lead.created events from the assignment-queue (SQS).
 * Matches leads to assignment rules using ZIP longest-prefix algorithm,
 * checks daily/monthly caps, and assigns leads to organizations/users.
 *
 * Event Flow:
 *   lead.created (EventBridge) -> SQS assignment-queue -> this handler
 *
 * Outputs:
 *   - lead.assigned event (lead matched to an org)
 *   - lead.unassigned event (no matching rule found)
 *
 * Idempotency:
 *   Uses conditional DynamoDB update with attribute_not_exists(assignedOrgId)
 *   to prevent duplicate assignments on message replay.
 *
 * Partial Failure:
 *   Returns batchItemFailures for SQS partial batch failure handling,
 *   so only failed messages are retried (not the entire batch).
 */

import type { SQSEvent, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';
import { GetCommand, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { GetParameterCommand } from '@aws-sdk/client-ssm';
import type {
  AssignmentWorkerConfig,
  FeatureFlags,
  AssignmentRule,
  LeadRecord,
  LeadCreatedEventDetail,
  LeadAssignedEventDetail,
  UnassignedLeadRecord,
} from './types.js';
import { getDocClient, getSsmClient } from '../lib/clients.js';
import { createLogger } from '../lib/logging.js';
import { matchLeadToRule } from '../lib/assignment/matcher.js';
import { checkAndIncrementCap } from '../lib/assignment/caps.js';
import { emitLeadAssigned, emitLeadUnassigned } from '../lib/events.js';
import { DB_PREFIXES, DB_SORT_KEYS, GSI_KEYS } from '../lib/constants.js';

const log = createLogger('assignment-worker');

// =============================================================================
// Configuration
// =============================================================================

function loadConfig(): AssignmentWorkerConfig {
  return {
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    env: (process.env.ENV as 'dev' | 'prod') || 'dev',
    ddbTableName: process.env.DDB_TABLE_NAME || '',
    eventBusName: process.env.EVENT_BUS_NAME || 'default',
    featureFlagSsmPath: process.env.FEATURE_FLAG_SSM_PATH || '',
    assignmentRulesSsmPath: process.env.ASSIGNMENT_RULES_SSM_PATH || '',
  };
}

// =============================================================================
// Feature Flag & Rules Caching
// =============================================================================

let cachedFeatureFlags: FeatureFlags | null = null;
let featureFlagsCacheExpiry = 0;

let cachedAssignmentRules: AssignmentRule[] | null = null;
let rulesCacheExpiry = 0;

const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Load feature flags from SSM Parameter Store with 60s in-memory cache.
 *
 * Expected SSM parameter value format (JSON):
 * {
 *   "enable_assignment_service": true,
 *   "enable_notification_service": true,
 *   ...
 * }
 */
async function loadFeatureFlags(config: AssignmentWorkerConfig): Promise<FeatureFlags> {
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

    // Return cached value if available, otherwise safe defaults
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

/**
 * Load assignment rules from SSM Parameter Store with 60s in-memory cache.
 *
 * Expected SSM parameter value format (JSON array of AssignmentRule):
 * [
 *   {
 *     "ruleId": "rule-001",
 *     "funnelId": "roofing",
 *     "targetType": "ORG",
 *     "targetId": "org-123",
 *     "orgId": "org-123",
 *     "zipPatterns": ["33101", "331"],
 *     "priority": 10,
 *     "dailyCap": 50,
 *     "monthlyCap": 500,
 *     "active": true,
 *     ...
 *   }
 * ]
 */
async function loadAssignmentRules(config: AssignmentWorkerConfig): Promise<AssignmentRule[]> {
  const now = Date.now();

  if (cachedAssignmentRules && now < rulesCacheExpiry) {
    return cachedAssignmentRules;
  }

  if (!config.assignmentRulesSsmPath) {
    log.warn('Assignment rules SSM path not configured');
    return [];
  }

  try {
    const client = getSsmClient(config.awsRegion);
    const result = await client.send(
      new GetParameterCommand({
        Name: config.assignmentRulesSsmPath,
        WithDecryption: true,
      })
    );

    if (!result.Parameter?.Value) {
      return [];
    }

    const rules = JSON.parse(result.Parameter.Value) as AssignmentRule[];
    cachedAssignmentRules = rules;
    rulesCacheExpiry = now + CACHE_TTL_MS;

    log.info('Assignment rules loaded', { ruleCount: rules.length });

    return rules;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to load assignment rules', {
      errorCode: 'SSM_LOAD_ERROR',
      error: errorMessage,
    });

    // Return cached value if available
    if (cachedAssignmentRules) {
      return cachedAssignmentRules;
    }

    return [];
  }
}

// =============================================================================
// DynamoDB Operations
// =============================================================================

/**
 * Load a lead record from DynamoDB.
 */
async function getLead(
  config: AssignmentWorkerConfig,
  leadId: string,
  funnelId: string
): Promise<LeadRecord | null> {
  const client = getDocClient(config.awsRegion);

  try {
    const result = await client.send(
      new GetCommand({
        TableName: config.ddbTableName,
        Key: {
          pk: `${DB_PREFIXES.LEAD}${leadId}`,
          sk: `${GSI_KEYS.FUNNEL}${funnelId}`,
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
 * Conditionally assign a lead to an org/user.
 *
 * Uses attribute_not_exists(assignedOrgId) for idempotency - if the lead
 * was already assigned (e.g., on message replay), the update is skipped.
 *
 * @returns true if assignment succeeded, false if already assigned
 */
async function assignLead(
  config: AssignmentWorkerConfig,
  leadId: string,
  funnelId: string,
  rule: AssignmentRule
): Promise<boolean> {
  const client = getDocClient(config.awsRegion);
  const now = new Date().toISOString();

  const assignedOrgId = rule.orgId;
  const assignedUserId = rule.targetType === 'USER' ? rule.targetId : undefined;

  try {
    await client.send(
      new UpdateCommand({
        TableName: config.ddbTableName,
        Key: {
          pk: `${DB_PREFIXES.LEAD}${leadId}`,
          sk: `${GSI_KEYS.FUNNEL}${funnelId}`,
        },
        UpdateExpression: [
          'SET assignedOrgId = :orgId',
          'assignmentRuleId = :ruleId',
          'assignedAt = :assignedAt',
          'updatedAt = :updatedAt',
          assignedUserId ? 'assignedUserId = :userId' : undefined,
          // Update GSI sort keys for org-based queries
          'gsi2pk = :gsi2pk',
          'gsi2sk = :gsi2sk',
          assignedUserId ? 'gsi3pk = :gsi3pk' : undefined,
          assignedUserId ? 'gsi3sk = :gsi3sk' : undefined,
        ]
          .filter(Boolean)
          .join(', '),
        // Idempotency guard: only assign if not already assigned
        ConditionExpression: 'attribute_not_exists(assignedOrgId)',
        ExpressionAttributeValues: {
          ':orgId': assignedOrgId,
          ':ruleId': rule.ruleId,
          ':assignedAt': now,
          ':updatedAt': now,
          ...(assignedUserId ? { ':userId': assignedUserId } : {}),
          ':gsi2pk': `${GSI_KEYS.ORG}${assignedOrgId}${GSI_KEYS.ORG_LEADS_SUFFIX}`,
          ':gsi2sk': `${GSI_KEYS.ASSIGNED}${now}`,
          ...(assignedUserId
            ? {
                ':gsi3pk': `${DB_PREFIXES.USER}${assignedUserId}${GSI_KEYS.USER_LEADS_SUFFIX}`,
                ':gsi3sk': `${GSI_KEYS.ASSIGNED}${now}`,
              }
            : {}),
        },
      })
    );

    return true;
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'ConditionalCheckFailedException'
    ) {
      // Lead was already assigned - idempotent success
      log.info('Lead already assigned (idempotent)', { leadId, funnelId });
      return false;
    }
    throw error;
  }
}

/**
 * Check if the target org/user is active.
 */
async function isTargetActive(
  config: AssignmentWorkerConfig,
  rule: AssignmentRule
): Promise<boolean> {
  const client = getDocClient(config.awsRegion);

  try {
    // Check org status
    const orgResult = await client.send(
      new GetCommand({
        TableName: config.ddbTableName,
        Key: {
          pk: `${DB_PREFIXES.ORG}${rule.orgId}`,
          sk: DB_SORT_KEYS.META,
        },
        ProjectionExpression: '#status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
      })
    );

    if (!orgResult.Item || orgResult.Item.status !== 'active') {
      return false;
    }

    // If target is a USER, also check user status
    if (rule.targetType === 'USER') {
      const userResult = await client.send(
        new GetCommand({
          TableName: config.ddbTableName,
          Key: {
            pk: `${DB_PREFIXES.USER}${rule.targetId}`,
            sk: DB_SORT_KEYS.META,
          },
          ProjectionExpression: '#status',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
        })
      );

      if (!userResult.Item || userResult.Item.status !== 'active') {
        return false;
      }
    }

    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to check target status', {
      ruleId: rule.ruleId,
      orgId: rule.orgId,
      errorCode: 'DDB_GET_ERROR',
      error: errorMessage,
    });
    // Fail-safe: treat as inactive if we cannot verify
    return false;
  }
}

/**
 * Write an unassigned lead record with the reason.
 */
async function writeUnassignedRecord(
  config: AssignmentWorkerConfig,
  leadId: string,
  funnelId: string,
  zipCode: string | undefined,
  reason: string
): Promise<void> {
  const client = getDocClient(config.awsRegion);
  const now = new Date().toISOString();

  // TTL: 90 days
  const ttl = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;

  const record: UnassignedLeadRecord = {
    pk: `${DB_PREFIXES.UNASSIGNED}${leadId}`,
    sk: `${GSI_KEYS.FUNNEL}${funnelId}`,
    leadId,
    funnelId,
    zipCode,
    reason,
    evaluatedAt: now,
    ttl,
  };

  try {
    await client.send(
      new PutCommand({
        TableName: config.ddbTableName,
        Item: record,
      })
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to write unassigned record', {
      leadId,
      funnelId,
      errorCode: 'DDB_PUT_ERROR',
      error: errorMessage,
    });
    // Non-critical - log but continue
  }
}

// =============================================================================
// Single Record Processing
// =============================================================================

/**
 * Process a single lead.created event from the SQS queue.
 *
 * Full assignment flow:
 * 1. Parse the event detail
 * 2. Load the lead from DynamoDB
 * 3. Match against assignment rules (ZIP prefix matching)
 * 4. For each matching rule (in order), check caps and target status
 * 5. Assign the lead or write to unassigned table
 * 6. Emit the appropriate EventBridge event
 */
async function processRecord(config: AssignmentWorkerConfig, messageBody: string): Promise<void> {
  // Parse the EventBridge event detail from the SQS message body
  // SQS receives the full EventBridge event envelope
  let eventDetail: LeadCreatedEventDetail;

  try {
    const envelope = JSON.parse(messageBody);
    // EventBridge wraps the detail in a "detail" field
    eventDetail = (envelope.detail || envelope) as LeadCreatedEventDetail;
  } catch {
    log.error('Failed to parse SQS message body', { errorCode: 'PARSE_ERROR' });
    // Do not retry malformed messages
    return;
  }

  const { leadId, funnelId } = eventDetail;

  if (!leadId || !funnelId) {
    log.error('Missing leadId or funnelId in event', { errorCode: 'INVALID_EVENT' });
    return;
  }

  log.info('Processing lead for assignment', { leadId, funnelId });

  // Load the lead from DynamoDB
  const lead = await getLead(config, leadId, funnelId);

  if (!lead) {
    log.warn('Lead not found in DynamoDB', { leadId, funnelId });
    return;
  }

  // Skip already assigned leads (idempotency)
  if (lead.assignedOrgId) {
    log.info('Lead already assigned, skipping', {
      leadId,
      funnelId,
      orgId: lead.assignedOrgId,
    });
    return;
  }

  // Load assignment rules
  const rules = await loadAssignmentRules(config);

  if (rules.length === 0) {
    log.warn('No assignment rules configured', { leadId, funnelId });

    await writeUnassignedRecord(config, leadId, funnelId, lead.zipCode, 'no_rules_configured');
    await emitLeadUnassigned(
      config.awsRegion,
      config.eventBusName,
      leadId,
      funnelId,
      lead.zipCode,
      'no_rules_configured'
    );
    return;
  }

  // Find the best matching rule
  const matchedRule = matchLeadToRule(funnelId, lead.zipCode || '', rules);

  if (!matchedRule) {
    log.info('No matching rule found for lead', {
      leadId,
      funnelId,
      zipCode: lead.zipCode ? `${lead.zipCode.slice(0, 3)}***` : 'none',
    });

    await writeUnassignedRecord(config, leadId, funnelId, lead.zipCode, 'no_matching_rule');
    await emitLeadUnassigned(
      config.awsRegion,
      config.eventBusName,
      leadId,
      funnelId,
      lead.zipCode,
      'no_matching_rule'
    );
    return;
  }

  // Try the matched rule and fall back through remaining rules if needed
  const allRules = rules
    .filter((r) => r.active && (r.funnelId === funnelId || r.funnelId === '*'))
    .sort((a, b) => a.priority - b.priority);

  // Put the matched rule first, then others as fallback
  const orderedRules = [matchedRule, ...allRules.filter((r) => r.ruleId !== matchedRule.ruleId)];

  let assigned = false;

  for (const rule of orderedRules) {
    // Check if target is active
    const targetActive = await isTargetActive(config, rule);

    if (!targetActive) {
      log.info('Target inactive, trying next rule', {
        leadId,
        ruleId: rule.ruleId,
        orgId: rule.orgId,
      });
      continue;
    }

    // Check daily/monthly caps
    const capResult = await checkAndIncrementCap(
      config.ddbTableName,
      config.awsRegion,
      rule.ruleId,
      rule.dailyCap,
      rule.monthlyCap
    );

    if (!capResult.allowed) {
      log.info('Cap exceeded, trying next rule', {
        leadId,
        ruleId: rule.ruleId,
        reason: capResult.reason,
      });
      continue;
    }

    // Attempt assignment with idempotency guard
    const wasAssigned = await assignLead(config, leadId, funnelId, rule);

    if (wasAssigned) {
      log.info('Lead assigned successfully', {
        leadId,
        funnelId,
        ruleId: rule.ruleId,
        orgId: rule.orgId,
      });

      // Emit lead.assigned event
      const assignedDetail: LeadAssignedEventDetail = {
        leadId,
        funnelId,
        assignedOrgId: rule.orgId,
        assignedUserId: rule.targetType === 'USER' ? rule.targetId : undefined,
        assignmentRuleId: rule.ruleId,
        assignedAt: new Date().toISOString(),
        zipCode: lead.zipCode,
      };

      try {
        await emitLeadAssigned(config.awsRegion, config.eventBusName, assignedDetail);
      } catch (eventError: unknown) {
        const errorMessage = eventError instanceof Error ? eventError.message : 'Unknown error';
        log.error('Failed to emit lead.assigned event', {
          leadId,
          errorCode: 'EVENT_EMIT_ERROR',
          error: errorMessage,
        });
        // Non-critical - the assignment was already persisted
      }

      assigned = true;
      break;
    } else {
      // Already assigned by another invocation - idempotent success
      assigned = true;
      break;
    }
  }

  if (!assigned) {
    log.info('All rules exhausted, lead unassigned', { leadId, funnelId });

    await writeUnassignedRecord(config, leadId, funnelId, lead.zipCode, 'all_rules_exhausted');
    await emitLeadUnassigned(
      config.awsRegion,
      config.eventBusName,
      leadId,
      funnelId,
      lead.zipCode,
      'all_rules_exhausted'
    );
  }
}

// =============================================================================
// Lambda Handler
// =============================================================================

/**
 * SQS Lambda handler for the assignment queue.
 *
 * Processes a batch of SQS messages containing lead.created events.
 * Uses partial batch failure reporting so only failed messages are
 * retried by SQS, not the entire batch.
 *
 * @param event - SQS event containing one or more messages
 * @returns SQSBatchResponse with list of failed message IDs
 */
export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const config = loadConfig();

  log.info('Assignment worker invoked', { recordCount: event.Records.length });

  // Check feature flag
  const featureFlags = await loadFeatureFlags(config);

  if (!featureFlags.enable_assignment_service) {
    log.info('Assignment service disabled via feature flag');

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
      await processRecord(config, record.body);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to process assignment record', {
        messageId: record.messageId,
        errorCode: 'PROCESSING_ERROR',
        error: errorMessage,
      });

      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  log.info('Assignment worker completed', {
    totalRecords: event.Records.length,
    failedRecords: batchItemFailures.length,
  });

  return { batchItemFailures };
}
