'use client';

import Link from 'next/link';
import { useDashboardMetrics } from '@/lib/queries/leads';
import { useProfile } from '@/lib/queries/profile';
import StatusBadge from '@/components/StatusBadge';
import { MetricCardSkeleton, LeadCardSkeleton } from '@/components/LoadingSpinner';
import type { LeadStatus } from '@/lib/types';

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-blue-500',
  contacted: 'bg-yellow-500',
  qualified: 'bg-purple-500',
  converted: 'bg-green-500',
  booked: 'bg-indigo-500',
  won: 'bg-emerald-500',
  lost: 'bg-red-500',
  dnc: 'bg-gray-400',
  quarantined: 'bg-orange-500',
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  converted: 'Converted',
  booked: 'Booked',
  won: 'Won',
  lost: 'Lost',
  dnc: 'DNC',
  quarantined: 'Quarantined',
};

export default function DashboardPage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();

  const firstName = profile?.firstName || 'there';

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

      {/* Metrics Cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metricsLoading ? (
          <>
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
              <p className="mt-1 text-2xl font-bold text-gray-900">{metrics?.newLeadsToday ?? 0}</p>
            </div>

            {/* Total active */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Active Leads
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {metrics?.totalActiveLeads ?? 0}
              </p>
            </div>

            {/* Won */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-green-500">Won</p>
              <p className="mt-1 text-2xl font-bold text-green-600">
                {metrics?.leadsByStatus?.won ?? 0}
              </p>
            </div>

            {/* Booked */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-purple-500">Booked</p>
              <p className="mt-1 text-2xl font-bold text-purple-600">
                {metrics?.leadsByStatus?.booked ?? 0}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Leads by Status Breakdown */}
      {!metricsLoading && metrics?.leadsByStatus && (
        <div className="mb-8 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Leads by Status</h2>

          {/* Status bar */}
          <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-gray-100">
            {(Object.entries(metrics.leadsByStatus) as [LeadStatus, number][])
              .filter(([, count]) => count > 0)
              .map(([status, count]) => {
                const total = Object.values(metrics.leadsByStatus).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div
                    key={status}
                    className={`${STATUS_COLORS[status]} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${STATUS_LABELS[status]}: ${count}`}
                  />
                );
              })}
          </div>

          {/* Status legend */}
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
            {(Object.entries(metrics.leadsByStatus) as [LeadStatus, number][]).map(
              ([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[status]}`} />
                  <span className="text-xs text-gray-600">
                    {STATUS_LABELS[status]} <span className="font-semibold">{count}</span>
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Recent Leads */}
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
