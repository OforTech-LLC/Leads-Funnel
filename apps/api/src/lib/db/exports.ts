/**
 * DynamoDB operations for Export Jobs
 *
 * Single-table access patterns:
 *   PK = EXPORT#<exportId>   SK = META
 *   GSI1PK = EXPORTS         GSI1SK = CREATED#<iso>  (list all)
 */

import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient, tableName } from './client.js';
import { ulid } from '../../lib/id.js';
import { signCursor, verifyCursor } from '../cursor.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ExportFormat = 'csv' | 'xlsx' | 'json';

export interface ExportJob {
  pk: string;
  sk: string;
  exportId: string;
  requestedBy: string; // admin email hash or userId
  funnelId?: string;
  orgId?: string;
  format: ExportFormat;
  filters: Record<string, unknown>;
  status: ExportStatus;
  s3Key?: string;
  recordCount?: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
  ttl: number;
  gsi1pk: string;
  gsi1sk: string;
}

export interface CreateExportInput {
  requestedBy: string;
  funnelId?: string;
  orgId?: string;
  format: ExportFormat;
  filters?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

const EXPORT_EXPIRY_HOURS = 24;

export async function createExport(input: CreateExportInput): Promise<ExportJob> {
  const doc = getDocClient();
  const exportId = ulid();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + EXPORT_EXPIRY_HOURS * 3600 * 1000).toISOString();
  const ttl = Math.floor(Date.now() / 1000) + EXPORT_EXPIRY_HOURS * 3600;

  const job: ExportJob = {
    pk: `EXPORT#${exportId}`,
    sk: 'META',
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
    gsi1pk: 'EXPORTS',
    gsi1sk: `CREATED#${now}`,
  };

  await doc.send(
    new PutCommand({
      TableName: tableName(),
      Item: job,
    })
  );

  return job;
}

export async function getExport(exportId: string): Promise<ExportJob | null> {
  const doc = getDocClient();
  const result = await doc.send(
    new GetCommand({
      TableName: tableName(),
      Key: { pk: `EXPORT#${exportId}`, sk: 'META' },
    })
  );
  return (result.Item as ExportJob) || null;
}

export async function updateExport(
  exportId: string,
  updates: {
    status?: ExportStatus;
    s3Key?: string;
    recordCount?: number;
    errorMessage?: string;
  }
): Promise<ExportJob> {
  const doc = getDocClient();
  const now = new Date().toISOString();

  const parts: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

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
    if (!existing) throw new Error('Export not found');
    return existing;
  }

  const result = await doc.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { pk: `EXPORT#${exportId}`, sk: 'META' },
      UpdateExpression: `SET ${parts.join(', ')}`,
      ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(pk)',
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes as ExportJob;
}

export interface PaginatedExports {
  items: ExportJob[];
  nextCursor?: string;
}

export async function listExports(cursor?: string, limit = 25): Promise<PaginatedExports> {
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
      IndexName: 'GSI1',
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: { ':pk': 'EXPORTS' },
      Limit: limit,
      ScanIndexForward: false,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  const items = (result.Items || []) as ExportJob[];
  let nextCursor: string | undefined;
  if (result.LastEvaluatedKey) {
    nextCursor = signCursor(result.LastEvaluatedKey as Record<string, unknown>);
  }

  return { items, nextCursor };
}
