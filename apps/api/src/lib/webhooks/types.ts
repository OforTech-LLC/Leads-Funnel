/**
 * Webhook Infrastructure Types
 *
 * Defines the core types for webhook registrations, events,
 * and delivery tracking.
 */

// ---------------------------------------------------------------------------
// Event Types
// ---------------------------------------------------------------------------

export type WebhookEventType =
  | 'lead.created'
  | 'lead.assigned'
  | 'lead.status_changed'
  | 'lead.note_added';

// ---------------------------------------------------------------------------
// Webhook Configuration
// ---------------------------------------------------------------------------

export interface WebhookConfig {
  pk: string; // WEBHOOK#<id>
  sk: string; // CONFIG
  id: string;
  orgId: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  gsi1pk: string; // ORG#<orgId>#WEBHOOKS
  gsi1sk: string; // CREATED#<iso>
}

export interface CreateWebhookInput {
  orgId: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  active?: boolean;
}

export interface UpdateWebhookInput {
  id: string;
  url?: string;
  secret?: string;
  events?: WebhookEventType[];
  active?: boolean;
}

// ---------------------------------------------------------------------------
// Webhook Event Payload
// ---------------------------------------------------------------------------

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Delivery Tracking
// ---------------------------------------------------------------------------

export interface WebhookDelivery {
  pk: string; // WHDELIVER#<webhookId>
  sk: string; // <timestamp>
  webhookId: string;
  eventType: WebhookEventType;
  eventId: string;
  url: string;
  requestBody: string;
  responseStatus?: number;
  responseBody?: string;
  success: boolean;
  attempt: number;
  error?: string;
  deliveredAt: string;
  ttl: number;
}
