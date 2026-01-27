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
  | 'lead.update'
  | 'lead.reassign'
  | 'lead.assign'
  | 'lead.unassign'
  | 'export.create'
  | 'export.download'
  | 'notification.sent'
  | 'settings.update'
  | 'login';

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
    pk: `AUDIT#${input.actorId}`,
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
    gsi1pk: 'AUDITLOG',
    gsi1sk: now,
  };

  await doc.send(
    new PutCommand({
      TableName: tableName(),
      Item: entry,
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
    try {
      exclusiveStartKey = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    } catch {
      // invalid
    }
  }

  const result = await doc.send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': `AUDIT#${actorId}` },
      Limit: limit,
      ScanIndexForward: false,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  const items = (result.Items || []) as AuditEntry[];
  let nextCursor: string | undefined;
  if (result.LastEvaluatedKey) {
    nextCursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64url');
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
    try {
      exclusiveStartKey = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    } catch {
      // invalid
    }
  }

  let keyCondition = 'gsi1pk = :pk';
  const exprValues: Record<string, unknown> = { ':pk': 'AUDITLOG' };

  if (startDate && endDate) {
    keyCondition += ' AND gsi1sk BETWEEN :start AND :end';
    exprValues[':start'] = startDate;
    exprValues[':end'] = endDate;
  }

  const result = await doc.send(
    new QueryCommand({
      TableName: tableName(),
      IndexName: 'GSI1',
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
    nextCursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64url');
  }

  return { items, nextCursor };
}
