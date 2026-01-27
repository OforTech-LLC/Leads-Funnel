/**
 * Webhooks API Slice
 *
 * RTK Query endpoints for webhook management.
 */

import { api } from './api';

export interface Webhook {
  id: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  statusCode: number;
  responseTimeMs: number;
  success: boolean;
  error?: string;
  timestamp: string;
  requestBody?: string;
  responseBody?: string;
}

export interface CreateWebhookRequest {
  url: string;
  events: string[];
  description?: string;
}

export interface UpdateWebhookRequest {
  id: string;
  url?: string;
  events?: string[];
  active?: boolean;
  description?: string;
}

export interface WebhookListResponse {
  webhooks: Webhook[];
  total: number;
}

export interface WebhookDeliveryListResponse {
  deliveries: WebhookDelivery[];
  total: number;
}

export const WEBHOOK_EVENTS = [
  'lead.created',
  'lead.updated',
  'lead.assigned',
  'lead.converted',
  'lead.status_changed',
  'lead.quarantined',
  'org.created',
  'org.updated',
  'user.created',
  'rule.matched',
  'export.completed',
] as const;

export const webhooksApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listWebhooks: builder.query<WebhookListResponse, void>({
      query: () => '/admin/webhooks',
      providesTags: ['WebhookList'],
    }),

    createWebhook: builder.mutation<Webhook, CreateWebhookRequest>({
      query: (body) => ({
        url: '/admin/webhooks',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['WebhookList'],
    }),

    updateWebhook: builder.mutation<Webhook, UpdateWebhookRequest>({
      query: ({ id, ...body }) => ({
        url: `/admin/webhooks/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => ['WebhookList', { type: 'Webhook', id }],
    }),

    deleteWebhook: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/webhooks/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['WebhookList'],
    }),

    testWebhook: builder.mutation<
      { statusCode: number; responseTimeMs: number; success: boolean },
      string
    >({
      query: (id) => ({
        url: `/admin/webhooks/${id}/test`,
        method: 'POST',
      }),
    }),

    listDeliveries: builder.query<
      WebhookDeliveryListResponse,
      { webhookId: string; page?: number }
    >({
      query: ({ webhookId, page }) => ({
        url: `/admin/webhooks/${webhookId}/deliveries`,
        params: { page },
      }),
      providesTags: (_result, _error, { webhookId }) => [
        { type: 'WebhookDelivery', id: webhookId },
      ],
    }),

    retryDelivery: builder.mutation<void, { webhookId: string; deliveryId: string }>({
      query: ({ webhookId, deliveryId }) => ({
        url: `/admin/webhooks/${webhookId}/deliveries/${deliveryId}/retry`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { webhookId }) => [
        { type: 'WebhookDelivery', id: webhookId },
      ],
    }),
  }),
});

export const {
  useListWebhooksQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
  useTestWebhookMutation,
  useListDeliveriesQuery,
  useRetryDeliveryMutation,
} = webhooksApi;
