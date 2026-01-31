/**
 * Webhook Registry - CRUD for webhook registrations
 *
 * DynamoDB access patterns:
 *   PK = WEBHOOK#<id>            SK = CONFIG
 *   GSI1PK = ORG#<orgId>#WEBHOOKS  GSI1SK = CREATED#<iso>
 */
import type { WebhookConfig, CreateWebhookInput, UpdateWebhookInput } from './types.js';
/**
 * Register a new webhook.
 */
export declare function createWebhook(input: CreateWebhookInput): Promise<WebhookConfig>;
/**
 * Get a single webhook by ID.
 */
export declare function getWebhook(id: string): Promise<WebhookConfig | null>;
/**
 * Update an existing webhook.
 */
export declare function updateWebhook(input: UpdateWebhookInput): Promise<WebhookConfig>;
/**
 * Delete a webhook permanently.
 */
export declare function deleteWebhook(id: string): Promise<void>;
/**
 * List all webhooks for an org.
 */
export interface PaginatedWebhooks {
    items: WebhookConfig[];
    nextCursor?: string;
}
export declare function listWebhooksByOrg(orgId: string, cursor?: string, limit?: number): Promise<PaginatedWebhooks>;
/**
 * Find all active webhooks across all orgs that subscribe to a given event type.
 * Used by the dispatcher to fan out events.
 *
 * NOTE: In a production system with high webhook volume, consider maintaining
 * a GSI keyed by event type. For now we scan active webhooks and filter.
 */
export declare function findWebhooksForEvent(eventType: string): Promise<WebhookConfig[]>;
