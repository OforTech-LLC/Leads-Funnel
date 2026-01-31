/**
 * DynamoDB operations for Notification records
 *
 * Single-table access patterns:
 *   PK = NOTIFY#<leadId>   SK = <channel>#<timestamp>
 *   GSI1PK = NOTIFYLOG     GSI1SK = <timestamp>  (global log)
 */
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient } from './client.js';
import { getNotificationsTableName } from './table-names.js';
import { ulid } from '../../lib/id.js';
import { signCursor, verifyCursor } from '../cursor.js';
import { DB_PREFIXES, GSI_KEYS, GSI_INDEX_NAMES } from '../constants.js';
// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------
export async function recordNotification(input) {
    const doc = getDocClient();
    const id = ulid();
    const now = new Date().toISOString();
    const record = {
        pk: `${DB_PREFIXES.NOTIFY}${input.leadId}`,
        sk: `${input.channel}#${now}#${id}`,
        notificationId: id,
        leadId: input.leadId,
        funnelId: input.funnelId,
        orgId: input.orgId,
        userId: input.userId,
        channel: input.channel,
        recipient: input.recipientHash,
        status: input.status,
        errorMessage: input.errorMessage,
        sentAt: now,
        gsi1pk: GSI_KEYS.NOTIFYLOG,
        gsi1sk: now,
    };
    await doc.send(new PutCommand({
        TableName: getNotificationsTableName(),
        Item: record,
    }));
    return record;
}
/**
 * List notifications for a specific lead.
 */
export async function listNotificationsByLead(leadId, cursor, limit = 50) {
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
        TableName: getNotificationsTableName(),
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': `${DB_PREFIXES.NOTIFY}${leadId}` },
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
 * List recent notifications globally (admin view).
 */
export async function listNotifications(cursor, limit = 50, startDate, endDate) {
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
    const exprValues = { ':pk': GSI_KEYS.NOTIFYLOG };
    if (startDate && endDate) {
        keyCondition += ' AND gsi1sk BETWEEN :start AND :end';
        exprValues[':start'] = startDate;
        exprValues[':end'] = endDate;
    }
    const result = await doc.send(new QueryCommand({
        TableName: getNotificationsTableName(),
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
//# sourceMappingURL=notifications.js.map