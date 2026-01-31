/**
 * DynamoDB operations for Unassigned Lead queue
 *
 * Single-table access patterns:
 *   PK = UNASSIGNED#<funnelId>  SK = <timestamp>#<leadId>
 */
export interface UnassignedEntry {
    pk: string;
    sk: string;
    funnelId: string;
    leadId: string;
    zipCode?: string;
    reason: string;
    createdAt: string;
    ttl: number;
}
export declare function addUnassigned(funnelId: string, leadId: string, reason: string, zipCode?: string): Promise<UnassignedEntry>;
export interface PaginatedUnassigned {
    items: UnassignedEntry[];
    nextCursor?: string;
}
export declare function listUnassigned(funnelId: string, cursor?: string, limit?: number): Promise<PaginatedUnassigned>;
/**
 * Remove an entry once a lead has been manually assigned.
 */
export declare function removeUnassigned(funnelId: string, sk: string): Promise<void>;
