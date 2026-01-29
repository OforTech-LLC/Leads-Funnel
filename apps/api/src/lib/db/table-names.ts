/**
 * DynamoDB table name resolution for platform modules.
 *
 * Supports dedicated per-entity tables when provided, with safe fallback
 * to the legacy DDB_TABLE_NAME for backwards compatibility.
 */

import { tableName as legacyTableName } from '../clients.js';

function resolveEnv(names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
}

function resolveTable(names: string[]): string {
  const resolved = resolveEnv(names);
  return resolved || legacyTableName();
}

export function getOrgsTableName(): string {
  return resolveTable(['ORGS_TABLE_NAME']);
}

export function getUsersTableName(): string {
  return resolveTable(['USERS_TABLE_NAME']);
}

export function getMembershipsTableName(): string {
  return resolveTable(['MEMBERSHIPS_TABLE_NAME']);
}

export function getAssignmentRulesTableName(): string {
  return resolveTable(['ASSIGNMENT_RULES_TABLE', 'ASSIGNMENT_RULES_TABLE_NAME']);
}

export function getPlatformLeadsTableName(): string {
  return resolveTable(['PLATFORM_LEADS_TABLE_NAME', 'LEADS_TABLE_NAME', 'DDB_TABLE_NAME']);
}

export function getUnassignedTableName(): string {
  return resolveTable(['UNASSIGNED_TABLE_NAME', 'UNASSIGNED_TABLE']);
}

export function getNotificationsTableName(): string {
  return resolveTable(['NOTIFICATIONS_TABLE_NAME', 'NOTIFICATIONS_TABLE']);
}

export function getAuditTableName(): string {
  return resolveTable(['AUDIT_TABLE', 'ADMIN_AUDIT_TABLE']);
}

export function getExportsTableName(): string {
  return resolveTable(['EXPORT_JOBS_TABLE', 'EXPORTS_TABLE', 'EXPORT_TABLE']);
}
