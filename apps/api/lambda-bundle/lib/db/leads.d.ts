/**
 * DynamoDB operations for Leads (platform-wide)
 *
 * Single-table access patterns:
 *   PK = LEAD#<funnelId>#<leadId>   SK = META
 *   GSI1PK = FUNNEL#<funnelId>      GSI1SK = CREATED#<iso>  (leads by funnel)
 *   GSI2PK = ORG#<orgId>            GSI2SK = CREATED#<iso>  (leads by org)
 *   GSI3PK = STATUS#<funnelId>#<s>  GSI3SK = CREATED#<iso>  (leads by status)
 */
import type { EvidencePack } from '../types/evidence.js';
export type LeadStatus = 'new' | 'assigned' | 'unassigned' | 'contacted' | 'qualified' | 'booked' | 'converted' | 'won' | 'lost' | 'dnc' | 'quarantined';
export interface PlatformLead {
    pk: string;
    sk: string;
    leadId: string;
    funnelId: string;
    orgId?: string;
    assignedUserId?: string;
    ruleId?: string;
    name: string;
    email: string;
    phone?: string;
    zipCode?: string;
    message?: string;
    status: LeadStatus;
    notes: string[];
    tags: string[];
    pageUrl?: string;
    referrer?: string;
    utm?: Record<string, string>;
    ipHash: string;
    userAgent?: string;
    assignedAt?: string;
    notifiedAt?: string;
    createdAt: string;
    updatedAt: string;
    score?: number;
    evidencePack?: EvidencePack;
    gsi1pk: string;
    gsi1sk: string;
    gsi2pk?: string;
    gsi2sk?: string;
    gsi3pk: string;
    gsi3sk: string;
}
export interface CreateLeadInput {
    funnelId: string;
    email: string;
    name?: string;
    phone?: string;
    zipCode?: string;
    message?: string;
    source?: string;
    pageUrl?: string;
    referrer?: string;
    utm?: Record<string, string>;
    status?: LeadStatus;
}
export interface IngestLeadInput {
    leadId: string;
    funnelId: string;
    email: string;
    name?: string;
    phone?: string;
    zipCode?: string;
    message?: string;
    pageUrl?: string;
    referrer?: string;
    utm?: Record<string, string>;
    status?: LeadStatus;
    ipHash: string;
    userAgent?: string;
    score?: number;
    evidencePack?: EvidencePack;
    createdAt?: string;
}
export interface UpdateLeadInput {
    funnelId: string;
    leadId: string;
    status?: LeadStatus;
    orgId?: string;
    assignedUserId?: string;
    ruleId?: string;
    notes?: string[];
    tags?: string[];
    assignedAt?: string;
    notifiedAt?: string;
    /**
     * When true, skips status transition validation.
     * Use for admin overrides only.
     */
    force?: boolean;
}
export interface QueryLeadsInput {
    funnelId?: string;
    orgId?: string;
    status?: LeadStatus;
    startDate?: string;
    endDate?: string;
    cursor?: string;
    limit?: number;
    assignedUserId?: string;
}
export interface PaginatedLeads {
    items: PlatformLead[];
    nextCursor?: string;
}
/**
 * Validate that a status transition is allowed by the state machine.
 *
 * @param from - Current lead status
 * @param to   - Desired new status
 * @returns true if the transition is valid
 */
export declare function validateStatusTransition(from: LeadStatus, to: LeadStatus): boolean;
/**
 * Create a new lead record in DynamoDB.
 *
 * Used by the admin bulk-import feature. Generates a UUID for the leadId,
 * hashes the email for the ipHash field, and sets up all GSI projections.
 *
 * @param input - Lead creation input
 * @returns The created PlatformLead record
 */
export declare function createLead(input: CreateLeadInput): Promise<PlatformLead>;
/**
 * Ingest a lead from the public capture pipeline into the platform table.
 *
 * Uses the provided leadId so downstream systems can correlate the record
 * with capture-time logs and idempotency keys.
 */
export declare function ingestLead(input: IngestLeadInput, tableOverride?: string): Promise<PlatformLead>;
export declare function getLead(funnelId: string, leadId: string): Promise<PlatformLead | null>;
export declare function updateLead(input: UpdateLeadInput): Promise<PlatformLead>;
/**
 * Conditionally assign a lead (idempotent).
 * Only succeeds if lead status is still 'new'.
 */
export declare function assignLead(funnelId: string, leadId: string, orgId: string, ruleId: string, options?: {
    assignedUserId?: string;
}): Promise<PlatformLead | null>;
/**
 * Mark a lead as unassigned (no matching rule).
 */
export declare function markUnassigned(funnelId: string, leadId: string): Promise<PlatformLead | null>;
/**
 * Reassign a lead to a different org.
 */
export declare function reassignLead(funnelId: string, leadId: string, newOrgId: string, newRuleId?: string): Promise<PlatformLead>;
/**
 * Query leads across funnels / orgs with cursor pagination.
 */
export declare function queryLeads(input: QueryLeadsInput): Promise<PaginatedLeads>;
