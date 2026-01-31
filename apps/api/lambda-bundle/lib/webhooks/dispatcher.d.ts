/**
 * Webhook Dispatcher
 *
 * Delivers webhook payloads to registered endpoints with:
 * - HMAC-SHA256 signature verification
 * - 5-second timeout
 * - Delivery attempt recording in DynamoDB
 * - Retry with exponential backoff (3 attempts: 0s, 30s, 300s)
 * - Idempotency via eventId + deliveryAttempt dedup key (Issue #8)
 */
import type { WebhookConfig, WebhookDelivery, WebhookEventType } from './types.js';
/**
 * Dispatch a webhook event to all registered endpoints that subscribe
 * to the given event type.
 *
 * @param eventType - The event type (e.g. 'lead.created')
 * @param data - The event payload data
 */
export declare function dispatchWebhookEvent(eventType: WebhookEventType, data: Record<string, unknown>): Promise<void>;
/**
 * Send a test payload to a specific webhook.
 */
export declare function sendTestWebhook(webhook: WebhookConfig): Promise<WebhookDelivery>;
