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
