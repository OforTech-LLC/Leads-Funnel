// ──────────────────────────────────────────────
// React Query hooks for analytics dashboard
//
// All queries use a 5-minute stale time for caching.
// Date range is passed as query params for server filtering.
// ──────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { LeadStatus } from '@/lib/types';

// ── Types ────────────────────────────────────

export type DateRangePreset = 'today' | '7d' | '30d' | '90d' | 'custom';

export interface DateRange {
  preset: DateRangePreset;
  from?: string; // ISO date string
  to?: string; // ISO date string
}

export interface AnalyticsOverview {
  newLeadsToday: number;
  totalActiveLeads: number;
  wonCount: number;
  bookedCount: number;
  conversionRate: number; // percentage
  avgResponseTimeMinutes: number;
  revenue?: number;
  trends: {
    newLeadsToday: TrendInfo;
    totalActiveLeads: TrendInfo;
    wonCount: TrendInfo;
    bookedCount: TrendInfo;
    conversionRate: TrendInfo;
    avgResponseTimeMinutes: TrendInfo;
    revenue?: TrendInfo;
  };
}

export interface TrendInfo {
  direction: 'up' | 'down' | 'flat';
  percentage: number; // change percentage
  previousValue: number;
}

export interface LeadTrendPoint {
  date: string;
  received: number;
  converted: number;
}

export interface ConversionFunnelStage {
  stage: string;
  label: string;
  count: number;
  percentage: number; // percentage of total
  dropOffPercent: number; // drop-off from previous stage
}

export interface FunnelBreakdown {
  funnelId: string;
  funnelName: string;
  count: number;
}

export interface ActivityItem {
  id: string;
  type: 'lead_received' | 'status_changed' | 'note_added' | 'member_joined';
  description: string;
  performedBy: string;
  performedByName: string;
  avatarUrl?: string;
  leadId?: string;
  funnelId?: string;
  createdAt: string;
}

// ── Query keys ───────────────────────────────

export const analyticsKeys = {
  all: ['analytics'] as const,
  overview: (range: DateRange) => [...analyticsKeys.all, 'overview', range] as const,
  trends: (range: DateRange) => [...analyticsKeys.all, 'trends', range] as const,
  funnel: (range: DateRange) => [...analyticsKeys.all, 'funnel', range] as const,
  byFunnel: (range: DateRange) => [...analyticsKeys.all, 'by-funnel', range] as const,
  activity: () => [...analyticsKeys.all, 'activity'] as const,
};

// ── Helpers ──────────────────────────────────

function buildDateParams(range: DateRange): string {
  const params = new URLSearchParams();
  params.set('preset', range.preset);
  if (range.preset === 'custom') {
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
  }
  return params.toString();
}

// ── Analytics overview (KPI cards) ───────────

export function useAnalyticsOverview(dateRange: DateRange) {
  return useQuery<AnalyticsOverview>({
    queryKey: analyticsKeys.overview(dateRange),
    queryFn: () =>
      api.get<AnalyticsOverview>(`/api/v1/portal/analytics/overview?${buildDateParams(dateRange)}`),
    staleTime: 5 * 60_000,
  });
}

// ── Lead trends over time ────────────────────

export function useLeadTrends(dateRange: DateRange) {
  return useQuery<LeadTrendPoint[]>({
    queryKey: analyticsKeys.trends(dateRange),
    queryFn: async () => {
      const result = await api.get<{ data: LeadTrendPoint[] }>(
        `/api/v1/portal/analytics/trends?${buildDateParams(dateRange)}`
      );
      return result.data;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Conversion funnel stages ─────────────────

export function useConversionFunnel(dateRange: DateRange) {
  return useQuery<ConversionFunnelStage[]>({
    queryKey: analyticsKeys.funnel(dateRange),
    queryFn: async () => {
      const result = await api.get<{ data: ConversionFunnelStage[] }>(
        `/api/v1/portal/analytics/funnel?${buildDateParams(dateRange)}`
      );
      return result.data;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Leads by funnel (top 10) ─────────────────

export function useLeadsByFunnel(dateRange: DateRange) {
  return useQuery<FunnelBreakdown[]>({
    queryKey: analyticsKeys.byFunnel(dateRange),
    queryFn: async () => {
      const result = await api.get<{ data: FunnelBreakdown[] }>(
        `/api/v1/portal/analytics/by-funnel?${buildDateParams(dateRange)}`
      );
      return result.data;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Recent activity feed ─────────────────────

export function useRecentActivity() {
  return useQuery<ActivityItem[]>({
    queryKey: analyticsKeys.activity(),
    queryFn: async () => {
      const result = await api.get<{ data: ActivityItem[] }>(
        '/api/v1/portal/analytics/activity?limit=10'
      );
      return result.data;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

// ── Leads by status (for donut chart) ────────

export interface LeadsByStatus {
  status: LeadStatus;
  label: string;
  count: number;
  color: string;
}

const STATUS_CHART_COLORS: Record<string, string> = {
  new: '#3b82f6',
  contacted: '#eab308',
  qualified: '#a855f7',
  converted: '#22c55e',
  booked: '#6366f1',
  won: '#10b981',
  lost: '#ef4444',
  dnc: '#6b7280',
  quarantined: '#f97316',
};

export function getStatusChartColor(status: string): string {
  return STATUS_CHART_COLORS[status] || '#9ca3af';
}
