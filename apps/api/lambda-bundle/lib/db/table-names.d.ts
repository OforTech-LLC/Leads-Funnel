/**
 * DynamoDB table name resolution for platform modules.
 *
 * Supports dedicated per-entity tables when provided, with safe fallback
 * to the legacy DDB_TABLE_NAME for backwards compatibility.
 */
export declare function getOrgsTableName(): string;
export declare function getUsersTableName(): string;
export declare function getMembershipsTableName(): string;
export declare function getAssignmentRulesTableName(): string;
export declare function getPlatformLeadsTableName(): string;
export declare function getUnassignedTableName(): string;
export declare function getNotificationsTableName(): string;
export declare function getAuditTableName(): string;
export declare function getExportsTableName(): string;
