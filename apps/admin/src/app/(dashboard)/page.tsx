'use client';

/**
 * Dashboard Page
 *
 * Overview metrics, recent leads, and quick actions.
 */

import { useGetDashboardStatsQuery } from '@/store/services/leads';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorAlert from '@/components/ErrorAlert';
import StatusBadge from '@/components/StatusBadge';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Metric Card
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  subtitle,
  href,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  href?: string;
}) {
  const content = (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6">
      <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
      <p className="text-3xl font-semibold text-[var(--text-primary)] mt-2">{value}</p>
      {subtitle && <p className="text-xs text-[var(--text-tertiary)] mt-1">{subtitle}</p>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }
  return content;
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useGetDashboardStatsQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorAlert
        message="Failed to load dashboard data. The API may be unavailable."
        onRetry={refetch}
      />
    );
  }

  const stats = data || {
    totalLeads: 0,
    activeOrgs: 0,
    activeRules: 0,
    unassignedLeads: 0,
    recentLeads: [],
    funnelStats: [],
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Overview of the Leads Funnel platform
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Leads"
          value={stats.totalLeads.toLocaleString()}
          subtitle="Across all funnels"
          href="/leads"
        />
        <MetricCard label="Active Organizations" value={stats.activeOrgs} href="/orgs" />
        <MetricCard label="Active Rules" value={stats.activeRules} href="/rules" />
        <MetricCard
          label="Unassigned Leads"
          value={stats.unassignedLeads.toLocaleString()}
          subtitle="Require attention"
          href="/leads"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/leads"
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Search Leads
          </Link>
          <Link
            href="/rules/test"
            className="px-4 py-2 text-sm font-medium border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
          >
            Test Rules
          </Link>
          <Link
            href="/exports"
            className="px-4 py-2 text-sm font-medium border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
          >
            Export Data
          </Link>
          <Link
            href="/orgs"
            className="px-4 py-2 text-sm font-medium border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
          >
            Manage Organizations
          </Link>
        </div>
      </div>

      {/* Recent Leads */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recent Leads</h2>
          <Link
            href="/leads"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            View all
          </Link>
        </div>
        {stats.recentLeads.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-[var(--text-secondary)]">
            No leads yet. Leads will appear here as they come in.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Funnel
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.recentLeads.map((lead) => (
                  <tr
                    key={lead.leadId}
                    className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <td className="px-6 py-3">
                      <Link
                        href={`/leads/${lead.funnelId}/${lead.leadId}`}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                      >
                        {lead.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-[var(--text-secondary)]">{lead.email}</td>
                    <td className="px-6 py-3 text-[var(--text-secondary)]">{lead.funnelId}</td>
                    <td className="px-6 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-6 py-3 text-[var(--text-tertiary)]">
                      {formatRelativeTime(lead.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
