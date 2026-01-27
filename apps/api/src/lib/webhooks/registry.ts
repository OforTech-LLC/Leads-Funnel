/**
 * Webhook Registry - CRUD for webhook registrations
 *
 * DynamoDB access patterns:
 *   PK = WEBHOOK#<id>            SK = CONFIG
 *   GSI1PK = ORG#<orgId>#WEBHOOKS  GSI1SK = CREATED#<iso>
 */

import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { getDocClient, tableName } from '../db/client.js';
import { ulid } from '../id.js';
import { signCursor, verifyCursor } from '../cursor.js';
import type { WebhookConfig, CreateWebhookInput, UpdateWebhookInput } from './types.js';

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * Register a new webhook.
 */
export async function createWebhook(input: CreateWebhookInput): Promise<WebhookConfig> {
  const doc = getDocClient();
  const id = ulid();
  const now = new Date().toISOString();

  const webhook: WebhookConfig = {
    pk: `WEBHOOK#${id}`,
    sk: 'CONFIG',
    id,
    orgId: input.orgId,
    url: input.url,
    secret: input.secret,
    events: input.events,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
    gsi1pk: `ORG#${input.orgId}#WEBHOOKS`,
    gsi1sk: `CREATED#${now}`,
  };

  await doc.send(
    new PutCommand({
      TableName: tableName(),
      Item: webhook,
      ConditionExpression: 'attribute_not_exists(pk)',
    })
  );

  return webhook;
}

/**
 * Get a single webhook by ID.
 */
export async function getWebhook(id: string): Promise<WebhookConfig | null> {
  const doc = getDocClient();
  const result = await doc.send(
    new GetCommand({
      TableName: tableName(),
      Key: { pk: `WEBHOOK#${id}`, sk: 'CONFIG' },
    })
  );
  return (result.Item as WebhookConfig | undefined) || null;
}

/**
 * Update an existing webhook.
 */
export async function updateWebhook(input: UpdateWebhookInput): Promise<WebhookConfig> {
  const doc = getDocClient();
  const now = new Date().toISOString();

  const parts: string[] = ['#updatedAt = :updatedAt'];
  const names: Record<string, string> = { '#updatedAt': 'updatedAt' };
  const values: Record<string, unknown> = { ':updatedAt': now };

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

  const result = await doc.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { pk: `WEBHOOK#${input.id}`, sk: 'CONFIG' },
      UpdateExpression: `SET ${parts.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(pk)',
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes as WebhookConfig;
}

/**
 * Delete a webhook permanently.
 */
export async function deleteWebhook(id: string): Promise<void> {
  const doc = getDocClient();

  await doc.send(
    new DeleteCommand({
      TableName: tableName(),
      Key: { pk: `WEBHOOK#${id}`, sk: 'CONFIG' },
      ConditionExpression: 'attribute_exists(pk)',
    })
  );
}

/**
 * List all webhooks for an org.
 */
export interface PaginatedWebhooks {
  items: WebhookConfig[];
  nextCursor?: string;
}

export async function listWebhooksByOrg(
  orgId: string,
  cursor?: string,
  limit = 25
): Promise<PaginatedWebhooks> {
  const doc = getDocClient();

  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (cursor) {
    const verified = verifyCursor(cursor);
    if (verified) {
      exclusiveStartKey = verified;
    }
  }

  const result = await doc.send(
    new QueryCommand({
      TableName: tableName(),
      IndexName: 'GSI1',
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: { ':pk': `ORG#${orgId}#WEBHOOKS` },
      Limit: limit,
      ScanIndexForward: false,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  const items = (result.Items || []) as WebhookConfig[];
  let nextCursor: string | undefined;
  if (result.LastEvaluatedKey) {
    nextCursor = signCursor(result.LastEvaluatedKey as Record<string, unknown>);
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
export async function findWebhooksForEvent(eventType: string): Promise<WebhookConfig[]> {
  const doc = getDocClient();
  const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');

  const webhooks: WebhookConfig[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await doc.send(
      new ScanCommand({
        TableName: tableName(),
        FilterExpression:
          'begins_with(pk, :prefix) AND sk = :sk AND active = :active AND contains(events, :evt)',
        ExpressionAttributeValues: {
          ':prefix': 'WEBHOOK#',
          ':sk': 'CONFIG',
          ':active': true,
          ':evt': eventType,
        },
        ExclusiveStartKey: lastKey,
      })
    );

    webhooks.push(...((result.Items || []) as WebhookConfig[]));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return webhooks;
}
