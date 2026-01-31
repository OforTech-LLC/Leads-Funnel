/**
 * DynamoDB operations for Assignment Rules
 *
 * Single-table access patterns:
 *   PK = RULE#<ruleId>      SK = META
 *   GSI1PK = FUNNEL#<funnelId>  GSI1SK = PRIORITY#<nn>  (rules by funnel)
 *   GSI2PK = ORG#<orgId>       GSI2SK = RULE#<ruleId>   (rules by org)
 */
import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient } from './client.js';
import { getAssignmentRulesTableName } from './table-names.js';
import { ulid } from '../../lib/id.js';
import { signCursor, verifyCursor } from '../cursor.js';
import { DB_PREFIXES, DB_SORT_KEYS, GSI_KEYS, GSI_INDEX_NAMES } from '../constants.js';
// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------
export async function createRule(input) {
    const doc = getDocClient();
    const ruleId = ulid();
    const now = new Date().toISOString();
    const priorityPad = String(input.priority).padStart(4, '0');
    const rule = {
        pk: `${DB_PREFIXES.RULE}${ruleId}`,
        sk: DB_SORT_KEYS.META,
        ruleId,
        funnelId: input.funnelId,
        orgId: input.orgId,
        targetUserId: input.targetUserId,
        name: input.name,
        priority: input.priority,
        zipPatterns: input.zipPatterns,
        dailyCap: input.dailyCap,
        monthlyCap: input.monthlyCap,
        isActive: input.isActive ?? true,
        description: input.description,
        createdAt: now,
        updatedAt: now,
        gsi1pk: `${GSI_KEYS.FUNNEL}${input.funnelId}`,
        gsi1sk: `${GSI_KEYS.PRIORITY}${priorityPad}`,
        gsi2pk: `${GSI_KEYS.ORG}${input.orgId}`,
        gsi2sk: `${DB_PREFIXES.RULE}${ruleId}`,
    };
    await doc.send(new PutCommand({
        TableName: getAssignmentRulesTableName(),
        Item: rule,
        ConditionExpression: 'attribute_not_exists(pk)',
    }));
    console.log(JSON.stringify({ level: 'info', message: 'rule.created', ruleId, funnelId: input.funnelId }));
    return rule;
}
export async function getRule(ruleId) {
    const doc = getDocClient();
    const result = await doc.send(new GetCommand({
        TableName: getAssignmentRulesTableName(),
        Key: { pk: `${DB_PREFIXES.RULE}${ruleId}`, sk: DB_SORT_KEYS.META },
    }));
    const item = result.Item;
    if (!item || item.deletedAt)
        return null;
    return item;
}
export async function updateRule(input) {
    const doc = getDocClient();
    const now = new Date().toISOString();
    const parts = ['#updatedAt = :updatedAt'];
    const names = { '#updatedAt': 'updatedAt' };
    const values = { ':updatedAt': now };
    if (input.name !== undefined) {
        parts.push('#name = :name');
        names['#name'] = 'name';
        values[':name'] = input.name;
    }
    if (input.funnelId !== undefined) {
        parts.push('funnelId = :funnelId');
        values[':funnelId'] = input.funnelId;
        parts.push('gsi1pk = :gsi1pk');
        values[':gsi1pk'] = `${GSI_KEYS.FUNNEL}${input.funnelId}`;
    }
    if (input.orgId !== undefined) {
        parts.push('orgId = :orgId');
        values[':orgId'] = input.orgId;
        parts.push('gsi2pk = :gsi2pk');
        values[':gsi2pk'] = `${GSI_KEYS.ORG}${input.orgId}`;
    }
    if (input.priority !== undefined) {
        parts.push('priority = :priority');
        values[':priority'] = input.priority;
        const priorityPad = String(input.priority).padStart(4, '0');
        parts.push('gsi1sk = :gsi1sk');
        values[':gsi1sk'] = `${GSI_KEYS.PRIORITY}${priorityPad}`;
    }
    if (input.zipPatterns !== undefined) {
        parts.push('zipPatterns = :zp');
        values[':zp'] = input.zipPatterns;
    }
    if (input.dailyCap !== undefined) {
        parts.push('dailyCap = :dc');
        values[':dc'] = input.dailyCap;
    }
    if (input.monthlyCap !== undefined) {
        parts.push('monthlyCap = :mc');
        values[':mc'] = input.monthlyCap;
    }
    if (input.isActive !== undefined) {
        parts.push('isActive = :active');
        values[':active'] = input.isActive;
    }
    if (input.targetUserId !== undefined) {
        parts.push('targetUserId = :tu');
        values[':tu'] = input.targetUserId;
    }
    if (input.description !== undefined) {
        parts.push('description = :desc');
        values[':desc'] = input.description;
    }
    const result = await doc.send(new UpdateCommand({
        TableName: getAssignmentRulesTableName(),
        Key: { pk: `${DB_PREFIXES.RULE}${input.ruleId}`, sk: DB_SORT_KEYS.META },
        UpdateExpression: `SET ${parts.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: 'attribute_exists(pk) AND attribute_not_exists(deletedAt)',
        ReturnValues: 'ALL_NEW',
    }));
    return result.Attributes;
}
export async function softDeleteRule(ruleId) {
    const doc = getDocClient();
    const now = new Date().toISOString();
    await doc.send(new UpdateCommand({
        TableName: getAssignmentRulesTableName(),
        Key: { pk: `${DB_PREFIXES.RULE}${ruleId}`, sk: DB_SORT_KEYS.META },
        UpdateExpression: 'SET deletedAt = :d, #updatedAt = :u, isActive = :f',
        ExpressionAttributeNames: { '#updatedAt': 'updatedAt' },
        ExpressionAttributeValues: { ':d': now, ':u': now, ':f': false },
        ConditionExpression: 'attribute_exists(pk) AND attribute_not_exists(deletedAt)',
    }));
}
export async function listRules(funnelId, cursor, limit = 50) {
    const doc = getDocClient();
    let exclusiveStartKey;
    if (cursor) {
        const verified = verifyCursor(cursor);
        if (verified) {
            exclusiveStartKey = verified;
        }
        // If verifyCursor returns null (invalid/tampered), skip setting ExclusiveStartKey
    }
    if (funnelId) {
        const result = await doc.send(new QueryCommand({
            TableName: getAssignmentRulesTableName(),
            IndexName: GSI_INDEX_NAMES.GSI1,
            KeyConditionExpression: 'gsi1pk = :pk',
            FilterExpression: 'attribute_not_exists(deletedAt)',
            ExpressionAttributeValues: { ':pk': `${GSI_KEYS.FUNNEL}${funnelId}` },
            Limit: limit,
            ScanIndexForward: true, // ascending priority
            ExclusiveStartKey: exclusiveStartKey,
        }));
        const items = (result.Items || []);
        let nextCursor;
        if (result.LastEvaluatedKey) {
            nextCursor = signCursor(result.LastEvaluatedKey);
        }
        return { items, nextCursor };
    }
    // No funnelId - list all rules (less common, use scan)
    const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
    const result = await doc.send(new ScanCommand({
        TableName: getAssignmentRulesTableName(),
        FilterExpression: 'begins_with(pk, :prefix) AND sk = :meta AND attribute_not_exists(deletedAt)',
        ExpressionAttributeValues: { ':prefix': DB_PREFIXES.RULE, ':meta': DB_SORT_KEYS.META },
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey,
    }));
    const items = (result.Items || []);
    let nextCursor;
    if (result.LastEvaluatedKey) {
        nextCursor = signCursor(result.LastEvaluatedKey);
    }
    return { items, nextCursor };
}
/**
 * Get all active rules for a funnel, sorted by priority ascending.
 * Used by assignment matcher.
 */
export async function getRulesByFunnel(funnelId) {
    const doc = getDocClient();
    const rules = [];
    let lastKey;
    do {
        const result = await doc.send(new QueryCommand({
            TableName: getAssignmentRulesTableName(),
            IndexName: GSI_INDEX_NAMES.GSI1,
            KeyConditionExpression: 'gsi1pk = :pk',
            FilterExpression: 'isActive = :yes AND attribute_not_exists(deletedAt)',
            ExpressionAttributeValues: {
                ':pk': `${GSI_KEYS.FUNNEL}${funnelId}`,
                ':yes': true,
            },
            ScanIndexForward: true,
            ExclusiveStartKey: lastKey,
        }));
        rules.push(...(result.Items || []));
        lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return rules;
}
//# sourceMappingURL=rules.js.map