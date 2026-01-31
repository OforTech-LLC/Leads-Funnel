/**
 * Billing Account CRUD
 *
 * DynamoDB access patterns:
 *   PK = BILLING#<orgId>   SK = ACCOUNT
 */
import type { BillingAccount, CreateBillingAccountInput, SubscriptionTier } from './types.js';
/**
 * Create a billing account for an org.
 */
export declare function createBillingAccount(input: CreateBillingAccountInput): Promise<BillingAccount>;
/**
 * Get the billing account for an org. Creates a free account if none exists.
 */
export declare function getBillingAccount(orgId: string): Promise<BillingAccount>;
/**
 * Upgrade (or downgrade) the subscription tier for an org.
 */
export declare function changePlan(orgId: string, newTier: SubscriptionTier): Promise<BillingAccount>;
/**
 * Get plan details including the lead limit for a given tier.
 */
export declare function getPlanDetails(tier: SubscriptionTier): {
    tier: SubscriptionTier;
    leadLimit: number;
    unlimited: boolean;
};
