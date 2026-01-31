/**
 * Webhook API Endpoints
 *
 * Admin-only endpoints for managing webhook registrations:
 *   POST   /admin/webhooks              - Register webhook
 *   GET    /admin/webhooks              - List webhooks for org
 *   PUT    /admin/webhooks/{id}         - Update webhook
 *   DELETE /admin/webhooks/{id}         - Delete webhook
 *   GET    /admin/webhooks/{id}/deliveries - Recent deliveries
 *   POST   /admin/webhooks/{id}/test    - Send test payload
 */
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import * as registry from './registry.js';
import { sendTestWebhook } from './dispatcher.js';
import { getDocClient, tableName } from '../db/client.js';
import { signCursor, verifyCursor } from '../cursor.js';
import * as resp from '../response.js';
import { parseBody, pathParam, queryParam } from '../handler-utils.js';
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const VALID_EVENT_TYPES = [
    'lead.created',
    'lead.assigned',
    'lead.status_changed',
    'lead.note_added',
];
// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------
/**
 * Handle all /admin/webhooks/* routes.
 *
 * @param event - API Gateway event
 * @param subpath - Path after /admin (e.g. /webhooks, /webhooks/abc123)
 * @param method - HTTP method
 * @param canWrite - Whether the admin has write permissions
 * @returns API Gateway response or null if the path does not match
 */
export async function handleWebhookRoutes(event, subpath, method, canWrite, requestOrigin) {
    // POST /admin/webhooks - Register
    if (subpath === '/webhooks' && method === 'POST') {
        if (!canWrite)
            return resp.forbidden(undefined, requestOrigin);
        const body = parseBody(event);
        if (body === null)
            return resp.badRequest('Invalid JSON in request body', requestOrigin);
        if (!body.orgId || !body.url || !body.secret || !body.events) {
            return resp.badRequest('orgId, url, secret, and events are required', requestOrigin);
        }
        const events = body.events;
        for (const evt of events) {
            if (!VALID_EVENT_TYPES.includes(evt)) {
                return resp.badRequest(`Invalid event type "${evt}". Must be one of: ${VALID_EVENT_TYPES.join(', ')}`, requestOrigin);
            }
        }
        const webhook = await registry.createWebhook({
            orgId: body.orgId,
            url: body.url,
            secret: body.secret,
            events: events,
            active: body.active,
        });
        return resp.created(webhook, requestOrigin);
    }
    // GET /admin/webhooks - List
    if (subpath === '/webhooks' && method === 'GET') {
        const orgId = queryParam(event, 'orgId');
        if (!orgId)
            return resp.badRequest('orgId query parameter is required', requestOrigin);
        const result = await registry.listWebhooksByOrg(orgId, queryParam(event, 'cursor'), Number(queryParam(event, 'limit')) || 25);
        return resp.paginated(result.items, {
            nextCursor: result.nextCursor,
            hasMore: !!result.nextCursor,
        }, requestOrigin);
    }
    // PUT /admin/webhooks/{id} - Update
    if (/^\/webhooks\/[^/]+$/.test(subpath) && method === 'PUT') {
        if (!canWrite)
            return resp.forbidden(undefined, requestOrigin);
        const id = pathParam(event, 2);
        const body = parseBody(event);
        if (body === null)
            return resp.badRequest('Invalid JSON in request body', requestOrigin);
        if (body.events) {
            const events = body.events;
            for (const evt of events) {
                if (!VALID_EVENT_TYPES.includes(evt)) {
                    return resp.badRequest(`Invalid event type "${evt}". Must be one of: ${VALID_EVENT_TYPES.join(', ')}`, requestOrigin);
                }
            }
        }
        const updated = await registry.updateWebhook({
            id,
            url: body.url,
            secret: body.secret,
            events: body.events,
            active: body.active,
        });
        return resp.success(updated, undefined, requestOrigin);
    }
    // DELETE /admin/webhooks/{id} - Delete
    if (/^\/webhooks\/[^/]+$/.test(subpath) && method === 'DELETE') {
        if (!canWrite)
            return resp.forbidden(undefined, requestOrigin);
        const id = pathParam(event, 2);
        await registry.deleteWebhook(id);
        return resp.noContent(requestOrigin);
    }
    // GET /admin/webhooks/{id}/deliveries - Recent deliveries
    if (/^\/webhooks\/[^/]+\/deliveries$/.test(subpath) && method === 'GET') {
        const webhookId = pathParam(event, 2);
        const limit = Number(queryParam(event, 'limit')) || 25;
        let exclusiveStartKey;
        const cursor = queryParam(event, 'cursor');
        if (cursor) {
            const verified = verifyCursor(cursor);
            if (verified) {
                exclusiveStartKey = verified;
            }
        }
        const doc = getDocClient();
        const result = await doc.send(new QueryCommand({
            TableName: tableName(),
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: { ':pk': `WHDELIVER#${webhookId}` },
            Limit: limit,
            ScanIndexForward: false,
            ExclusiveStartKey: exclusiveStartKey,
        }));
        const items = result.Items || [];
        let nextCursor;
        if (result.LastEvaluatedKey) {
            nextCursor = signCursor(result.LastEvaluatedKey);
        }
        return resp.paginated(items, {
            nextCursor,
            hasMore: !!nextCursor,
        }, requestOrigin);
    }
    // POST /admin/webhooks/{id}/test - Send test
    if (/^\/webhooks\/[^/]+\/test$/.test(subpath) && method === 'POST') {
        if (!canWrite)
            return resp.forbidden(undefined, requestOrigin);
        const id = pathParam(event, 2);
        const webhook = await registry.getWebhook(id);
        if (!webhook)
            return resp.notFound('Webhook not found', requestOrigin);
        const delivery = await sendTestWebhook(webhook);
        return resp.success(delivery, undefined, requestOrigin);
    }
    // Path not matched
    return null;
}
//# sourceMappingURL=handler.js.map