/**
 * DynamoDB operations for Audit Log
 *
 * Single-table access patterns:
 *   PK = AUDIT#<actorId>  SK = <timestamp>#<id>
 *   GSI1PK = AUDITLOG     GSI1SK = <timestamp>    (global timeline)
 */
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient } from './client.js';
import { getAuditTableName } from './table-names.js';
import { ulid } from '../../lib/id.js';
import { signCursor, verifyCursor } from '../cursor.js';
import { DB_PREFIXES, GSI_KEYS, GSI_INDEX_NAMES } from '../constants.js';
// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------
const AUDIT_RETENTION_DAYS = parseInt(process.env.AUDIT_RETENTION_DAYS || '365', 10);
export async function recordAudit(input) {
    const doc = getDocClient();
    const id = ulid();
    const now = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + AUDIT_RETENTION_DAYS * 86400;
    const entry = {
        pk: `${DB_PREFIXES.AUDIT}${input.actorId}`,
        sk: `${now}#${id}`,
        auditId: id,
        actorId: input.actorId,
        actorType: input.actorType,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        details: input.details || {},
        ipHash: input.ipHash,
        timestamp: now,
        ttl,
        gsi1pk: GSI_KEYS.AUDITLOG,
        gsi1sk: now,
    };
    await doc.send(new PutCommand({
        TableName: getAuditTableName(),
        Item: entry,
        ConditionExpression: 'attribute_not_exists(pk)',
    }));
    return entry;
}
/**
 * List audit entries for a specific actor.
 */
export async function listAuditByActor(actorId, cursor, limit = 50) {
    const doc = getDocClient();
    let exclusiveStartKey;
    if (cursor) {
        const verified = verifyCursor(cursor);
        if (verified) {
            exclusiveStartKey = verified;
        }
        // If verifyCursor returns null (invalid/tampered), skip setting ExclusiveStartKey
    }
    const result = await doc.send(new QueryCommand({
        TableName: getAuditTableName(),
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': `${DB_PREFIXES.AUDIT}${actorId}` },
        Limit: limit,
        ScanIndexForward: false,
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
 * List audit entries globally (admin timeline).
 */
export async function listAudit(cursor, limit = 50, startDate, endDate) {
    const doc = getDocClient();
    let exclusiveStartKey;
    if (cursor) {
        const verified = verifyCursor(cursor);
        if (verified) {
            exclusiveStartKey = verified;
        }
        // If verifyCursor returns null (invalid/tampered), skip setting ExclusiveStartKey
    }
    let keyCondition = 'gsi1pk = :pk';
    const exprValues = { ':pk': GSI_KEYS.AUDITLOG };
    if (startDate && endDate) {
        keyCondition += ' AND gsi1sk BETWEEN :start AND :end';
        exprValues[':start'] = startDate;
        exprValues[':end'] = endDate;
    }
    const result = await doc.send(new QueryCommand({
        TableName: getAuditTableName(),
        IndexName: GSI_INDEX_NAMES.GSI1,
        KeyConditionExpression: keyCondition,
        ExpressionAttributeValues: exprValues,
        Limit: limit,
        ScanIndexForward: false,
        ExclusiveStartKey: exclusiveStartKey,
    }));
    const items = (result.Items || []);
    let nextCursor;
    if (result.LastEvaluatedKey) {
        nextCursor = signCursor(result.LastEvaluatedKey);
    }
    return { items, nextCursor };
}
//# sourceMappingURL=audit.js.map