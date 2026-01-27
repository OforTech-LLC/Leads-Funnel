/**
 * Admin Audit Logging
 *
 * Logs all admin actions to DynamoDB for compliance and security.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import type { AdminConfig, AdminUser, AuditAction, AuditLogEntry } from '../types.js';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

// Default retention: 365 days (configurable via env)
const AUDIT_RETENTION_DAYS = parseInt(process.env.AUDIT_RETENTION_DAYS || '365', 10);

/**
 * Log an admin action to the audit table
 */
export async function logAuditEvent(
  config: AdminConfig,
  user: AdminUser,
  action: AuditAction,
  resourceType: 'lead' | 'export' | 'config',
  resourceId: string,
  details: Record<string, unknown>,
  ipAddress: string,
  userAgent: string,
  funnelId?: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  const auditId = uuidv4();

  // TTL for automatic deletion after retention period
  const ttl = Math.floor(Date.now() / 1000) + AUDIT_RETENTION_DAYS * 24 * 60 * 60;

  const entry: AuditLogEntry = {
    pk: `USER#${user.sub}`,
    sk: `AUDIT#${timestamp}#${auditId}`,
    userId: user.sub,
    userEmail: user.email,
    action,
    resourceType,
    resourceId,
    funnelId,
    details,
    ipAddress,
    userAgent,
    timestamp,
    ttl,
  };

  await ddb.send(
    new PutCommand({
      TableName: config.auditTable,
      Item: entry,
    })
  );
}

/**
 * Log view leads action
 */
export async function logViewLeads(
  config: AdminConfig,
  user: AdminUser,
  funnelId: string,
  filters: Record<string, unknown>,
  resultCount: number,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  await logAuditEvent(
    config,
    user,
    'VIEW_LEADS',
    'lead',
    `funnel:${funnelId}`,
    {
      filters,
      resultCount,
    },
    ipAddress,
    userAgent,
    funnelId
  );
}

/**
 * Log update lead action
 */
export async function logUpdateLead(
  config: AdminConfig,
  user: AdminUser,
  funnelId: string,
  leadId: string,
  changes: Record<string, unknown>,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  await logAuditEvent(
    config,
    user,
    'UPDATE_LEAD',
    'lead',
    leadId,
    {
      changes,
    },
    ipAddress,
    userAgent,
    funnelId
  );
}

/**
 * Log bulk update action
 */
export async function logBulkUpdate(
  config: AdminConfig,
  user: AdminUser,
  funnelId: string,
  leadIds: string[],
  changes: Record<string, unknown>,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  await logAuditEvent(
    config,
    user,
    'BULK_UPDATE_LEADS',
    'lead',
    `bulk:${leadIds.length}`,
    {
      leadIds,
      changes,
    },
    ipAddress,
    userAgent,
    funnelId
  );
}

/**
 * Log export creation action
 */
export async function logCreateExport(
  config: AdminConfig,
  user: AdminUser,
  funnelId: string,
  jobId: string,
  format: string,
  filters: Record<string, unknown>,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  await logAuditEvent(
    config,
    user,
    'CREATE_EXPORT',
    'export',
    jobId,
    {
      format,
      filters,
    },
    ipAddress,
    userAgent,
    funnelId
  );
}

/**
 * Log export download action
 */
export async function logDownloadExport(
  config: AdminConfig,
  user: AdminUser,
  jobId: string,
  funnelId: string,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  await logAuditEvent(
    config,
    user,
    'DOWNLOAD_EXPORT',
    'export',
    jobId,
    {},
    ipAddress,
    userAgent,
    funnelId
  );
}

/**
 * Log view stats action
 */
export async function logViewStats(
  config: AdminConfig,
  user: AdminUser,
  funnelId: string,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  await logAuditEvent(
    config,
    user,
    'VIEW_STATS',
    'lead',
    `stats:${funnelId}`,
    {},
    ipAddress,
    userAgent,
    funnelId
  );
}
