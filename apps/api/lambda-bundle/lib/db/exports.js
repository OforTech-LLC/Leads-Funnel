/**
 * DynamoDB operations for Export Jobs
 *
 * Single-table access patterns:
 *   PK = EXPORT#<exportId>   SK = META
 *   GSI1PK = EXPORTS         GSI1SK = CREATED#<iso>  (list all)
 */
import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient } from './client.js';
import { getExportsTableName } from './table-names.js';
import { ulid } from '../../lib/id.js';
import { signCursor, verifyCursor } from '../cursor.js';
import { DB_PREFIXES, DB_SORT_KEYS, GSI_KEYS, GSI_INDEX_NAMES } from '../constants.js';
// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------
const EXPORT_EXPIRY_HOURS = 24;
export async function createExport(input) {
    const doc = getDocClient();
    const exportId = ulid();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + EXPORT_EXPIRY_HOURS * 3600 * 1000).toISOString();
    const ttl = Math.floor(Date.now() / 1000) + EXPORT_EXPIRY_HOURS * 3600;
    const job = {
        pk: `${DB_PREFIXES.EXPORT}${exportId}`,
        sk: DB_SORT_KEYS.META,
        exportId,
        requestedBy: input.requestedBy,
        funnelId: input.funnelId,
        orgId: input.orgId,
        format: input.format,
        filters: input.filters || {},
        status: 'pending',
        createdAt: now,
        expiresAt,
        ttl,
        gsi1pk: GSI_KEYS.EXPORTS_LIST,
        gsi1sk: `${GSI_KEYS.CREATED}${now}`,
    };
    await doc.send(new PutCommand({
        TableName: getExportsTableName(),
        Item: job,
    }));
    return job;
}
export async function getExport(exportId) {
    const doc = getDocClient();
    const result = await doc.send(new GetCommand({
        TableName: getExportsTableName(),
        Key: { pk: `${DB_PREFIXES.EXPORT}${exportId}`, sk: DB_SORT_KEYS.META },
    }));
    return result.Item || null;
}
export async function updateExport(exportId, updates) {
    const doc = getDocClient();
    const now = new Date().toISOString();
    const parts = [];
    const names = {};
    const values = {};
    if (updates.status !== undefined) {
        parts.push('#status = :status');
        names['#status'] = 'status';
        values[':status'] = updates.status;
        if (updates.status === 'completed' || updates.status === 'failed') {
            parts.push('completedAt = :completedAt');
            values[':completedAt'] = now;
        }
    }
    if (updates.s3Key !== undefined) {
        parts.push('s3Key = :s3Key');
        values[':s3Key'] = updates.s3Key;
    }
    if (updates.recordCount !== undefined) {
        parts.push('recordCount = :rc');
        values[':rc'] = updates.recordCount;
    }
    if (updates.errorMessage !== undefined) {
        parts.push('errorMessage = :em');
        values[':em'] = updates.errorMessage;
    }
    if (parts.length === 0) {
        const existing = await getExport(exportId);
        if (!existing)
            throw new Error('Export not found');
        return existing;
    }
    const result = await doc.send(new UpdateCommand({
        TableName: getExportsTableName(),
        Key: { pk: `${DB_PREFIXES.EXPORT}${exportId}`, sk: DB_SORT_KEYS.META },
        UpdateExpression: `SET ${parts.join(', ')}`,
        ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
        ExpressionAttributeValues: values,
        ConditionExpression: 'attribute_exists(pk)',
        ReturnValues: 'ALL_NEW',
    }));
    return result.Attributes;
}
export async function listExports(cursor, limit = 25) {
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
        TableName: getExportsTableName(),
        IndexName: GSI_INDEX_NAMES.GSI1,
        KeyConditionExpression: 'gsi1pk = :pk',
        ExpressionAttributeValues: { ':pk': GSI_KEYS.EXPORTS_LIST },
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
//# sourceMappingURL=exports.js.map