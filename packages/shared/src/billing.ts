export const BILLING_PLANS = {
  FREE: 'free',
  STARTER: 'starter',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

export type BillingPlan = (typeof BILLING_PLANS)[keyof typeof BILLING_PLANS];

export const PLAN_LIMITS: Record<
  BillingPlan,
  { leadsPerMonth: number; membersMax: number; price: number }
> = {
  free: { leadsPerMonth: 10, membersMax: 2, price: 0 },
  starter: { leadsPerMonth: 100, membersMax: 5, price: 49 },
  pro: { leadsPerMonth: 500, membersMax: 20, price: 149 },
  enterprise: { leadsPerMonth: Infinity, membersMax: Infinity, price: 499 },
};

export interface BillingAccount {
  orgId: string;
  plan: BillingPlan;
  status: 'active' | 'past_due' | 'cancelled';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  leadsUsed: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface UsageRecord {
  orgId: string;
  period: string; // YYYY-MM
  leadsReceived: number;
  leadsAccepted: number;
  leadsRejected: number;
}
