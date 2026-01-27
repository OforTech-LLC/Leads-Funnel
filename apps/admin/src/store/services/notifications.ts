/**
 * Notifications API Slice
 */

import { api } from '../api';

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

export const notificationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listNotifications: builder.query<NotificationListResponse, NotificationListParams | void>({
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
  }),
});

export const { useListNotificationsQuery, useRetryNotificationMutation } = notificationsApi;
