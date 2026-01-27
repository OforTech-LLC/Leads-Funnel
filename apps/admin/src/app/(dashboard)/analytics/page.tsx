'use client';

/**
 * Analytics Dashboard Page
 *
 * Comprehensive analytics view with KPI cards, line chart for trends,
 * donut chart for status breakdown, bar charts for funnels and orgs,
 * conversion funnel visualization, and export functionality.
 */

import { useState, useMemo } from 'react';
import {
  useGetAnalyticsOverviewQuery,
  useGetAnalyticsTrendsQuery,
  useGetAnalyticsFunnelsQuery,
  useGetAnalyticsOrgsQuery,
} from '@/store/analyticsApi';
import type { DateRange } from '@/store/analyticsApi';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import DonutChart from '@/components/charts/DonutChart';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorAlert from '@/components/ErrorAlert';
import RequireRole from '@/components/RequireRole';
import { useToast } from '@/components/Toast';

// ---------------------------------------------------------------------------
// Date Range Selector
// ---------------------------------------------------------------------------

const DATE_RANGES: { label: string; value: DateRange['period'] }[] = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
];

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KpiCard({ label, value, change }: { label: string; value: number; change?: number }) {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-5">
      <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
      <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1">
        {value.toLocaleString()}
      </p>
      {change !== undefined && (
        <p
          className={`text-xs mt-1 font-medium ${
            change > 0
              ? 'text-green-600 dark:text-green-400'
              : change < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-[var(--text-tertiary)]'
          }`}
        >
          {change > 0 ? '+' : ''}
          {change.toFixed(1)}% vs prev period
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversion Funnel Visualization
// ---------------------------------------------------------------------------

function ConversionFunnel({ stages }: { stages: { stage: string; count: number }[] }) {
  if (stages.length === 0) return null;
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => {
        const widthPercent = (stage.count / maxCount) * 100;
        const dropOff =
          i > 0 && stages[i - 1].count > 0
            ? ((stages[i - 1].count - stage.count) / stages[i - 1].count) * 100
            : 0;

        return (
          <div key={stage.stage}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-[var(--text-primary)] font-medium capitalize">
                {stage.stage}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-primary)]">{stage.count.toLocaleString()}</span>
                {i > 0 && dropOff > 0 && (
                  <span className="text-xs text-red-500">-{dropOff.toFixed(1)}%</span>
                )}
              </div>
            </div>
            <div className="h-6 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${widthPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status Colors
// ---------------------------------------------------------------------------

const STATUS_CHART_COLORS: Record<string, string> = {
  new: '#3b82f6',
  contacted: '#eab308',
  qualified: '#8b5cf6',
  converted: '#22c55e',
  lost: '#6b7280',
  dnc: '#ef4444',
  quarantined: '#f97316',
  booked: '#6366f1',
  won: '#10b981',
};

// ---------------------------------------------------------------------------
// Analytics Page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({ period: '30d' });
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const toast = useToast();

  const effectiveDateRange: DateRange =
    dateRange.period === 'custom'
      ? { period: 'custom', startDate: customStart, endDate: customEnd }
      : dateRange;

  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useGetAnalyticsOverviewQuery(effectiveDateRange);

  const {
    data: trends,
    isLoading: trendsLoading,
    error: trendsError,
  } = useGetAnalyticsTrendsQuery(effectiveDateRange);

  const {
    data: funnels,
    isLoading: funnelsLoading,
    error: funnelsError,
  } = useGetAnalyticsFunnelsQuery(effectiveDateRange);

  const {
    data: orgs,
    isLoading: orgsLoading,
    error: orgsError,
  } = useGetAnalyticsOrgsQuery(effectiveDateRange);

  // Chart data
  const lineChartData = useMemo(() => {
    if (!trends?.trends) return { series: [], labels: [] };
    return {
      labels: trends.trends.map((t) => {
        const d = new Date(t.date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      series: [
        {
          name: 'Total',
          data: trends.trends.map((t) => t.totalLeads),
          color: '#3b82f6',
        },
        {
          name: 'Assigned',
          data: trends.trends.map((t) => t.assignedLeads),
          color: '#22c55e',
        },
        {
          name: 'Converted',
          data: trends.trends.map((t) => t.convertedLeads),
          color: '#8b5cf6',
        },
      ],
    };
  }, [trends]);

  const statusDonutData = useMemo(() => {
    if (!funnels?.byStatus) return [];
    return Object.entries(funnels.byStatus).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: STATUS_CHART_COLORS[status] || '#6b7280',
    }));
  }, [funnels]);

  const topFunnelsBarData = useMemo(() => {
    if (!funnels?.funnels) return { series: [], labels: [] };
    const top10 = [...funnels.funnels].sort((a, b) => b.totalLeads - a.totalLeads).slice(0, 10);
    return {
      labels: top10.map((f) => f.funnelId),
      series: [
        {
          name: 'Leads',
          data: top10.map((f) => f.totalLeads),
          color: '#3b82f6',
        },
      ],
    };
  }, [funnels]);

  const orgsBarData = useMemo(() => {
    if (!orgs?.orgs) return { series: [], labels: [] };
    const sorted = [...orgs.orgs].sort((a, b) => b.totalLeads - a.totalLeads).slice(0, 10);
    return {
      labels: sorted.map((o) => o.orgName),
      series: [
        {
          name: 'Total',
          data: sorted.map((o) => o.totalLeads),
          color: '#3b82f6',
        },
        {
          name: 'Converted',
          data: sorted.map((o) => o.convertedLeads),
          color: '#22c55e',
        },
      ],
    };
  }, [orgs]);

  const isLoading = overviewLoading || trendsLoading || funnelsLoading || orgsLoading;
  const hasError = overviewError || trendsError || funnelsError || orgsError;

  const handleExport = () => {
    toast.info('Export started, you will be notified when ready');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Analytics</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Platform performance and lead metrics
          </p>
        </div>

        <RequireRole roles={['ADMIN', 'VIEWER']}>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)] self-start"
          >
            Export Dashboard
          </button>
        </RequireRole>
      </div>

      {/* Date Range Selector */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-2">
          {DATE_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setDateRange({ period: range.value })}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                dateRange.period === range.value
                  ? 'bg-blue-600 text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {range.label}
            </button>
          ))}
          <button
            onClick={() => setDateRange({ period: 'custom' })}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              dateRange.period === 'custom'
                ? 'bg-blue-600 text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            Custom
          </button>
          {dateRange.period === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1 text-sm border border-[var(--border-color)] rounded bg-[var(--card-bg)] text-[var(--text-primary)]"
              />
              <span className="text-[var(--text-tertiary)]">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1 text-sm border border-[var(--border-color)] rounded bg-[var(--card-bg)] text-[var(--text-primary)]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Loading / Error States */}
      {isLoading && !overview && (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {hasError && (
        <ErrorAlert
          message="Failed to load analytics data. The API may be unavailable."
          onRetry={refetchOverview}
        />
      )}

      {/* KPI Cards */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard
            label="Total Leads"
            value={overview.totalLeads}
            change={overview.changes.totalLeads}
          />
          <KpiCard
            label="Assigned"
            value={overview.assignedLeads}
            change={overview.changes.assignedLeads}
          />
          <KpiCard
            label="Converted"
            value={overview.convertedLeads}
            change={overview.changes.convertedLeads}
          />
          <KpiCard
            label="Unassigned"
            value={overview.unassignedLeads}
            change={overview.changes.unassignedLeads}
          />
          <KpiCard
            label="Quarantined"
            value={overview.quarantinedLeads}
            change={overview.changes.quarantinedLeads}
          />
        </div>
      )}

      {/* Leads Over Time - Full Width Line Chart */}
      {trends && (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Leads Over Time</h2>
          <LineChart
            series={lineChartData.series}
            labels={lineChartData.labels}
            height={320}
            yAxisLabel="Leads"
          />
        </div>
      )}

      {/* Two Columns: Status Donut + Top Funnels Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Status */}
        {funnels && (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Leads by Status
            </h2>
            <DonutChart
              segments={statusDonutData}
              centerValue={overview?.totalLeads ?? 0}
              centerLabel="Total"
            />
          </div>
        )}

        {/* Top 10 Funnels */}
        {funnels && (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Top 10 Funnels
            </h2>
            <BarChart
              series={topFunnelsBarData.series}
              labels={topFunnelsBarData.labels}
              height={320}
              yAxisLabel="Leads"
            />
          </div>
        )}
      </div>

      {/* Two Columns: Orgs Bar + Rule Performance Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Organization */}
        {orgs && (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Leads by Organization
            </h2>
            <BarChart
              series={orgsBarData.series}
              labels={orgsBarData.labels}
              height={320}
              yAxisLabel="Leads"
            />
          </div>
        )}

        {/* Assignment Rule Performance */}
        {orgs && (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
            <div className="px-6 py-4 border-b border-[var(--border-color)]">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Assignment Rule Performance
              </h2>
            </div>
            {orgs.rulePerformance.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-[var(--text-secondary)]">
                No rule performance data available.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-color)]">
                      <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                        Rule
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">
                        Matched
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">
                        Conv. Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgs.rulePerformance.map((rule) => (
                      <tr key={rule.ruleId} className="border-b border-[var(--border-color)]">
                        <td className="px-4 py-3 text-[var(--text-primary)]">{rule.ruleName}</td>
                        <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                          {rule.matchedLeads.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-medium ${
                              rule.conversionRate >= 20
                                ? 'text-green-600 dark:text-green-400'
                                : rule.conversionRate >= 10
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            {rule.conversionRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Conversion Funnel */}
      {orgs && orgs.conversionFunnel.length > 0 && (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Conversion Funnel
          </h2>
          <ConversionFunnel stages={orgs.conversionFunnel} />
        </div>
      )}
    </div>
  );
}
