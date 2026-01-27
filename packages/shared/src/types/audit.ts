/**
 * Audit log entry types for tracking all admin and system actions.
 */

export interface AuditEntry {
  auditId: string;
  actorEmailHash: string;
  actorRole: string;
  action: string;
  target: string;
  metadata: Record<string, unknown>;
  ipHash: string;
  userAgent?: string;
  createdAt: string;
  ttl?: number;
}
