/**
 * DynamoDB operations for Audit Log
 *
 * Single-table access patterns:
 *   PK = AUDIT#<actorId>  SK = <timestamp>#<id>
 *   GSI1PK = AUDITLOG     GSI1SK = <timestamp>    (global timeline)
 */

import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient, tableName } from './client.js';
import { ulid } from '../../lib/id.js';
import { signCursor, verifyCursor } from '../cursor.js';
import { DB_PREFIXES, GSI_KEYS, GSI_INDEX_NAMES } from '../constants.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuditAction =
  | 'org.create'
  | 'org.update'
  | 'org.delete'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'member.add'
  | 'member.update'
  | 'member.remove'
  | 'rule.create'
  | 'rule.update'
  | 'rule.delete'
  | 'rule.bulkCreate'
  | 'lead.update'
  | 'lead.reassign'
  | 'lead.assign'
  | 'lead.unassign'
  | 'lead.bulkUpdate'
  | 'lead.bulkImport'
  | 'export.create'
  | 'export.download'
  | 'notification.sent'
  | 'settings.update'
  | 'login'
  | 'gdpr.erasure'
  | 'gdpr.export'
  | 'billing.upgrade'
  | 'calendar.connect'
  | 'calendar.book'
  | 'calendar.disconnect'
  | 'integration.configure'
  | 'integration.remove';

export interface AuditEntry {
  pk: string;
  sk: string;
  auditId: string;
  actorId: string;
  actorType: 'admin' | 'portal_user' | 'system';
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipHash?: string;
  timestamp: string;
  ttl: number;
  gsi1pk: string;
  gsi1sk: string;
}

export interface RecordAuditInput {
  actorId: string;
  actorType: 'admin' | 'portal_user' | 'system';
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ipHash?: string;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

const AUDIT_RETENTION_DAYS = parseInt(process.env.AUDIT_RETENTION_DAYS || '365', 10);

export async function recordAudit(input: RecordAuditInput): Promise<AuditEntry> {
  const doc = getDocClient();
  const id = ulid();
  const now = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + AUDIT_RETENTION_DAYS * 86400;

  const entry: AuditEntry = {
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

  await doc.send(
    new PutCommand({
      TableName: tableName(),
      Item: entry,
      ConditionExpression: 'attribute_not_exists(pk)',
    })
  );

  return entry;
}

export interface PaginatedAudit {
  items: AuditEntry[];
  nextCursor?: string;
}

/**
 * List audit entries for a specific actor.
 */
export async function listAuditByActor(
  actorId: string,
  cursor?: string,
  limit = 50
): Promise<PaginatedAudit> {
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
      TableName: tableName(),
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': `${DB_PREFIXES.AUDIT}${actorId}` },
      Limit: limit,
      ScanIndexForward: false,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  const items = (result.Items || []) as AuditEntry[];
  let nextCursor: string | undefined;
  if (result.LastEvaluatedKey) {
    nextCursor = signCursor(result.LastEvaluatedKey as Record<string, unknown>);
  }

  return { items, nextCursor };
}

/**
 * List audit entries globally (admin timeline).
 */
export async function listAudit(
  cursor?: string,
  limit = 50,
  startDate?: string,
  endDate?: string
): Promise<PaginatedAudit> {
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
  const exprValues: Record<string, unknown> = { ':pk': GSI_KEYS.AUDITLOG };

  if (startDate && endDate) {
    keyCondition += ' AND gsi1sk BETWEEN :start AND :end';
    exprValues[':start'] = startDate;
    exprValues[':end'] = endDate;
  }

  const result = await doc.send(
    new QueryCommand({
      TableName: tableName(),
      IndexName: GSI_INDEX_NAMES.GSI1,
      KeyConditionExpression: keyCondition,
      ExpressionAttributeValues: exprValues,
      Limit: limit,
      ScanIndexForward: false,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  const items = (result.Items || []) as AuditEntry[];
  let nextCursor: string | undefined;
  if (result.LastEvaluatedKey) {
    nextCursor = signCursor(result.LastEvaluatedKey as Record<string, unknown>);
  }

  return { items, nextCursor };
}
