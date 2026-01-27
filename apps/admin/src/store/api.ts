/**
 * Base RTK Query API Configuration
 *
 * Provides the foundational API slice with auth headers,
 * error handling, and cache tag types.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: 'include',
    prepareHeaders: (headers) => {
      // The httpOnly cookie is sent automatically via credentials: 'include'.
      // For API Gateway requests that need Bearer tokens, we read the cookie
      // server-side or use the token from the cookie.
      headers.set('Content-Type', 'application/json');
      return headers;
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
    'Export',
    'ExportList',
    'Stats',
    'Funnels',
    'Settings',
  ],
  endpoints: () => ({}),
});
