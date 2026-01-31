/**
 * Admin Lead Operations
 *
 * DynamoDB operations for querying and updating leads.
 */
import type { AdminConfig, Lead, QueryLeadsRequest, QueryLeadsResponse, UpdateLeadRequest, BulkUpdateRequest, FunnelStats } from '../types.js';
/**
 * Query leads with filters and pagination
 */
export declare function queryLeads(config: AdminConfig, request: QueryLeadsRequest): Promise<QueryLeadsResponse>;
/**
 * Get a single lead by ID
 */
export declare function getLead(config: AdminConfig, funnelId: string, leadId: string): Promise<Lead | null>;
/**
 * Update a single lead
 */
export declare function updateLead(config: AdminConfig, request: UpdateLeadRequest): Promise<Lead>;
/**
 * Bulk update multiple leads
 */
export declare function bulkUpdateLeads(config: AdminConfig, request: BulkUpdateRequest): Promise<{
    updated: number;
    failed: number;
}>;
/**
 * Get funnel statistics with scan limits and pagination
 */
export declare function getFunnelStats(config: AdminConfig, funnelId: string): Promise<FunnelStats>;
/**
 * List available funnels (tables)
 *
 * Note: ListTables requires the low-level DynamoDB client, not the
 * Document client. We create a temporary client here since this is
 * an infrequent admin-only operation.
 */
export declare function listFunnels(config: AdminConfig): Promise<string[]>;
