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
 *   Uses conditional DynamoDB update with status = "new"
 *   to prevent duplicate assignments on message replay.
 *
 * Partial Failure:
 *   Returns batchItemFailures for SQS partial batch failure handling,
 *   so only failed messages are retried (not the entire batch).
 */
import { GetParameterCommand } from '@aws-sdk/client-ssm';
import { getSsmClient } from '../lib/clients.js';
import { getAllFlags } from '../lib/feature-flags.js';
import { normalizeFeatureFlags } from '../lib/feature-flag-utils.js';
import { createLogger } from '../lib/logging.js';
import { matchLeadToRule } from '../lib/assignment/matcher.js';
import { checkAndIncrementCap } from '../lib/assignment/caps.js';
import { emitLeadAssigned, emitLeadUnassigned } from '../lib/events.js';
import * as leadsDb from '../lib/db/leads.js';
import * as rulesDb from '../lib/db/rules.js';
import * as orgsDb from '../lib/db/orgs.js';
import * as usersDb from '../lib/db/users.js';
import * as membershipsDb from '../lib/db/memberships.js';
import * as unassignedDb from '../lib/db/unassigned.js';
const log = createLogger('assignment-worker');
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
        assignmentRulesTableName: process.env.ASSIGNMENT_RULES_TABLE ||
            process.env.ASSIGNMENT_RULES_TABLE_NAME ||
            fallbackTable,
        unassignedTableName: process.env.UNASSIGNED_TABLE_NAME || fallbackTable,
        eventBusName: process.env.EVENT_BUS_NAME || 'default',
        featureFlagSsmPath: process.env.FEATURE_FLAG_SSM_PATH || '',
        assignmentRulesSsmPath: process.env.ASSIGNMENT_RULES_SSM_PATH || '',
    };
}
// =============================================================================
// Feature Flag & Rules Caching
// =============================================================================
let cachedFeatureFlags = null;
let featureFlagsCacheExpiry = 0;
const cachedAssignmentRules = new Map();
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
 *
 * Expected SSM parameter value format (JSON):
 * {
 *   "enable_assignment_service": true,
 *   "enable_notification_service": true,
 *   ...
 * }
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
        // Return cached value if available, otherwise safe defaults
        if (cachedFeatureFlags) {
            return cachedFeatureFlags;
        }
        return DEFAULT_WORKER_FLAGS;
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
async function loadAssignmentRulesFromSsm(config) {
    if (!config.assignmentRulesSsmPath) {
        log.warn('Assignment rules SSM path not configured');
        return [];
    }
    try {
        const client = getSsmClient(config.awsRegion);
        const result = await client.send(new GetParameterCommand({
            Name: config.assignmentRulesSsmPath,
            WithDecryption: true,
        }));
        if (!result.Parameter?.Value) {
            return [];
        }
        const rules = JSON.parse(result.Parameter.Value);
        log.info('Assignment rules loaded (SSM)', { ruleCount: rules.length });
        return rules;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log.error('Failed to load assignment rules from SSM', {
            errorCode: 'SSM_LOAD_ERROR',
            error: errorMessage,
        });
        return [];
    }
}
async function loadAssignmentRules(config, funnelId) {
    const now = Date.now();
    const cacheKey = `funnel:${funnelId}`;
    const cached = cachedAssignmentRules.get(cacheKey);
    if (cached && now < cached.expiresAt) {
        return cached.rules;
    }
    let rules = [];
    if (config.assignmentRulesTableName) {
        const dbRules = await rulesDb.getRulesByFunnel(funnelId);
        rules = dbRules.map((rule) => ({
            ruleId: rule.ruleId,
            funnelId: rule.funnelId,
            targetType: rule.targetUserId ? 'USER' : 'ORG',
            targetId: rule.targetUserId || rule.orgId,
            orgId: rule.orgId,
            zipPatterns: rule.zipPatterns || [],
            priority: rule.priority,
            dailyCap: rule.dailyCap,
            monthlyCap: rule.monthlyCap,
            active: rule.isActive,
            createdAt: rule.createdAt,
            updatedAt: rule.updatedAt,
        }));
    }
    else {
        rules = await loadAssignmentRulesFromSsm(config);
    }
    const filtered = rules.filter((rule) => rule.active && (rule.funnelId === funnelId || rule.funnelId === '*'));
    cachedAssignmentRules.set(cacheKey, { rules: filtered, expiresAt: now + CACHE_TTL_MS });
    return filtered;
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
 * Conditionally assign a lead to an org/user.
 *
 * Uses status = "new" for idempotency - if the lead was already assigned
 * (e.g., on message replay), the update is skipped.
 *
 * @returns true if assignment succeeded, false if already assigned
 */
async function assignLead(config, leadId, funnelId, rule) {
    const assignedUserId = rule.targetType === 'USER' ? rule.targetId : undefined;
    try {
        const updated = await leadsDb.assignLead(funnelId, leadId, rule.orgId, rule.ruleId, {
            assignedUserId,
        });
        return Boolean(updated);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log.error('Failed to assign lead', {
            leadId,
            funnelId,
            errorCode: 'DDB_UPDATE_ERROR',
            error: errorMessage,
        });
        throw error;
    }
}
/**
 * Check if the target org/user is active.
 */
async function isTargetActive(_config, rule) {
    try {
        const org = await orgsDb.getOrg(rule.orgId);
        if (!org) {
            return false;
        }
        if (rule.targetType === 'USER') {
            const user = await usersDb.getUser(rule.targetId);
            if (!user || user.status !== 'active') {
                return false;
            }
            const membership = await membershipsDb.getMember(rule.orgId, rule.targetId);
            if (!membership) {
                return false;
            }
        }
        return true;
    }
    catch (error) {
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
async function writeUnassignedRecord(_config, leadId, funnelId, zipCode, reason) {
    try {
        await unassignedDb.addUnassigned(funnelId, leadId, reason, zipCode);
    }
    catch (error) {
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
async function processRecord(config, messageBody) {
    // Parse the EventBridge event detail from the SQS message body
    // SQS receives the full EventBridge event envelope
    let eventDetail;
    try {
        const envelope = JSON.parse(messageBody);
        // EventBridge wraps the detail in a "detail" field
        eventDetail = (envelope.detail || envelope);
    }
    catch {
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
    // Skip leads that are no longer in a "new" state
    if (lead.status && lead.status !== 'new') {
        log.info('Lead not eligible for assignment, skipping', {
            leadId,
            funnelId,
            status: lead.status,
            orgId: lead.orgId,
        });
        return;
    }
    // Load assignment rules
    const rules = await loadAssignmentRules(config, funnelId);
    if (rules.length === 0) {
        log.warn('No assignment rules configured', { leadId, funnelId });
        await leadsDb.markUnassigned(funnelId, leadId).catch(() => null);
        await writeUnassignedRecord(config, leadId, funnelId, lead.zipCode, 'no_rules_configured');
        await emitLeadUnassigned(config.awsRegion, config.eventBusName, leadId, funnelId, lead.zipCode, 'no_rules_configured');
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
        await leadsDb.markUnassigned(funnelId, leadId).catch(() => null);
        await writeUnassignedRecord(config, leadId, funnelId, lead.zipCode, 'no_matching_rule');
        await emitLeadUnassigned(config.awsRegion, config.eventBusName, leadId, funnelId, lead.zipCode, 'no_matching_rule');
        return;
    }
    // Try the matched rule and fall back through remaining rules if needed
    const allRules = rules
        .filter((r) => r.funnelId === funnelId || r.funnelId === '*')
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
        const capResult = await checkAndIncrementCap(config.assignmentRulesTableName, config.awsRegion, rule.ruleId, rule.dailyCap, rule.monthlyCap);
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
            const assignedDetail = {
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
            }
            catch (eventError) {
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
        }
        else {
            // Already assigned by another invocation - idempotent success
            log.info('Lead already assigned (idempotent)', { leadId, funnelId });
            assigned = true;
            break;
        }
    }
    if (!assigned) {
        log.info('All rules exhausted, lead unassigned', { leadId, funnelId });
        await leadsDb.markUnassigned(funnelId, leadId).catch(() => null);
        await writeUnassignedRecord(config, leadId, funnelId, lead.zipCode, 'all_rules_exhausted');
        await emitLeadUnassigned(config.awsRegion, config.eventBusName, leadId, funnelId, lead.zipCode, 'all_rules_exhausted');
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
export async function handler(event) {
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
            await processRecord(config, record.body);
        }
        catch (error) {
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
//# sourceMappingURL=assignment-worker.js.map