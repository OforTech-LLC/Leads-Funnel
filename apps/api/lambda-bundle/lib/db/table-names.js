/**
 * DynamoDB table name resolution for platform modules.
 *
 * Supports dedicated per-entity tables when provided, with safe fallback
 * to the legacy DDB_TABLE_NAME for backwards compatibility.
 */
import { tableName as legacyTableName } from '../clients.js';
function resolveEnv(names) {
    for (const name of names) {
        const value = process.env[name];
        if (value && value.trim().length > 0) {
            return value.trim();
        }
    }
    return '';
}
function resolveTable(names) {
    const resolved = resolveEnv(names);
    return resolved || legacyTableName();
}
export function getOrgsTableName() {
    return resolveTable(['ORGS_TABLE_NAME']);
}
export function getUsersTableName() {
    return resolveTable(['USERS_TABLE_NAME']);
}
export function getMembershipsTableName() {
    return resolveTable(['MEMBERSHIPS_TABLE_NAME']);
}
export function getAssignmentRulesTableName() {
    return resolveTable(['ASSIGNMENT_RULES_TABLE', 'ASSIGNMENT_RULES_TABLE_NAME']);
}
export function getPlatformLeadsTableName() {
    return resolveTable(['PLATFORM_LEADS_TABLE_NAME', 'LEADS_TABLE_NAME', 'DDB_TABLE_NAME']);
}
export function getUnassignedTableName() {
    return resolveTable(['UNASSIGNED_TABLE_NAME', 'UNASSIGNED_TABLE']);
}
export function getNotificationsTableName() {
    return resolveTable(['NOTIFICATIONS_TABLE_NAME', 'NOTIFICATIONS_TABLE']);
}
export function getAuditTableName() {
    return resolveTable(['AUDIT_TABLE', 'ADMIN_AUDIT_TABLE']);
}
export function getExportsTableName() {
    return resolveTable(['EXPORT_JOBS_TABLE', 'EXPORTS_TABLE', 'EXPORT_TABLE']);
}
//# sourceMappingURL=table-names.js.map