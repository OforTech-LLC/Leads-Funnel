/**
 * Base RTK Query API Configuration
 *
 * Provides the foundational API slice with auth headers,
 * error handling, timeout, and cache tag types.
 *
 * Consistent patterns with apps/web and apps/portal API clients:
 * - Request timeouts (30s)
 * - httpOnly cookie auth via credentials: 'include'
 * - 401 redirect to /login
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: 'include', // httpOnly cookie auth
    timeout: REQUEST_TIMEOUT_MS,
    prepareHeaders: (headers) => {
      // The httpOnly cookie is sent automatically via credentials: 'include'.
      // For API Gateway requests that need Bearer tokens, we read the cookie
      // server-side or use the token from the cookie.
      headers.set('Content-Type', 'application/json');
      headers.set('Accept', 'application/json');
      return headers;
    },
    responseHandler: async (response) => {
      // Handle 401 by redirecting to login
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
      return response.json();
    },
  }),
  tagTypes: [
    'Org',
    'OrgList',
    'User',
    'UserList',
    'Rule',
    'RuleList',
    'Lead',
    'LeadList',
    'Notification',
    'NotificationList',
    'AlertList',
    'Export',
    'ExportList',
    'ExportSchedule',
    'Stats',
    'Funnels',
    'Settings',
    'Webhook',
    'WebhookList',
    'WebhookDelivery',
  ],
  endpoints: () => ({}),
});
