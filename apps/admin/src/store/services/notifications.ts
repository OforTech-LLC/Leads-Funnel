/**
 * Notifications API Slice
 *
 * Handles both delivery notifications (email/sms/webhook) and
 * the admin notification center (bell icon alerts).
 */

import { api } from '../api';

// ---------------------------------------------------------------------------
// Delivery Notifications (existing)
// ---------------------------------------------------------------------------

export interface Notification {
  notificationId: string;
  leadId: string;
  funnelId: string;
  channel: 'email' | 'sms' | 'webhook';
  status: 'sent' | 'failed' | 'pending' | 'retrying';
  recipient: string;
  subject?: string;
  template?: string;
  sentAt: string;
  error?: string;
  retryCount: number;
}

export interface NotificationListParams {
  channel?: Notification['channel'];
  status?: Notification['status'];
  startDate?: string;
  endDate?: string;
  leadId?: string;
  page?: number;
  pageSize?: number;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  nextToken?: string;
}

// ---------------------------------------------------------------------------
// Admin Alert Notifications (Notification Center)
// ---------------------------------------------------------------------------

export interface AdminNotification {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  metadata?: Record<string, unknown>;
}

export interface AdminNotificationListParams {
  page?: number;
  limit?: number;
  type?: string;
  unreadOnly?: boolean;
}

export interface AdminNotificationListResponse {
  items: AdminNotification[];
  total: number;
  unreadCount: number;
}

// ---------------------------------------------------------------------------
// API Endpoints
// ---------------------------------------------------------------------------

export const notificationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Delivery notifications
    listDeliveryNotifications: builder.query<
      NotificationListResponse,
      NotificationListParams | void
    >({
      query: (params) => ({
        url: '/admin/notifications',
        params: params || {},
      }),
      providesTags: ['NotificationList'],
    }),

    retryNotification: builder.mutation<void, string>({
      query: (notificationId) => ({
        url: `/admin/notifications/${notificationId}/retry`,
        method: 'POST',
      }),
      invalidatesTags: ['NotificationList'],
    }),

    // Admin alert notifications (notification center)
    listNotifications: builder.query<
      AdminNotificationListResponse,
      AdminNotificationListParams | void
    >({
      query: (params) => ({
        url: '/admin/alerts',
        params: params || {},
      }),
      providesTags: ['AlertList'],
    }),

    markNotificationRead: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/alerts/${id}/read`,
        method: 'POST',
      }),
      invalidatesTags: ['AlertList'],
    }),

    markAllNotificationsRead: builder.mutation<void, void>({
      query: () => ({
        url: '/admin/alerts/read-all',
        method: 'POST',
      }),
      invalidatesTags: ['AlertList'],
    }),
  }),
});

export const {
  useListDeliveryNotificationsQuery,
  useRetryNotificationMutation,
  useListNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;

// Keep old export name for backward compatibility
export { useListDeliveryNotificationsQuery as useListNotificationsQueryLegacy };
