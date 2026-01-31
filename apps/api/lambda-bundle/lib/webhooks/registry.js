/**
 * Webhook Registry - CRUD for webhook registrations
 *
 * DynamoDB access patterns:
 *   PK = WEBHOOK#<id>            SK = CONFIG
 *   GSI1PK = ORG#<orgId>#WEBHOOKS  GSI1SK = CREATED#<iso>
 */
import { PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand, } from '@aws-sdk/lib-dynamodb';
import { getDocClient, tableName } from '../db/client.js';
import { ulid } from '../id.js';
import { signCursor, verifyCursor } from '../cursor.js';
import { DB_PREFIXES, DB_SORT_KEYS, GSI_KEYS, GSI_INDEX_NAMES } from '../constants.js';
// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------
/**
 * Register a new webhook.
 */
export async function createWebhook(input) {
    const doc = getDocClient();
    const id = ulid();
    const now = new Date().toISOString();
    const webhook = {
        pk: `${DB_PREFIXES.WEBHOOK}${id}`,
        sk: DB_SORT_KEYS.CONFIG,
        id,
        orgId: input.orgId,
        url: input.url,
        secret: input.secret,
        events: input.events,
        active: input.active ?? true,
        createdAt: now,
        updatedAt: now,
        gsi1pk: `${GSI_KEYS.ORG}${input.orgId}${GSI_KEYS.ORG_WEBHOOKS_SUFFIX}`,
        gsi1sk: `${GSI_KEYS.CREATED}${now}`,
    };
    await doc.send(new PutCommand({
        TableName: tableName(),
        Item: webhook,
        ConditionExpression: 'attribute_not_exists(pk)',
    }));
    return webhook;
}
/**
 * Get a single webhook by ID.
 */
export async function getWebhook(id) {
    const doc = getDocClient();
    const result = await doc.send(new GetCommand({
        TableName: tableName(),
        Key: { pk: `${DB_PREFIXES.WEBHOOK}${id}`, sk: DB_SORT_KEYS.CONFIG },
    }));
    return result.Item || null;
}
/**
 * Update an existing webhook.
 */
export async function updateWebhook(input) {
    const doc = getDocClient();
    const now = new Date().toISOString();
    const parts = ['#updatedAt = :updatedAt'];
    const names = { '#updatedAt': 'updatedAt' };
    const values = { ':updatedAt': now };
    if (input.url !== undefined) {
        parts.push('#url = :url');
        names['#url'] = 'url';
        values[':url'] = input.url;
    }
    if (input.secret !== undefined) {
        parts.push('secret = :secret');
        values[':secret'] = input.secret;
    }
    if (input.events !== undefined) {
        parts.push('events = :events');
        values[':events'] = input.events;
    }
    if (input.active !== undefined) {
        parts.push('active = :active');
        values[':active'] = input.active;
    }
    const result = await doc.send(new UpdateCommand({
        TableName: tableName(),
        Key: { pk: `${DB_PREFIXES.WEBHOOK}${input.id}`, sk: DB_SORT_KEYS.CONFIG },
        UpdateExpression: `SET ${parts.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: 'attribute_exists(pk)',
        ReturnValues: 'ALL_NEW',
    }));
    return result.Attributes;
}
/**
 * Delete a webhook permanently.
 */
export async function deleteWebhook(id) {
    const doc = getDocClient();
    await doc.send(new DeleteCommand({
        TableName: tableName(),
        Key: { pk: `${DB_PREFIXES.WEBHOOK}${id}`, sk: DB_SORT_KEYS.CONFIG },
        ConditionExpression: 'attribute_exists(pk)',
    }));
}
export async function listWebhooksByOrg(orgId, cursor, limit = 25) {
    const doc = getDocClient();
    let exclusiveStartKey;
    if (cursor) {
        const verified = verifyCursor(cursor);
        if (verified) {
            exclusiveStartKey = verified;
        }
    }
    const result = await doc.send(new QueryCommand({
        TableName: tableName(),
        IndexName: GSI_INDEX_NAMES.GSI1,
        KeyConditionExpression: 'gsi1pk = :pk',
        ExpressionAttributeValues: {
            ':pk': `${GSI_KEYS.ORG}${orgId}${GSI_KEYS.ORG_WEBHOOKS_SUFFIX}`,
        },
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
 * Find all active webhooks across all orgs that subscribe to a given event type.
 * Used by the dispatcher to fan out events.
 *
 * NOTE: In a production system with high webhook volume, consider maintaining
 * a GSI keyed by event type. For now we scan active webhooks and filter.
 */
export async function findWebhooksForEvent(eventType) {
    const doc = getDocClient();
    const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
    const webhooks = [];
    let lastKey;
    do {
        const result = await doc.send(new ScanCommand({
            TableName: tableName(),
            FilterExpression: 'begins_with(pk, :prefix) AND sk = :sk AND active = :active AND contains(events, :evt)',
            ExpressionAttributeValues: {
                ':prefix': DB_PREFIXES.WEBHOOK,
                ':sk': DB_SORT_KEYS.CONFIG,
                ':active': true,
                ':evt': eventType,
            },
            ExclusiveStartKey: lastKey,
        }));
        webhooks.push(...(result.Items || []));
        lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return webhooks;
}
//# sourceMappingURL=registry.js.map