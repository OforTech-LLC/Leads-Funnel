/**
 * DynamoDB operations for lead storage, rate limiting, and idempotency
 */
import type { LeadRecord, NormalizedLead, SecurityAnalysis, RateLimitResult, IdempotencyResult, EnvConfig, LeadAnalysis } from '../types.js';
/**
 * Check and increment rate limit for an IP hash
 * Uses atomic counter increment with TTL and Probabilistic Sharding
 */
export declare function checkRateLimit(config: EnvConfig, ipHash: string): Promise<RateLimitResult>;
/**
 * Check idempotency and create record if not exists
 * Returns existing lead info if duplicate request
 */
export declare function checkIdempotency(config: EnvConfig, idempotencyKey: string, leadId: string, status: 'accepted' | 'quarantined'): Promise<IdempotencyResult>;
/**
 * Store a new lead record
 *
 * @param config - Environment configuration
 * @param tableName - The funnel-specific DynamoDB table name
 * @param lead - Normalized lead data
 * @param security - Security analysis results
 * @param userAgent - Client user agent string
 * @param score - Optional lead score (0-100) from the scoring engine
 */
export declare function storeLead(config: EnvConfig, tableName: string, lead: NormalizedLead, security: SecurityAnalysis, userAgent: string | undefined, score?: number, options?: {
    leadId?: string;
    status?: 'accepted' | 'quarantined';
    createdAt?: string;
    evidencePack?: import('./types/evidence.js').EvidencePack;
}): Promise<LeadRecord>;
/**
 * Update lead with AI analysis results
 */
export declare function updateLeadAnalysis(config: EnvConfig, tableName: string, leadId: string, analysis: LeadAnalysis): Promise<void>;
/**
 * Get a lead by ID
 */
export declare function getLead(config: EnvConfig, tableName: string, leadId: string): Promise<LeadRecord | null>;
