/**
 * Analytics API Slice
 *
 * RTK Query endpoints for the analytics dashboard.
 */

import { api } from './api';

export interface DateRange {
  period: 'today' | '7d' | '30d' | '90d' | 'custom';
  startDate?: string;
  endDate?: string;
}

export interface AnalyticsOverview {
  totalLeads: number;
  assignedLeads: number;
  convertedLeads: number;
  unassignedLeads: number;
  quarantinedLeads: number;
  /** Change percentages compared to previous period */
  changes: {
    totalLeads: number;
    assignedLeads: number;
    convertedLeads: number;
    unassignedLeads: number;
    quarantinedLeads: number;
  };
}

export interface AnalyticsTrend {
  date: string;
  totalLeads: number;
  assignedLeads: number;
  convertedLeads: number;
}

export interface AnalyticsTrendsResponse {
  trends: AnalyticsTrend[];
}

export interface AnalyticsFunnel {
  funnelId: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
}

export interface AnalyticsFunnelsResponse {
  funnels: AnalyticsFunnel[];
  byStatus: Record<string, number>;
}

export interface AnalyticsOrg {
  orgId: string;
  orgName: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
}

export interface AnalyticsOrgsResponse {
  orgs: AnalyticsOrg[];
  rulePerformance: {
    ruleId: string;
    ruleName: string;
    matchedLeads: number;
    conversionRate: number;
  }[];
  conversionFunnel: {
    stage: string;
    count: number;
  }[];
}

export const analyticsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAnalyticsOverview: builder.query<AnalyticsOverview, DateRange>({
      query: (params) => ({
        url: '/admin/analytics/overview',
        params: {
          period: params.period,
          startDate: params.startDate,
          endDate: params.endDate,
        },
      }),
      providesTags: ['Stats'],
    }),

    getAnalyticsTrends: builder.query<AnalyticsTrendsResponse, DateRange>({
      query: (params) => ({
        url: '/admin/analytics/trends',
        params: {
          period: params.period,
          startDate: params.startDate,
          endDate: params.endDate,
        },
      }),
      providesTags: ['Stats'],
    }),

    getAnalyticsFunnels: builder.query<AnalyticsFunnelsResponse, DateRange>({
      query: (params) => ({
        url: '/admin/analytics/funnels',
        params: {
          period: params.period,
          startDate: params.startDate,
          endDate: params.endDate,
        },
      }),
      providesTags: ['Stats', 'Funnels'],
    }),

    getAnalyticsOrgs: builder.query<AnalyticsOrgsResponse, DateRange>({
      query: (params) => ({
        url: '/admin/analytics/orgs',
        params: {
          period: params.period,
          startDate: params.startDate,
          endDate: params.endDate,
        },
      }),
      providesTags: ['Stats'],
    }),
  }),
});

export const {
  useGetAnalyticsOverviewQuery,
  useGetAnalyticsTrendsQuery,
  useGetAnalyticsFunnelsQuery,
  useGetAnalyticsOrgsQuery,
} = analyticsApi;
