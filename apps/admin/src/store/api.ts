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
import { getApiBaseUrl } from '@/lib/runtime-config';
import { STORAGE_KEYS } from '@/lib/constants';

const API_BASE_URL = getApiBaseUrl();
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: 'include', // httpOnly cookie auth
    timeout: REQUEST_TIMEOUT_MS,
    prepareHeaders: (headers) => {
      // The httpOnly cookie is sent automatically via credentials: 'include'.
      // Admin routes accept bearer tokens or cookies; attach bearer if available.
      // We keep a short-lived access token in sessionStorage when present.
      if (typeof window !== 'undefined') {
        const token = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      }
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

      if (response.status === 204) {
        return null;
      }

      const json = await response.json().catch(() => null);
      if (json?.ok === false || json?.success === false) {
        throw new Error(json?.error?.message || json?.message || 'Request failed');
      }

      return json?.data ?? json;
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
