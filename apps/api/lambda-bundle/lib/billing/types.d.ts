/**
 * Billing System Types
 *
 * Behind feature flag: billing_enabled (OFF by default)
 */
export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';
export declare const TIER_LIMITS: Record<SubscriptionTier, number>;
export interface BillingAccount {
    pk: string;
    sk: string;
    orgId: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    createdAt: string;
    updatedAt: string;
}
export interface UsageRecord {
    pk: string;
    sk: string;
    orgId: string;
    yearMonth: string;
    leadsReceived: number;
    leadsAccepted: number;
    leadsRejected: number;
    updatedAt: string;
    ttl: number;
}
export interface Invoice {
    id: string;
    orgId: string;
    amount: number;
    currency: string;
    status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
    periodStart: string;
    periodEnd: string;
    pdfUrl?: string;
    createdAt: string;
}
export interface CreateBillingAccountInput {
    orgId: string;
    tier?: SubscriptionTier;
}
export interface UpgradePlanInput {
    orgId: string;
    newTier: SubscriptionTier;
}
