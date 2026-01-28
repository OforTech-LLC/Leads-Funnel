/**
 * Const enum-like object for webhook event types.
 * Use `WebhookEventEnum.LEAD_CREATED` instead of hardcoding `'lead.created'`.
 */
export const WebhookEventEnum = {
  LEAD_CREATED: 'lead.created',
  LEAD_ASSIGNED: 'lead.assigned',
  LEAD_STATUS_CHANGED: 'lead.status_changed',
  LEAD_NOTE_ADDED: 'lead.note_added',
  LEAD_UNASSIGNED: 'lead.unassigned',
  ORG_MEMBER_ADDED: 'org.member_added',
  ORG_MEMBER_REMOVED: 'org.member_removed',
} as const;

export const WEBHOOK_EVENTS = [
  'lead.created',
  'lead.assigned',
  'lead.status_changed',
  'lead.note_added',
  'lead.unassigned',
  'org.member_added',
  'org.member_removed',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

export interface WebhookConfig {
  id: string;
  orgId: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEventType;
  statusCode: number | null;
  responseTime: number | null;
  success: boolean;
  attempt: number;
  createdAt: string;
  error?: string;
}
