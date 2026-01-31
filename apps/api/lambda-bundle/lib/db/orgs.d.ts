/**
 * DynamoDB operations for Organisations
 *
 * Single-table access patterns:
 *   PK = ORG#<orgId>   SK = META
 *   GSI1PK = ORGS      GSI1SK = CREATED#<iso>  (for paginated list)
 */
export interface Org {
    pk: string;
    sk: string;
    orgId: string;
    name: string;
    nameLower?: string;
    slug: string;
    contactEmail: string;
    phone?: string;
    timezone: string;
    notifyEmails: string[];
    notifySms: string[];
    settings: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    gsi1pk: string;
    gsi1sk: string;
}
export interface CreateOrgInput {
    name: string;
    slug: string;
    contactEmail: string;
    phone?: string;
    timezone?: string;
    notifyEmails?: string[];
    notifySms?: string[];
    settings?: Record<string, unknown>;
}
export interface UpdateOrgInput {
    orgId: string;
    name?: string;
    slug?: string;
    contactEmail?: string;
    phone?: string;
    timezone?: string;
    notifyEmails?: string[];
    notifySms?: string[];
    settings?: Record<string, unknown>;
}
export declare function createOrg(input: CreateOrgInput): Promise<Org>;
export declare function getOrg(orgId: string): Promise<Org | null>;
export declare function updateOrg(input: UpdateOrgInput): Promise<Org>;
export declare function softDeleteOrg(orgId: string): Promise<void>;
export interface PaginatedOrgs {
    items: Org[];
    nextCursor?: string;
}
export declare function listOrgs(cursor?: string, limit?: number, search?: string): Promise<PaginatedOrgs>;
