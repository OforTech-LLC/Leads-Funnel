/**
 * DynamoDB operations for Unassigned Lead queue
 *
 * Single-table access patterns:
 *   PK = UNASSIGNED#<funnelId>  SK = <timestamp>#<leadId>
 */
import { PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient } from './client.js';
import { getUnassignedTableName } from './table-names.js';
import { DB_PREFIXES } from '../constants.js';
// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------
export async function addUnassigned(funnelId, leadId, reason, zipCode) {
    const doc = getDocClient();
    const now = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;
    const entry = {
        pk: `${DB_PREFIXES.UNASSIGNED}${funnelId}`,
        sk: `${now}#${leadId}`,
        funnelId,
        leadId,
        zipCode,
        reason,
        createdAt: now,
        ttl,
    };
    await doc.send(new PutCommand({
        TableName: getUnassignedTableName(),
        Item: entry,
    }));
    return entry;
}
export async function listUnassigned(funnelId, cursor, limit = 50) {
    const doc = getDocClient();
    let exclusiveStartKey;
    if (cursor) {
        try {
            exclusiveStartKey = JSON.parse(Buffer.from(cursor, 'base64url').toString());
        }
        catch {
            // invalid cursor
        }
    }
    const result = await doc.send(new QueryCommand({
        TableName: getUnassignedTableName(),
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': `${DB_PREFIXES.UNASSIGNED}${funnelId}` },
        Limit: limit,
        ScanIndexForward: false,
        ExclusiveStartKey: exclusiveStartKey,
    }));
    const items = (result.Items || []);
    let nextCursor;
    if (result.LastEvaluatedKey) {
        nextCursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64url');
    }
    return { items, nextCursor };
}
/**
 * Remove an entry once a lead has been manually assigned.
 */
export async function removeUnassigned(funnelId, sk) {
    const doc = getDocClient();
    await doc.send(new DeleteCommand({
        TableName: getUnassignedTableName(),
        Key: { pk: `${DB_PREFIXES.UNASSIGNED}${funnelId}`, sk },
    }));
}
//# sourceMappingURL=unassigned.js.map