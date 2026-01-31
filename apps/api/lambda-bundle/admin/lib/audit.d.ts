/**
 * Admin Audit Logging
 *
 * Logs all admin actions to DynamoDB for compliance and security.
 */
import type { AdminConfig, AdminUser, AuditAction } from '../types.js';
/**
 * Log an admin action to the audit table
 */
export declare function logAuditEvent(config: AdminConfig, user: AdminUser, action: AuditAction, resourceType: 'lead' | 'export' | 'config', resourceId: string, details: Record<string, unknown>, ipAddress: string, userAgent: string, funnelId?: string): Promise<void>;
/**
 * Log view leads action
 */
export declare function logViewLeads(config: AdminConfig, user: AdminUser, funnelId: string, filters: Record<string, unknown>, resultCount: number, ipAddress: string, userAgent: string): Promise<void>;
/**
 * Log update lead action
 */
export declare function logUpdateLead(config: AdminConfig, user: AdminUser, funnelId: string, leadId: string, changes: Record<string, unknown>, ipAddress: string, userAgent: string): Promise<void>;
/**
 * Log bulk update action
 */
export declare function logBulkUpdate(config: AdminConfig, user: AdminUser, funnelId: string, leadIds: string[], changes: Record<string, unknown>, ipAddress: string, userAgent: string): Promise<void>;
/**
 * Log export creation action
 */
export declare function logCreateExport(config: AdminConfig, user: AdminUser, funnelId: string, jobId: string, format: string, filters: Record<string, unknown>, ipAddress: string, userAgent: string): Promise<void>;
/**
 * Log export download action
 */
export declare function logDownloadExport(config: AdminConfig, user: AdminUser, jobId: string, funnelId: string, ipAddress: string, userAgent: string): Promise<void>;
/**
 * Log view stats action
 */
export declare function logViewStats(config: AdminConfig, user: AdminUser, funnelId: string, ipAddress: string, userAgent: string): Promise<void>;
