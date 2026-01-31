/**
 * Billing Metering - Track lead consumption per org
 *
 * DynamoDB access patterns:
 *   PK = BILLING#<orgId>   SK = USAGE#<YYYY-MM>
 *
 * Uses atomic increment for concurrent-safe counters.
 */
import type { UsageRecord } from './types.js';
/**
 * Atomically increment the lead counter for an org in the current month.
 *
 * @param orgId - Organization ID
 * @param field - Which counter to increment
 */
export declare function incrementUsage(orgId: string, field: 'leadsReceived' | 'leadsAccepted' | 'leadsRejected'): Promise<void>;
/**
 * Get the current month's usage for an org.
 */
export declare function getCurrentUsage(orgId: string): Promise<UsageRecord | null>;
/**
 * Check if an org is over its lead limit for the current billing period.
 *
 * @param orgId - Organization ID
 * @returns true if org is OVER limit and should be skipped
 */
export declare function isOverLimit(orgId: string): Promise<boolean>;
