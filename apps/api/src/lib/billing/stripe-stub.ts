/**
 * Stripe Service Stub
 *
 * Provides a mock implementation of the Stripe billing interface.
 * When billing_enabled=false, all methods return mock data.
 * Replace with actual Stripe SDK integration when ready.
 */

import type { Invoice, SubscriptionTier } from './types.js';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface StripeService {
  createCustomer(orgId: string, email: string, name: string): Promise<string>;
  createSubscription(customerId: string, tier: SubscriptionTier): Promise<string>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  getInvoices(customerId: string, limit?: number): Promise<Invoice[]>;
  createCheckoutSession(
    customerId: string,
    tier: SubscriptionTier,
    successUrl: string,
    cancelUrl: string
  ): Promise<string>;
}

// ---------------------------------------------------------------------------
// Stub Implementation
// ---------------------------------------------------------------------------

/**
 * Stub Stripe service that returns mock data.
 * Use this when billing_enabled flag is off or Stripe SDK is not yet integrated.
 */
export class StubStripeService implements StripeService {
  async createCustomer(_orgId: string, _email: string, _name: string): Promise<string> {
    return `cus_stub_${Date.now()}`;
  }

  async createSubscription(_customerId: string, _tier: SubscriptionTier): Promise<string> {
    return `sub_stub_${Date.now()}`;
  }

  async cancelSubscription(_subscriptionId: string): Promise<void> {
    // No-op in stub
  }

  async getInvoices(_customerId: string, limit = 10): Promise<Invoice[]> {
    // Return empty invoices in stub mode
    return [];
  }

  async createCheckoutSession(
    _customerId: string,
    _tier: SubscriptionTier,
    successUrl: string,
    _cancelUrl: string
  ): Promise<string> {
    // Return a stub URL - in production, this would be a Stripe checkout URL
    return `${successUrl}?session=stub_session_${Date.now()}`;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _stripeService: StripeService | null = null;

/**
 * Get the Stripe service instance.
 * Returns the stub implementation by default.
 */
export function getStripeService(): StripeService {
  if (!_stripeService) {
    _stripeService = new StubStripeService();
  }
  return _stripeService;
}

/**
 * Override the Stripe service instance (for testing or real Stripe integration).
 */
export function setStripeService(service: StripeService): void {
  _stripeService = service;
}
