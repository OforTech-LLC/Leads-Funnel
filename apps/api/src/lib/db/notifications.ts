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
// Types
// ---------------------------------------------------------------------------

export type NotifyChannel = 'email' | 'sms';
export type NotifyStatus = 'sent' | 'failed' | 'skipped';

export interface NotificationRecord {
  pk: string;
  sk: string;
  notificationId: string;
  leadId: string;
  funnelId: string;
  orgId?: string;
  userId?: string;
  channel: NotifyChannel;
  recipient: string; // hashed
  status: NotifyStatus;
  errorMessage?: string;
  sentAt: string;
  gsi1pk: string;
  gsi1sk: string;
}

export interface RecordNotificationInput {
  leadId: string;
  funnelId: string;
  orgId?: string;
  userId?: string;
  channel: NotifyChannel;
  recipientHash: string;
  status: NotifyStatus;
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export async function recordNotification(
  input: RecordNotificationInput
): Promise<NotificationRecord> {
  const doc = getDocClient();
  const id = ulid();
  const now = new Date().toISOString();

  const record: NotificationRecord = {
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

  await doc.send(
    new PutCommand({
      TableName: getNotificationsTableName(),
      Item: record,
    })
  );

  return record;
}

export interface PaginatedNotifications {
  items: NotificationRecord[];
  nextCursor?: string;
}

/**
 * List notifications for a specific lead.
 */
export async function listNotificationsByLead(
  leadId: string,
  cursor?: string,
  limit = 50
): Promise<PaginatedNotifications> {
  const doc = getDocClient();

  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (cursor) {
    const verified = verifyCursor(cursor);
    if (verified) {
      exclusiveStartKey = verified;
    }
    // If verifyCursor returns null (invalid/tampered), skip setting ExclusiveStartKey
  }

  const result = await doc.send(
    new QueryCommand({
      TableName: getNotificationsTableName(),
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': `${DB_PREFIXES.NOTIFY}${leadId}` },
      Limit: limit,
      ScanIndexForward: false,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  const items = (result.Items || []) as NotificationRecord[];
  let nextCursor: string | undefined;
  if (result.LastEvaluatedKey) {
    nextCursor = signCursor(result.LastEvaluatedKey as Record<string, unknown>);
  }

  return { items, nextCursor };
}

/**
 * List recent notifications globally (admin view).
 */
export async function listNotifications(
  cursor?: string,
  limit = 50,
  startDate?: string,
  endDate?: string
): Promise<PaginatedNotifications> {
  const doc = getDocClient();

  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (cursor) {
    const verified = verifyCursor(cursor);
    if (verified) {
      exclusiveStartKey = verified;
    }
    // If verifyCursor returns null (invalid/tampered), skip setting ExclusiveStartKey
  }

  let keyCondition = 'gsi1pk = :pk';
  const exprValues: Record<string, unknown> = { ':pk': GSI_KEYS.NOTIFYLOG };

  if (startDate && endDate) {
    keyCondition += ' AND gsi1sk BETWEEN :start AND :end';
    exprValues[':start'] = startDate;
    exprValues[':end'] = endDate;
  }

  const result = await doc.send(
    new QueryCommand({
      TableName: getNotificationsTableName(),
      IndexName: GSI_INDEX_NAMES.GSI1,
      KeyConditionExpression: keyCondition,
      ExpressionAttributeValues: exprValues,
      Limit: limit,
      ScanIndexForward: false,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  const items = (result.Items || []) as NotificationRecord[];
  let nextCursor: string | undefined;
  if (result.LastEvaluatedKey) {
    nextCursor = signCursor(result.LastEvaluatedKey as Record<string, unknown>);
  }

  return { items, nextCursor };
}
