'use client';

/**
 * Admin Dashboard Page
 *
 * Overview of leads across all funnels with key metrics.
 */

import { useEffect, useState } from 'react';
import { listFunnels, getFunnelStats, type FunnelStats } from '@/lib/admin/api';

interface DashboardData {
  funnels: string[];
  stats: Record<string, FunnelStats>;
  loading: boolean;
  error: string | null;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData>({
    funnels: [],
    stats: {},
    loading: true,
    error: null,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const { funnels } = await listFunnels();
      setData((prev) => ({ ...prev, funnels, loading: false }));

      // Load stats for first 5 funnels (to avoid too many requests)
      const statsPromises = funnels.slice(0, 5).map(async (funnelId) => {
        try {
          const { stats } = await getFunnelStats(funnelId);
          return { funnelId, stats };
        } catch (error) {
          // Log individual funnel stats errors but continue with others
          console.warn(
            `[Dashboard] Failed to load stats for funnel "${funnelId}":`,
            error instanceof Error ? error.message : 'Unknown error'
          );
          return null;
        }
      });

      const results = await Promise.all(statsPromises);
      const statsMap: Record<string, FunnelStats> = {};
      for (const result of results) {
        if (result) {
          statsMap[result.funnelId] = result.stats;
        }
      }

      setData((prev) => ({ ...prev, stats: statsMap }));
    } catch (err) {
      console.error('[Dashboard] Failed to load dashboard data:', err);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load data',
      }));
    }
  }

  // Calculate totals
  const totalLeads = Object.values(data.stats).reduce((sum, s) => sum + s.totalLeads, 0);
  const totalLast24h = Object.values(data.stats).reduce((sum, s) => sum + s.last24Hours, 0);
  const totalLast7d = Object.values(data.stats).reduce((sum, s) => sum + s.last7Days, 0);
  const totalLast30d = Object.values(data.stats).reduce((sum, s) => sum + s.last30Days, 0);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Overview of your lead generation funnels</p>
      </header>

      {data.error && (
        <div className="error-banner">
          <span>{data.error}</span>
          <button onClick={loadDashboardData} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-icon blue">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-label">Total Leads</span>
            <span className="summary-value">{totalLeads.toLocaleString()}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon green">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-label">Last 24 Hours</span>
            <span className="summary-value">{totalLast24h.toLocaleString()}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon purple">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-label">Last 7 Days</span>
            <span className="summary-value">{totalLast7d.toLocaleString()}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon orange">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-label">Last 30 Days</span>
            <span className="summary-value">{totalLast30d.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Funnels Grid */}
      <section className="funnels-section">
        <h2>Active Funnels ({data.funnels.length})</h2>

        {data.loading ? (
          <div className="loading">
            <div className="loading-spinner" />
            <span>Loading funnels...</span>
          </div>
        ) : data.funnels.length === 0 && !data.error ? (
          <div className="empty-state">
            <p>No funnels found. Create your first funnel to start capturing leads.</p>
          </div>
        ) : (
          <div className="funnels-grid">
            {data.funnels.map((funnelId) => {
              const stats = data.stats[funnelId];
              return (
                <a key={funnelId} href={`/admin/leads?funnel=${funnelId}`} className="funnel-card">
                  <h3>{formatFunnelName(funnelId)}</h3>
                  {stats ? (
                    <div className="funnel-stats">
                      <div className="stat">
                        <span className="stat-value">{stats.totalLeads}</span>
                        <span className="stat-label">Total</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">{stats.last24Hours}</span>
                        <span className="stat-label">24h</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">{stats.byStatus.new || 0}</span>
                        <span className="stat-label">New</span>
                      </div>
                    </div>
                  ) : (
                    <div className="funnel-stats-loading">Loading...</div>
                  )}
                </a>
              );
            })}
          </div>
        )}
      </section>

      <style jsx>{`
        .dashboard {
          max-width: 1400px;
          margin: 0 auto;
        }

        .dashboard-header {
          margin-bottom: 32px;
        }

        .dashboard-header h1 {
          font-size: 28px;
          font-weight: 600;
          margin: 0 0 8px;
        }

        .dashboard-header p {
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          padding: 12px 16px;
          color: #ef4444;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .retry-btn {
          padding: 6px 12px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 4px;
          color: #ef4444;
          font-size: 13px;
          cursor: pointer;
        }

        .retry-btn:hover {
          background: rgba(239, 68, 68, 0.3);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .summary-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .summary-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .summary-icon.blue {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }

        .summary-icon.green {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .summary-icon.purple {
          background: rgba(139, 92, 246, 0.2);
          color: #8b5cf6;
        }

        .summary-icon.orange {
          background: rgba(249, 115, 22, 0.2);
          color: #f97316;
        }

        .summary-content {
          display: flex;
          flex-direction: column;
        }

        .summary-label {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
        }

        .summary-value {
          font-size: 24px;
          font-weight: 600;
        }

        .funnels-section h2 {
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 16px;
        }

        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: rgba(255, 255, 255, 0.6);
          padding: 40px;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: rgba(255, 255, 255, 0.5);
        }

        .funnels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }

        .funnel-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s;
        }

        .funnel-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(59, 130, 246, 0.5);
          transform: translateY(-2px);
        }

        .funnel-card h3 {
          font-size: 16px;
          font-weight: 500;
          margin: 0 0 12px;
        }

        .funnel-stats {
          display: flex;
          gap: 16px;
        }

        .stat {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 18px;
          font-weight: 600;
          color: #3b82f6;
        }

        .stat-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }

        .funnel-stats-loading {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </div>
  );
}

function formatFunnelName(funnelId: string): string {
  return funnelId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
