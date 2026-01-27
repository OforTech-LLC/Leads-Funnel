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

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import * as registry from './registry.js';
import { sendTestWebhook } from './dispatcher.js';
import { getDocClient, tableName } from '../db/client.js';
import { signCursor, verifyCursor } from '../cursor.js';
import * as resp from '../response.js';
import { parseBody, pathParam, queryParam } from '../handler-utils.js';
import type { WebhookEventType } from './types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_EVENT_TYPES: WebhookEventType[] = [
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
export async function handleWebhookRoutes(
  event: APIGatewayProxyEventV2,
  subpath: string,
  method: string,
  canWrite: boolean
): Promise<APIGatewayProxyResultV2 | null> {
  // POST /admin/webhooks - Register
  if (subpath === '/webhooks' && method === 'POST') {
    if (!canWrite) return resp.forbidden();
    const body = parseBody(event);
    if (body === null) return resp.badRequest('Invalid JSON in request body');
    if (!body.orgId || !body.url || !body.secret || !body.events) {
      return resp.badRequest('orgId, url, secret, and events are required');
    }
    const events = body.events as string[];
    for (const evt of events) {
      if (!VALID_EVENT_TYPES.includes(evt as WebhookEventType)) {
        return resp.badRequest(
          `Invalid event type "${evt}". Must be one of: ${VALID_EVENT_TYPES.join(', ')}`
        );
      }
    }
    const webhook = await registry.createWebhook({
      orgId: body.orgId as string,
      url: body.url as string,
      secret: body.secret as string,
      events: events as WebhookEventType[],
      active: body.active as boolean | undefined,
    });
    return resp.created(webhook);
  }

  // GET /admin/webhooks - List
  if (subpath === '/webhooks' && method === 'GET') {
    const orgId = queryParam(event, 'orgId');
    if (!orgId) return resp.badRequest('orgId query parameter is required');
    const result = await registry.listWebhooksByOrg(
      orgId,
      queryParam(event, 'cursor'),
      Number(queryParam(event, 'limit')) || 25
    );
    return resp.paginated(result.items, {
      nextCursor: result.nextCursor,
      hasMore: !!result.nextCursor,
    });
  }

  // PUT /admin/webhooks/{id} - Update
  if (/^\/webhooks\/[^/]+$/.test(subpath) && method === 'PUT') {
    if (!canWrite) return resp.forbidden();
    const id = pathParam(event, 2);
    const body = parseBody(event);
    if (body === null) return resp.badRequest('Invalid JSON in request body');
    if (body.events) {
      const events = body.events as string[];
      for (const evt of events) {
        if (!VALID_EVENT_TYPES.includes(evt as WebhookEventType)) {
          return resp.badRequest(
            `Invalid event type "${evt}". Must be one of: ${VALID_EVENT_TYPES.join(', ')}`
          );
        }
      }
    }
    const updated = await registry.updateWebhook({
      id,
      url: body.url as string | undefined,
      secret: body.secret as string | undefined,
      events: body.events as WebhookEventType[] | undefined,
      active: body.active as boolean | undefined,
    });
    return resp.success(updated);
  }

  // DELETE /admin/webhooks/{id} - Delete
  if (/^\/webhooks\/[^/]+$/.test(subpath) && method === 'DELETE') {
    if (!canWrite) return resp.forbidden();
    const id = pathParam(event, 2);
    await registry.deleteWebhook(id);
    return resp.noContent();
  }

  // GET /admin/webhooks/{id}/deliveries - Recent deliveries
  if (/^\/webhooks\/[^/]+\/deliveries$/.test(subpath) && method === 'GET') {
    const webhookId = pathParam(event, 2);
    const limit = Number(queryParam(event, 'limit')) || 25;

    let exclusiveStartKey: Record<string, unknown> | undefined;
    const cursor = queryParam(event, 'cursor');
    if (cursor) {
      const verified = verifyCursor(cursor);
      if (verified) {
        exclusiveStartKey = verified;
      }
    }

    const doc = getDocClient();
    const result = await doc.send(
      new QueryCommand({
        TableName: tableName(),
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': `WHDELIVER#${webhookId}` },
        Limit: limit,
        ScanIndexForward: false,
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    const items = result.Items || [];
    let nextCursor: string | undefined;
    if (result.LastEvaluatedKey) {
      nextCursor = signCursor(result.LastEvaluatedKey as Record<string, unknown>);
    }

    return resp.paginated(items, {
      nextCursor,
      hasMore: !!nextCursor,
    });
  }

  // POST /admin/webhooks/{id}/test - Send test
  if (/^\/webhooks\/[^/]+\/test$/.test(subpath) && method === 'POST') {
    if (!canWrite) return resp.forbidden();
    const id = pathParam(event, 2);
    const webhook = await registry.getWebhook(id);
    if (!webhook) return resp.notFound('Webhook not found');
    const delivery = await sendTestWebhook(webhook);
    return resp.success(delivery);
  }

  // Path not matched
  return null;
}
