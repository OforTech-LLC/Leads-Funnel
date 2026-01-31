/**
 * DynamoDB operations for Assignment Rules
 *
 * Single-table access patterns:
 *   PK = RULE#<ruleId>      SK = META
 *   GSI1PK = FUNNEL#<funnelId>  GSI1SK = PRIORITY#<nn>  (rules by funnel)
 *   GSI2PK = ORG#<orgId>       GSI2SK = RULE#<ruleId>   (rules by org)
 */
export interface AssignmentRule {
    pk: string;
    sk: string;
    ruleId: string;
    funnelId: string;
    orgId: string;
    targetUserId?: string;
    name: string;
    priority: number;
    zipPatterns: string[];
    dailyCap?: number;
    monthlyCap?: number;
    isActive: boolean;
    description?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    gsi1pk: string;
    gsi1sk: string;
    gsi2pk: string;
    gsi2sk: string;
}
export interface CreateRuleInput {
    funnelId: string;
    orgId: string;
    targetUserId?: string;
    name: string;
    priority: number;
    zipPatterns: string[];
    dailyCap?: number;
    monthlyCap?: number;
    isActive?: boolean;
    description?: string;
}
export interface UpdateRuleInput {
    ruleId: string;
    funnelId?: string;
    orgId?: string;
    name?: string;
    priority?: number;
    zipPatterns?: string[];
    dailyCap?: number;
    monthlyCap?: number;
    isActive?: boolean;
    targetUserId?: string;
    description?: string;
}
export declare function createRule(input: CreateRuleInput): Promise<AssignmentRule>;
export declare function getRule(ruleId: string): Promise<AssignmentRule | null>;
export declare function updateRule(input: UpdateRuleInput): Promise<AssignmentRule>;
export declare function softDeleteRule(ruleId: string): Promise<void>;
export interface PaginatedRules {
    items: AssignmentRule[];
    nextCursor?: string;
}
export declare function listRules(funnelId?: string, cursor?: string, limit?: number): Promise<PaginatedRules>;
/**
 * Get all active rules for a funnel, sorted by priority ascending.
 * Used by assignment matcher.
 */
export declare function getRulesByFunnel(funnelId: string): Promise<AssignmentRule[]>;
