/**
 * Webhook Infrastructure Types
 *
 * Defines the core types for webhook registrations, events,
 * and delivery tracking.
 */
export type WebhookEventType = 'lead.created' | 'lead.assigned' | 'lead.status_changed' | 'lead.note_added';
export interface WebhookConfig {
    pk: string;
    sk: string;
    id: string;
    orgId: string;
    url: string;
    secret: string;
    events: WebhookEventType[];
    active: boolean;
    createdAt: string;
    updatedAt: string;
    gsi1pk: string;
    gsi1sk: string;
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
export interface WebhookEvent {
    id: string;
    type: WebhookEventType;
    timestamp: string;
    data: Record<string, unknown>;
}
export interface WebhookDelivery {
    pk: string;
    sk: string;
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
