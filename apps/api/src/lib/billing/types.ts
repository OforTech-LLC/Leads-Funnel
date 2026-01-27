/**
 * Billing System Types
 *
 * Behind feature flag: billing_enabled (OFF by default)
 */

// ---------------------------------------------------------------------------
// Subscription Tiers
// ---------------------------------------------------------------------------

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';

export const TIER_LIMITS: Record<SubscriptionTier, number> = {
  free: 10,
  starter: 100,
  pro: 500,
  enterprise: Infinity, // unlimited
};

// ---------------------------------------------------------------------------
// Billing Account
// ---------------------------------------------------------------------------

export interface BillingAccount {
  pk: string; // BILLING#<orgId>
  sk: string; // ACCOUNT
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

// ---------------------------------------------------------------------------
// Usage Record
// ---------------------------------------------------------------------------

export interface UsageRecord {
  pk: string; // BILLING#<orgId>
  sk: string; // USAGE#<YYYY-MM>
  orgId: string;
  yearMonth: string;
  leadsReceived: number;
  leadsAccepted: number;
  leadsRejected: number;
  updatedAt: string;
  ttl: number;
}

// ---------------------------------------------------------------------------
// Invoice
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface CreateBillingAccountInput {
  orgId: string;
  tier?: SubscriptionTier;
}

export interface UpgradePlanInput {
  orgId: string;
  newTier: SubscriptionTier;
}
