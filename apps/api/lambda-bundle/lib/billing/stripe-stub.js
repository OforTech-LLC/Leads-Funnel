/**
 * Stripe Service Stub
 *
 * Provides a mock implementation of the Stripe billing interface.
 * When billing_enabled=false, all methods return mock data.
 * Replace with actual Stripe SDK integration when ready.
 */
// ---------------------------------------------------------------------------
// Stub Implementation
// ---------------------------------------------------------------------------
/**
 * Stub Stripe service that returns mock data.
 * Use this when billing_enabled flag is off or Stripe SDK is not yet integrated.
 */
export class StubStripeService {
    async createCustomer(_orgId, _email, _name) {
        return `cus_stub_${Date.now()}`;
    }
    async createSubscription(_customerId, _tier) {
        return `sub_stub_${Date.now()}`;
    }
    async cancelSubscription(_subscriptionId) {
        // No-op in stub
    }
    async getInvoices(_customerId, limit = 10) {
        // Return empty invoices in stub mode
        return [];
    }
    async createCheckoutSession(_customerId, _tier, successUrl, _cancelUrl) {
        // Return a stub URL - in production, this would be a Stripe checkout URL
        return `${successUrl}?session=stub_session_${Date.now()}`;
    }
}
// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------
let _stripeService = null;
/**
 * Get the Stripe service instance.
 * Returns the stub implementation by default.
 */
export function getStripeService() {
    if (!_stripeService) {
        _stripeService = new StubStripeService();
    }
    return _stripeService;
}
/**
 * Override the Stripe service instance (for testing or real Stripe integration).
 */
export function setStripeService(service) {
    _stripeService = service;
}
//# sourceMappingURL=stripe-stub.js.map