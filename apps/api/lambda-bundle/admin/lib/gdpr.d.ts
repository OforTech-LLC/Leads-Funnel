/**
 * GDPR Data Management
 *
 * Provides GDPR-compliant data operations:
 * - Delete all data for an email (Right to Erasure)
 * - Export all data for a user (Subject Access Request)
 * - Anonymize data instead of deleting (for analytics retention)
 */
import type { AdminConfig } from '../types.js';
export interface GdprDeleteResult {
    success: boolean;
    email: string;
    deletedRecords: number;
    funnelsAffected: string[];
    auditId: string;
    timestamp: string;
}
export interface GdprExportResult {
    success: boolean;
    email: string;
    exportId: string;
    data: GdprExportData;
    timestamp: string;
}
export interface GdprExportData {
    leads: ExportedLead[];
    auditLogs: ExportedAuditEntry[];
    metadata: {
        exportedAt: string;
        exportedBy: string;
        totalRecords: number;
    };
}
export interface ExportedLead {
    leadId: string;
    funnelId: string;
    name: string;
    email: string;
    phone?: string;
    notes?: string;
    status: string;
    pipelineStatus?: string;
    tags?: string[];
    createdAt: string;
    updatedAt?: string;
    utm?: Record<string, string>;
    metadata?: Record<string, unknown>;
}
export interface ExportedAuditEntry {
    action: string;
    resourceType: string;
    resourceId: string;
    timestamp: string;
    details: Record<string, unknown>;
}
export interface GdprAnonymizeResult {
    success: boolean;
    email: string;
    anonymizedRecords: number;
    funnelsAffected: string[];
    auditId: string;
    timestamp: string;
}
/**
 * Delete all data for an email address (Right to Erasure / Right to be Forgotten)
 *
 * This permanently deletes:
 * - All lead records across all funnels
 * - All audit log entries related to this email
 *
 * @param config - Admin configuration
 * @param email - Email address to delete data for
 * @param requestedBy - Email/ID of admin making the request (for audit)
 * @returns Delete result with count of deleted records
 */
export declare function deleteLeadData(config: AdminConfig, email: string, requestedBy: string): Promise<GdprDeleteResult>;
/**
 * Export all user data for GDPR Subject Access Request (SAR)
 *
 * Returns a comprehensive export of all data associated with an email:
 * - Lead records from all funnels
 * - Audit log entries
 * - Associated metadata
 *
 * @param config - Admin configuration
 * @param email - Email address to export data for
 * @param requestedBy - Email/ID of admin making the request (for audit)
 * @returns Export result containing all user data
 */
export declare function exportUserData(config: AdminConfig, email: string, requestedBy: string): Promise<GdprExportResult>;
/**
 * Anonymize lead data instead of deleting
 *
 * Useful for retaining analytics data while removing PII:
 * - Replaces name with "Anonymized User"
 * - Replaces email with anonymized identifier
 * - Clears phone, notes, and other PII fields
 * - Preserves non-PII data (status, timestamps, UTM)
 *
 * @param config - Admin configuration
 * @param email - Email address to anonymize
 * @param requestedBy - Email/ID of admin making the request (for audit)
 * @returns Anonymize result with count of affected records
 */
export declare function anonymizeLeadData(config: AdminConfig, email: string, requestedBy: string): Promise<GdprAnonymizeResult>;
/**
 * Get GDPR action history for an email
 *
 * Returns all GDPR-related actions taken for a specific email.
 *
 * @param config - Admin configuration
 * @param email - Email address to look up
 * @returns Array of GDPR action records
 */
export declare function getGdprHistory(config: AdminConfig, email: string): Promise<Array<{
    action: string;
    timestamp: string;
    details: Record<string, unknown>;
}>>;
