/**
 * DynamoDB operations for Leads (platform-wide)
 *
 * Single-table access patterns:
 *   PK = LEAD#<funnelId>#<leadId>   SK = META
 *   GSI1PK = FUNNEL#<funnelId>      GSI1SK = CREATED#<iso>  (leads by funnel)
 *   GSI2PK = ORG#<orgId>            GSI2SK = CREATED#<iso>  (leads by org)
 *   GSI3PK = STATUS#<funnelId>#<s>  GSI3SK = CREATED#<iso>  (leads by status)
 */
import { GetCommand, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient } from './client.js';
import { getPlatformLeadsTableName } from './table-names.js';
import { signCursor, verifyCursor } from '../cursor.js';
import { ValidationError } from '../errors.js';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'node:crypto';
import { DB_PREFIXES, DB_SORT_KEYS, GSI_KEYS, GSI_INDEX_NAMES } from '../constants.js';
// ---------------------------------------------------------------------------
// Lead Status State Machine
// ---------------------------------------------------------------------------
/**
 * Valid status transitions for leads.
 *
 * Each key is the current status; its value is the list of statuses it
 * can transition to.  Any transition not listed here is rejected (unless
 * the caller passes `force: true` for admin overrides).
 *
 * Terminal states:
 *   - `dnc` (Do Not Contact) -- no outgoing transitions
 *
 * Reversible states:
 *   - `converted` -> `lost` (mistake correction)
 *   - `lost` -> `contacted`, `qualified` (re-open)
 *   - `quarantined` -> `new` (admin unquarantine)
 */
const VALID_TRANSITIONS = {
    new: ['assigned', 'quarantined', 'unassigned'],
    unassigned: ['assigned', 'quarantined'],
    assigned: ['contacted', 'qualified', 'converted', 'lost', 'dnc', 'quarantined', 'booked'],
    contacted: ['qualified', 'converted', 'lost', 'dnc', 'booked'],
    qualified: ['converted', 'lost', 'dnc', 'booked'],
    booked: ['converted', 'won', 'lost', 'dnc'],
    converted: ['won', 'lost'], // can reverse if mistake
    won: [], // terminal - deal closed successfully
    lost: ['contacted', 'qualified'], // can reopen
    dnc: [], // terminal
    quarantined: ['new'], // admin can unquarantine
};
/**
 * Validate that a status transition is allowed by the state machine.
 *
 * @param from - Current lead status
 * @param to   - Desired new status
 * @returns true if the transition is valid
 */
export function validateStatusTransition(from, to) {
    if (from === to) {
        // No-op transition is always valid (idempotent)
        return true;
    }
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed) {
        return false;
    }
    return allowed.includes(to);
}
/**
 * Return a human-readable description of allowed transitions.
 * Used in error messages.
 */
function describeAllowed(from) {
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed || allowed.length === 0) {
        return `"${from}" is a terminal status with no allowed transitions`;
    }
    return `Allowed transitions from "${from}": ${allowed.join(', ')}`;
}
// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------
/**
 * Create a new lead record in DynamoDB.
 *
 * Used by the admin bulk-import feature. Generates a UUID for the leadId,
 * hashes the email for the ipHash field, and sets up all GSI projections.
 *
 * @param input - Lead creation input
 * @returns The created PlatformLead record
 */
export async function createLead(input) {
    const doc = getDocClient();
    const leadId = uuidv4();
    const now = new Date().toISOString();
    const status = input.status || 'new';
    // Hash email for privacy (ipHash field doubles as identifier hash)
    const emailHash = createHash('sha256').update(input.email.toLowerCase().trim()).digest('hex');
    const lead = {
        pk: `${DB_PREFIXES.LEAD}${input.funnelId}#${leadId}`,
        sk: DB_SORT_KEYS.META,
        leadId,
        funnelId: input.funnelId,
        name: input.name || '',
        email: input.email,
        phone: input.phone,
        zipCode: input.zipCode,
        message: input.message,
        status,
        notes: [],
        tags: input.source ? [`source:${input.source}`] : [],
        pageUrl: input.pageUrl,
        referrer: input.referrer,
        utm: input.utm,
        ipHash: emailHash,
        createdAt: now,
        updatedAt: now,
        // GSI projections
        gsi1pk: `${GSI_KEYS.FUNNEL}${input.funnelId}`,
        gsi1sk: `${GSI_KEYS.CREATED}${now}`,
        gsi3pk: `${GSI_KEYS.STATUS}${input.funnelId}#${status}`,
        gsi3sk: `${GSI_KEYS.CREATED}${now}`,
    };
    await doc.send(new PutCommand({
        TableName: getPlatformLeadsTableName(),
        Item: lead,
    }));
    return lead;
}
/**
 * Ingest a lead from the public capture pipeline into the platform table.
 *
 * Uses the provided leadId so downstream systems can correlate the record
 * with capture-time logs and idempotency keys.
 */
export async function ingestLead(input, tableOverride) {
    const doc = getDocClient();
    const now = input.createdAt || new Date().toISOString();
    const status = input.status || 'new';
    const lead = {
        pk: `${DB_PREFIXES.LEAD}${input.funnelId}#${input.leadId}`,
        sk: DB_SORT_KEYS.META,
        leadId: input.leadId,
        funnelId: input.funnelId,
        name: input.name || '',
        email: input.email,
        phone: input.phone,
        zipCode: input.zipCode,
        message: input.message,
        status,
        notes: [],
        tags: [],
        pageUrl: input.pageUrl,
        referrer: input.referrer,
        utm: input.utm,
        ipHash: input.ipHash,
        userAgent: input.userAgent,
        createdAt: now,
        updatedAt: now,
        score: input.score,
        evidencePack: input.evidencePack,
        gsi1pk: `${GSI_KEYS.FUNNEL}${input.funnelId}`,
        gsi1sk: `${GSI_KEYS.CREATED}${now}`,
        gsi3pk: `${GSI_KEYS.STATUS}${input.funnelId}#${status}`,
        gsi3sk: `${GSI_KEYS.CREATED}${now}`,
    };
    await doc.send(new PutCommand({
        TableName: tableOverride || getPlatformLeadsTableName(),
        Item: lead,
        ConditionExpression: 'attribute_not_exists(pk)',
    }));
    return lead;
}
export async function getLead(funnelId, leadId) {
    const doc = getDocClient();
    const result = await doc.send(new GetCommand({
        TableName: getPlatformLeadsTableName(),
        Key: { pk: `${DB_PREFIXES.LEAD}${funnelId}#${leadId}`, sk: DB_SORT_KEYS.META },
    }));
    return result.Item || null;
}
export async function updateLead(input) {
    const doc = getDocClient();
    const now = new Date().toISOString();
    // --- Status transition validation ---
    if (input.status !== undefined && !input.force) {
        // Fetch the current lead to know the current status
        const current = await getLead(input.funnelId, input.leadId);
        if (!current) {
            throw new ValidationError('Lead not found', {
                funnelId: input.funnelId,
                leadId: input.leadId,
            });
        }
        if (!validateStatusTransition(current.status, input.status)) {
            throw new ValidationError(`Invalid status transition from "${current.status}" to "${input.status}". ${describeAllowed(current.status)}`, {
                currentStatus: current.status,
                requestedStatus: input.status,
                allowedTransitions: [...(VALID_TRANSITIONS[current.status] ?? [])],
            });
        }
    }
    const parts = ['#updatedAt = :updatedAt'];
    const names = { '#updatedAt': 'updatedAt' };
    const values = { ':updatedAt': now };
    if (input.status !== undefined) {
        parts.push('#status = :status');
        names['#status'] = 'status';
        values[':status'] = input.status;
        // Update status GSI
        parts.push('gsi3pk = :gsi3pk');
        values[':gsi3pk'] = `${GSI_KEYS.STATUS}${input.funnelId}#${input.status}`;
    }
    if (input.orgId !== undefined) {
        parts.push('orgId = :orgId');
        values[':orgId'] = input.orgId;
        // Update org GSI
        parts.push('gsi2pk = :gsi2pk, gsi2sk = :gsi2sk');
        values[':gsi2pk'] = `${GSI_KEYS.ORG}${input.orgId}`;
        values[':gsi2sk'] = `${GSI_KEYS.CREATED}${now}`;
    }
    if (input.assignedUserId !== undefined) {
        parts.push('assignedUserId = :assignedUserId');
        values[':assignedUserId'] = input.assignedUserId;
    }
    if (input.ruleId !== undefined) {
        parts.push('ruleId = :ruleId');
        values[':ruleId'] = input.ruleId;
    }
    if (input.notes !== undefined) {
        parts.push('notes = :notes');
        values[':notes'] = input.notes;
    }
    if (input.tags !== undefined) {
        parts.push('tags = :tags');
        values[':tags'] = input.tags;
    }
    if (input.assignedAt !== undefined) {
        parts.push('assignedAt = :assignedAt');
        values[':assignedAt'] = input.assignedAt;
    }
    if (input.notifiedAt !== undefined) {
        parts.push('notifiedAt = :notifiedAt');
        values[':notifiedAt'] = input.notifiedAt;
    }
    const result = await doc.send(new UpdateCommand({
        TableName: getPlatformLeadsTableName(),
        Key: { pk: `${DB_PREFIXES.LEAD}${input.funnelId}#${input.leadId}`, sk: DB_SORT_KEYS.META },
        UpdateExpression: `SET ${parts.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: 'attribute_exists(pk)',
        ReturnValues: 'ALL_NEW',
    }));
    return result.Attributes;
}
/**
 * Conditionally assign a lead (idempotent).
 * Only succeeds if lead status is still 'new'.
 */
export async function assignLead(funnelId, leadId, orgId, ruleId, options) {
    const doc = getDocClient();
    const now = new Date().toISOString();
    const assignedUserId = options?.assignedUserId;
    try {
        const result = await doc.send(new UpdateCommand({
            TableName: getPlatformLeadsTableName(),
            Key: { pk: `${DB_PREFIXES.LEAD}${funnelId}#${leadId}`, sk: DB_SORT_KEYS.META },
            UpdateExpression: [
                'SET #status = :assigned',
                'orgId = :orgId',
                'ruleId = :ruleId',
                'assignedAt = :now',
                '#updatedAt = :now',
                'gsi2pk = :gsi2pk',
                'gsi2sk = :gsi2sk',
                'gsi3pk = :gsi3pk',
                assignedUserId ? 'assignedUserId = :assignedUserId' : undefined,
                '#evidencePack = if_not_exists(#evidencePack, :emptyEvidence)',
                '#evidencePack.#assignment = :assignment',
            ]
                .filter(Boolean)
                .join(', '),
            ExpressionAttributeNames: {
                '#status': 'status',
                '#updatedAt': 'updatedAt',
                '#evidencePack': 'evidencePack',
                '#assignment': 'assignment',
            },
            ExpressionAttributeValues: {
                ':assigned': 'assigned',
                ':orgId': orgId,
                ':ruleId': ruleId,
                ':now': now,
                ':gsi2pk': `${GSI_KEYS.ORG}${orgId}`,
                ':gsi2sk': `${GSI_KEYS.CREATED}${now}`,
                ':gsi3pk': `${GSI_KEYS.STATUS}${funnelId}#assigned`,
                ':new': 'new',
                ...(assignedUserId ? { ':assignedUserId': assignedUserId } : {}),
                ':emptyEvidence': {},
                ':assignment': {
                    ruleId,
                    assignedOrgId: orgId,
                    assignedUserId,
                    assignedAt: now,
                },
            },
            ConditionExpression: 'attribute_exists(pk) AND #status = :new',
            ReturnValues: 'ALL_NEW',
        }));
        return result.Attributes;
    }
    catch (error) {
        if (error &&
            typeof error === 'object' &&
            'name' in error &&
            error.name === 'ConditionalCheckFailedException') {
            // Lead already assigned or does not exist -- idempotent
            return null;
        }
        throw error;
    }
}
/**
 * Mark a lead as unassigned (no matching rule).
 */
export async function markUnassigned(funnelId, leadId) {
    const doc = getDocClient();
    const now = new Date().toISOString();
    try {
        const result = await doc.send(new UpdateCommand({
            TableName: getPlatformLeadsTableName(),
            Key: { pk: `${DB_PREFIXES.LEAD}${funnelId}#${leadId}`, sk: DB_SORT_KEYS.META },
            UpdateExpression: `SET #status = :unassigned, #updatedAt = :now,
          gsi3pk = :gsi3pk`,
            ExpressionAttributeNames: {
                '#status': 'status',
                '#updatedAt': 'updatedAt',
            },
            ExpressionAttributeValues: {
                ':unassigned': 'unassigned',
                ':now': now,
                ':gsi3pk': `${GSI_KEYS.STATUS}${funnelId}#unassigned`,
                ':new': 'new',
            },
            ConditionExpression: 'attribute_exists(pk) AND #status = :new',
            ReturnValues: 'ALL_NEW',
        }));
        return result.Attributes;
    }
    catch (error) {
        if (error &&
            typeof error === 'object' &&
            'name' in error &&
            error.name === 'ConditionalCheckFailedException') {
            return null;
        }
        throw error;
    }
}
/**
 * Reassign a lead to a different org.
 */
export async function reassignLead(funnelId, leadId, newOrgId, newRuleId) {
    const doc = getDocClient();
    const now = new Date().toISOString();
    const result = await doc.send(new UpdateCommand({
        TableName: getPlatformLeadsTableName(),
        Key: { pk: `${DB_PREFIXES.LEAD}${funnelId}#${leadId}`, sk: DB_SORT_KEYS.META },
        UpdateExpression: `SET orgId = :orgId, ruleId = :ruleId, assignedAt = :now,
        #status = :assigned, #updatedAt = :now,
        gsi2pk = :gsi2pk, gsi2sk = :gsi2sk,
        gsi3pk = :gsi3pk`,
        ExpressionAttributeNames: {
            '#status': 'status',
            '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
            ':orgId': newOrgId,
            ':ruleId': newRuleId || null,
            ':assigned': 'assigned',
            ':now': now,
            ':gsi2pk': `${GSI_KEYS.ORG}${newOrgId}`,
            ':gsi2sk': `${GSI_KEYS.CREATED}${now}`,
            ':gsi3pk': `${GSI_KEYS.STATUS}${funnelId}#assigned`,
        },
        ConditionExpression: 'attribute_exists(pk)',
        ReturnValues: 'ALL_NEW',
    }));
    return result.Attributes;
}
/**
 * Query leads across funnels / orgs with cursor pagination.
 */
export async function queryLeads(input) {
    const doc = getDocClient();
    const limit = Math.min(input.limit || 25, 100);
    let exclusiveStartKey;
    if (input.cursor) {
        const verified = verifyCursor(input.cursor);
        if (!verified) {
            // Invalid or tampered cursor - return empty result
            return { items: [] };
        }
        exclusiveStartKey = verified;
    }
    // Build optional FilterExpression for assignedUserId
    let filterExpression;
    let filterExprNames;
    let filterExprValues;
    if (input.assignedUserId) {
        filterExpression = '#assignedUserId = :assignedUserId';
        filterExprNames = { '#assignedUserId': 'assignedUserId' };
        filterExprValues = { ':assignedUserId': input.assignedUserId };
    }
    // Choose the best access pattern
    if (input.orgId) {
        // Query by org
        let keyCondition = 'gsi2pk = :pk';
        const exprValues = { ':pk': `${GSI_KEYS.ORG}${input.orgId}` };
        if (input.startDate && input.endDate) {
            keyCondition += ' AND gsi2sk BETWEEN :start AND :end';
            exprValues[':start'] = `${GSI_KEYS.CREATED}${input.startDate}`;
            exprValues[':end'] = `${GSI_KEYS.CREATED}${input.endDate}`;
        }
        if (filterExprValues) {
            Object.assign(exprValues, filterExprValues);
        }
        const result = await doc.send(new QueryCommand({
            TableName: getPlatformLeadsTableName(),
            IndexName: GSI_INDEX_NAMES.GSI2,
            KeyConditionExpression: keyCondition,
            ExpressionAttributeValues: exprValues,
            ...(filterExpression ? { FilterExpression: filterExpression } : {}),
            ...(filterExprNames ? { ExpressionAttributeNames: filterExprNames } : {}),
            Limit: limit,
            ScanIndexForward: false,
            ExclusiveStartKey: exclusiveStartKey,
        }));
        return buildPaginatedResult(result);
    }
    if (input.funnelId && input.status) {
        // Query by funnel + status
        let keyCondition = 'gsi3pk = :pk';
        const exprValues = {
            ':pk': `${GSI_KEYS.STATUS}${input.funnelId}#${input.status}`,
        };
        if (input.startDate && input.endDate) {
            keyCondition += ' AND gsi3sk BETWEEN :start AND :end';
            exprValues[':start'] = `${GSI_KEYS.CREATED}${input.startDate}`;
            exprValues[':end'] = `${GSI_KEYS.CREATED}${input.endDate}`;
        }
        if (filterExprValues) {
            Object.assign(exprValues, filterExprValues);
        }
        const result = await doc.send(new QueryCommand({
            TableName: getPlatformLeadsTableName(),
            IndexName: GSI_INDEX_NAMES.GSI3,
            KeyConditionExpression: keyCondition,
            ExpressionAttributeValues: exprValues,
            ...(filterExpression ? { FilterExpression: filterExpression } : {}),
            ...(filterExprNames ? { ExpressionAttributeNames: filterExprNames } : {}),
            Limit: limit,
            ScanIndexForward: false,
            ExclusiveStartKey: exclusiveStartKey,
        }));
        return buildPaginatedResult(result);
    }
    if (input.funnelId) {
        // Query by funnel
        let keyCondition = 'gsi1pk = :pk';
        const exprValues = { ':pk': `${GSI_KEYS.FUNNEL}${input.funnelId}` };
        if (input.startDate && input.endDate) {
            keyCondition += ' AND gsi1sk BETWEEN :start AND :end';
            exprValues[':start'] = `${GSI_KEYS.CREATED}${input.startDate}`;
            exprValues[':end'] = `${GSI_KEYS.CREATED}${input.endDate}`;
        }
        if (filterExprValues) {
            Object.assign(exprValues, filterExprValues);
        }
        const result = await doc.send(new QueryCommand({
            TableName: getPlatformLeadsTableName(),
            IndexName: GSI_INDEX_NAMES.GSI1,
            KeyConditionExpression: keyCondition,
            ExpressionAttributeValues: exprValues,
            ...(filterExpression ? { FilterExpression: filterExpression } : {}),
            ...(filterExprNames ? { ExpressionAttributeNames: filterExprNames } : {}),
            Limit: limit,
            ScanIndexForward: false,
            ExclusiveStartKey: exclusiveStartKey,
        }));
        return buildPaginatedResult(result);
    }
    // No filter provided - reject unbounded scans
    throw new Error('At least one filter (funnelId, orgId, or status) is required for lead queries');
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildPaginatedResult(result) {
    const items = (result.Items || []);
    let nextCursor;
    if (result.LastEvaluatedKey) {
        nextCursor = signCursor(result.LastEvaluatedKey);
    }
    return { items, nextCursor };
}
//# sourceMappingURL=leads.js.map