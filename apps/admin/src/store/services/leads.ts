/**
 * Leads API Slice
 */

import { api } from '../api';
import type { LeadStatus, PipelineStatus } from '@/lib/constants';

export interface Lead {
  leadId: string;
  funnelId: string;
  name: string;
  email: string;
  phone?: string;
  status: LeadStatus;
  pipelineStatus: PipelineStatus;
  tags: string[];
  notes: string;
  doNotContact: boolean;
  assignedOrgId?: string;
  assignedOrgName?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  zipCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadDetail extends Lead {
  message?: string;
  pageUrl?: string;
  referrer?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  ipHash?: string;
  userAgent?: string;
  auditTrail: AuditEntry[];
  notificationHistory: NotificationEntry[];
}

export interface AuditEntry {
  id: string;
  action: string;
  userId: string;
  userEmail: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface NotificationEntry {
  id: string;
  channel: 'email' | 'sms' | 'webhook';
  status: 'sent' | 'failed' | 'pending';
  recipient: string;
  sentAt: string;
  error?: string;
}

export interface QueryLeadsParams {
  funnelId?: string;
  status?: LeadStatus;
  pipelineStatus?: PipelineStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
  orgId?: string;
  userId?: string;
  zipCode?: string;
  pageSize?: number;
  nextToken?: string;
  sortField?: 'createdAt' | 'updatedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface QueryLeadsResponse {
  leads: Lead[];
  totalCount: number;
  nextToken?: string;
}

export interface UpdateLeadRequest {
  funnelId: string;
  leadId: string;
  status?: LeadStatus;
  pipelineStatus?: PipelineStatus;
  tags?: string[];
  notes?: string;
  doNotContact?: boolean;
}

export interface BulkUpdateRequest {
  funnelId: string;
  leadIds: string[];
  status?: LeadStatus;
  pipelineStatus?: PipelineStatus;
  tags?: string[];
  doNotContact?: boolean;
}

export interface ReassignLeadRequest {
  funnelId: string;
  leadId: string;
  targetOrgId: string;
  targetUserId?: string;
}

export interface FunnelStats {
  funnelId: string;
  totalLeads: number;
  byStatus: Record<LeadStatus, number>;
  byPipelineStatus: Record<PipelineStatus, number>;
  last24Hours: number;
  last7Days: number;
  last30Days: number;
}

export interface DashboardStats {
  totalLeads: number;
  activeOrgs: number;
  activeRules: number;
  unassignedLeads: number;
  recentLeads: Lead[];
  funnelStats: FunnelStats[];
}

export const leadsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    queryLeads: builder.query<QueryLeadsResponse, QueryLeadsParams>({
      query: (params) => ({
        url: '/admin/query',
        method: 'POST',
        body: params,
      }),
      providesTags: ['LeadList'],
    }),

    getLead: builder.query<LeadDetail, { funnelId: string; leadId: string }>({
      query: ({ funnelId, leadId }) => `/admin/leads/${funnelId}/${leadId}`,
      providesTags: (_result, _error, { leadId }) => [{ type: 'Lead', id: leadId }],
    }),

    updateLead: builder.mutation<Lead, UpdateLeadRequest>({
      query: (body) => ({
        url: '/admin/leads/update',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { leadId }) => ['LeadList', { type: 'Lead', id: leadId }],
    }),

    bulkUpdateLeads: builder.mutation<{ updated: number }, BulkUpdateRequest>({
      query: (body) => ({
        url: '/admin/leads/bulk-update',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['LeadList'],
    }),

    reassignLead: builder.mutation<Lead, ReassignLeadRequest>({
      query: (body) => ({
        url: '/admin/leads/reassign',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { leadId }) => ['LeadList', { type: 'Lead', id: leadId }],
    }),

    getDashboardStats: builder.query<DashboardStats, void>({
      query: () => '/admin/dashboard',
      providesTags: ['Stats'],
    }),

    getFunnelStats: builder.query<FunnelStats, string>({
      query: (funnelId) => `/admin/stats?funnelId=${funnelId}`,
      providesTags: ['Stats'],
    }),

    listFunnels: builder.query<{ funnels: string[] }, void>({
      query: () => '/admin/funnels',
      providesTags: ['Funnels'],
    }),
  }),
});

export const {
  useQueryLeadsQuery,
  useGetLeadQuery,
  useUpdateLeadMutation,
  useBulkUpdateLeadsMutation,
  useReassignLeadMutation,
  useGetDashboardStatsQuery,
  useGetFunnelStatsQuery,
  useListFunnelsQuery,
} = leadsApi;
