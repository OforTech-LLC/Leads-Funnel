'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useProfile } from '@/lib/queries/profile';
import { useDashboardMetrics } from '@/lib/queries/leads';
import {
  useAnalyticsOverview,
  useLeadTrends,
  useConversionFunnel,
  useLeadsByFunnel,
  getStatusChartColor,
  type TrendInfo,
} from '@/lib/analytics';
import { useDateRange } from '@/components/DateRangeSelector';
import DateRangeSelector from '@/components/DateRangeSelector';
import LineChart from '@/components/charts/LineChart';
import DonutChart from '@/components/charts/DonutChart';
import BarChart from '@/components/charts/BarChart';
import ConversionFunnel from '@/components/charts/ConversionFunnel';
import ActivityFeed from '@/components/ActivityFeed';
import StatusBadge from '@/components/StatusBadge';
import { MetricCardSkeleton, LeadCardSkeleton } from '@/components/LoadingSpinner';
import { STATUS_LABELS } from '@/lib/lead-status';
import type { LeadStatus } from '@/lib/types';

// ── Trend indicator component ────────────────

function TrendArrow({ trend }: { trend?: TrendInfo }) {
  if (!trend || trend.direction === 'flat') {
    return <span className="text-[10px] text-gray-400">--</span>;
  }

  const isUp = trend.direction === 'up';

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
        isUp ? 'text-green-600' : 'text-red-500'
      }`}
    >
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        {isUp ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25"
          />
        )}
      </svg>
      {trend.percentage}%
    </span>
  );
}

// ── Sparkline mini-chart ─────────────────────

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;

  const max = Math.max(...values, 1);
  const w = 60;
  const h = 20;
  const step = w / (values.length - 1);

  const points = values.map((v, i) => `${i * step},${h - (v / max) * (h - 2)}`).join(' ');

  return (
    <svg width={w} height={h} className="mt-1" role="img" aria-label="Sparkline trend">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Dashboard inner content ──────────────────

function DashboardContent() {
  const [dateRange, setDateRange] = useDateRange();

  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview(dateRange);
  const { data: trends, isLoading: trendsLoading } = useLeadTrends(dateRange);
  const { data: funnel, isLoading: funnelLoading } = useConversionFunnel(dateRange);
  const { data: byFunnel, isLoading: byFunnelLoading } = useLeadsByFunnel(dateRange);

  const firstName = profile?.firstName || 'there';

  // Prepare line chart data
  const lineChartData = useMemo(() => {
    if (!trends || trends.length === 0) return [];
    return trends.map((t) => ({
      label: new Date(t.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      values: [t.received, t.converted],
    }));
  }, [trends]);

  // Prepare donut chart data
  const donutData = useMemo(() => {
    if (!metrics?.leadsByStatus) return [];
    return (Object.entries(metrics.leadsByStatus) as [LeadStatus, number][])
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        label: STATUS_LABELS[status],
        value: count,
        color: getStatusChartColor(status),
      }));
  }, [metrics?.leadsByStatus]);

  // Prepare bar chart data
  const barChartData = useMemo(() => {
    if (!byFunnel) return [];
    return byFunnel.slice(0, 10).map((f) => ({
      label: f.funnelName,
      value: f.count,
    }));
  }, [byFunnel]);

  const isKPILoading = metricsLoading || overviewLoading;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Welcome */}
      <div className="mb-6">
        {profileLoading ? (
          <div className="skeleton h-8 w-48" />
        ) : (
          <h1 className="text-xl font-bold text-gray-900">Welcome back, {firstName}</h1>
        )}
        <p className="mt-1 text-sm text-gray-500">Here is a summary of your pipeline</p>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {isKPILoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            {/* New leads today */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                New Today
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <p className="text-2xl font-bold text-gray-900">
                  {overview?.newLeadsToday ?? metrics?.newLeadsToday ?? 0}
                </p>
                <TrendArrow trend={overview?.trends?.newLeadsToday} />
              </div>
            </div>

            {/* Total active */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Active Leads
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <p className="text-2xl font-bold text-gray-900">
                  {overview?.totalActiveLeads ?? metrics?.totalActiveLeads ?? 0}
                </p>
                <TrendArrow trend={overview?.trends?.totalActiveLeads} />
              </div>
            </div>

            {/* Won */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-green-500">Won</p>
              <div className="mt-1 flex items-baseline justify-between">
                <p className="text-2xl font-bold text-green-600">
                  {overview?.wonCount ?? metrics?.leadsByStatus?.won ?? 0}
                </p>
                <TrendArrow trend={overview?.trends?.wonCount} />
              </div>
            </div>

            {/* Booked */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-purple-500">Booked</p>
              <div className="mt-1 flex items-baseline justify-between">
                <p className="text-2xl font-bold text-purple-600">
                  {overview?.bookedCount ?? metrics?.leadsByStatus?.booked ?? 0}
                </p>
                <TrendArrow trend={overview?.trends?.bookedCount} />
              </div>
            </div>

            {/* Conversion Rate */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Conversion
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <p className="text-2xl font-bold text-gray-900">
                  {overview?.conversionRate != null
                    ? `${overview.conversionRate.toFixed(1)}%`
                    : '--'}
                </p>
                <TrendArrow trend={overview?.trends?.conversionRate} />
              </div>
            </div>

            {/* Avg Response Time */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Avg Response
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <p className="text-2xl font-bold text-gray-900">
                  {overview?.avgResponseTimeMinutes != null
                    ? overview.avgResponseTimeMinutes < 60
                      ? `${Math.round(overview.avgResponseTimeMinutes)}m`
                      : `${(overview.avgResponseTimeMinutes / 60).toFixed(1)}h`
                    : '--'}
                </p>
                <TrendArrow trend={overview?.trends?.avgResponseTimeMinutes} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Date Range Selector */}
      <div className="mb-6">
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>

      {/* Leads Over Time - Line Chart (full width) */}
      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Leads Over Time</h2>
        {trendsLoading ? (
          <div className="skeleton h-[280px] w-full rounded-lg" />
        ) : (
          <div className="relative">
            <LineChart
              data={lineChartData}
              series={[
                { name: 'Received', color: '#3b82f6' },
                { name: 'Converted', color: '#10b981' },
              ]}
              height={280}
            />
          </div>
        )}
      </div>

      {/* Two columns: Donut + Bar */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Leads by Status - Donut Chart */}
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Leads by Status</h2>
          {metricsLoading ? (
            <div className="flex justify-center py-8">
              <div className="skeleton h-[220px] w-[220px] rounded-full" />
            </div>
          ) : (
            <DonutChart data={donutData} centerLabel="Total Leads" />
          )}
        </div>

        {/* Leads by Funnel - Bar Chart */}
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Leads by Funnel (Top 10)</h2>
          {byFunnelLoading ? (
            <div className="skeleton h-[280px] w-full rounded-lg" />
          ) : (
            <BarChart data={barChartData} barColor="#6366f1" height={280} />
          )}
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Conversion Funnel</h2>
        {funnelLoading ? (
          <div className="skeleton h-[180px] w-full rounded-lg" />
        ) : funnel && funnel.length > 0 ? (
          <ConversionFunnel data={funnel} />
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-gray-400">No funnel data available</p>
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <ActivityFeed />
      </div>

      {/* Recent Leads (kept from original) */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Recent Leads</h2>
          <Link href="/leads" className="text-xs font-medium text-brand-600 hover:text-brand-700">
            View all
          </Link>
        </div>

        {metricsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <LeadCardSkeleton key={i} />
            ))}
          </div>
        ) : metrics?.recentLeads && metrics.recentLeads.length > 0 ? (
          <div className="space-y-2">
            {metrics.recentLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.funnelId}/${lead.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md active:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {lead.firstName} {lead.lastName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {lead.funnelName}
                    {lead.city && (
                      <span className="ml-2 text-gray-400">
                        {lead.city}, {lead.state}
                      </span>
                    )}
                  </p>
                </div>
                <div className="ml-3 flex-shrink-0">
                  <StatusBadge status={lead.status} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">No recent leads</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dashboard page with Suspense boundary ────

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="skeleton mb-6 h-8 w-48" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
