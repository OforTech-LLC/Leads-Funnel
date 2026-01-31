/**
 * DynamoDB operations for Audit Log
 *
 * Single-table access patterns:
 *   PK = AUDIT#<actorId>  SK = <timestamp>#<id>
 *   GSI1PK = AUDITLOG     GSI1SK = <timestamp>    (global timeline)
 */
export type AuditAction = 'org.create' | 'org.update' | 'org.delete' | 'user.create' | 'portal_user.create' | 'user.update' | 'user.delete' | 'member.add' | 'member.update' | 'member.remove' | 'rule.create' | 'rule.update' | 'rule.delete' | 'rule.bulkCreate' | 'lead.update' | 'lead.reassign' | 'lead.assign' | 'lead.unassign' | 'lead.bulkUpdate' | 'lead.bulkImport' | 'export.create' | 'export.download' | 'notification.sent' | 'settings.update' | 'login' | 'gdpr.erasure' | 'gdpr.export' | 'billing.upgrade' | 'calendar.connect' | 'calendar.book' | 'calendar.disconnect' | 'integration.configure' | 'integration.remove' | 'flag.update';
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
export declare function recordAudit(input: RecordAuditInput): Promise<AuditEntry>;
export interface PaginatedAudit {
    items: AuditEntry[];
    nextCursor?: string;
}
/**
 * List audit entries for a specific actor.
 */
export declare function listAuditByActor(actorId: string, cursor?: string, limit?: number): Promise<PaginatedAudit>;
/**
 * List audit entries globally (admin timeline).
 */
export declare function listAudit(cursor?: string, limit?: number, startDate?: string, endDate?: string): Promise<PaginatedAudit>;
