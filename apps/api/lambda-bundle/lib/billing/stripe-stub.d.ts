/**
 * Stripe Service Stub
 *
 * Provides a mock implementation of the Stripe billing interface.
 * When billing_enabled=false, all methods return mock data.
 * Replace with actual Stripe SDK integration when ready.
 */
import type { Invoice, SubscriptionTier } from './types.js';
export interface StripeService {
    createCustomer(orgId: string, email: string, name: string): Promise<string>;
    createSubscription(customerId: string, tier: SubscriptionTier): Promise<string>;
    cancelSubscription(subscriptionId: string): Promise<void>;
    getInvoices(customerId: string, limit?: number): Promise<Invoice[]>;
    createCheckoutSession(customerId: string, tier: SubscriptionTier, successUrl: string, cancelUrl: string): Promise<string>;
}
/**
 * Stub Stripe service that returns mock data.
 * Use this when billing_enabled flag is off or Stripe SDK is not yet integrated.
 */
export declare class StubStripeService implements StripeService {
    createCustomer(_orgId: string, _email: string, _name: string): Promise<string>;
    createSubscription(_customerId: string, _tier: SubscriptionTier): Promise<string>;
    cancelSubscription(_subscriptionId: string): Promise<void>;
    getInvoices(_customerId: string, limit?: number): Promise<Invoice[]>;
    createCheckoutSession(_customerId: string, _tier: SubscriptionTier, successUrl: string, _cancelUrl: string): Promise<string>;
}
/**
 * Get the Stripe service instance.
 * Returns the stub implementation by default.
 */
export declare function getStripeService(): StripeService;
/**
 * Override the Stripe service instance (for testing or real Stripe integration).
 */
export declare function setStripeService(service: StripeService): void;
