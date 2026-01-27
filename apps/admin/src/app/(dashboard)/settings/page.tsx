'use client';

/**
 * Settings Page
 *
 * Read-only display of feature flags and SSM configuration values.
 * RBAC: Only ADMIN can view settings.
 */

import { useEffect, useState } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorAlert from '@/components/ErrorAlert';
import RequireRole from '@/components/RequireRole';
import { useToast } from '@/components/Toast';

interface SettingsData {
  featureFlags: Record<string, boolean>;
  config: Record<string, string>;
}

function SettingsContent() {
  const toast = useToast();
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/settings', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load settings');
        const json = await res.json();
        setData(json);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load settings';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message={error} onRetry={() => window.location.reload()} />;
  }

  const featureFlags = data?.featureFlags || {};
  const config = data?.config || {};

  return (
    <>
      {/* Feature Flags */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Feature Flags</h2>
        </div>
        {Object.keys(featureFlags).length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-[var(--text-secondary)]">
            No feature flags configured.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Flag
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(featureFlags)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([key, value]) => (
                    <tr key={key} className="border-b border-[var(--border-color)]">
                      <td className="px-6 py-3 font-mono text-sm text-[var(--text-primary)]">
                        {key}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            value
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {value ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SSM Configuration */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Configuration</h2>
        </div>
        {Object.keys(config).length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-[var(--text-secondary)]">
            No configuration values available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(config)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([key, value]) => (
                    <tr key={key} className="border-b border-[var(--border-color)]">
                      <td className="px-6 py-3 font-mono text-sm text-[var(--text-primary)]">
                        {key}
                      </td>
                      <td className="px-6 py-3 text-sm text-[var(--text-secondary)] break-all">
                        {value}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Notice */}
      <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Configuration values are managed via AWS SSM Parameter Store and Terraform. To modify
          these values, update the infrastructure code and deploy.
        </p>
      </div>
    </>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Settings</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Platform configuration (read-only)
        </p>
      </div>

      <RequireRole
        roles={['ADMIN']}
        fallback={
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              You do not have permission to view settings. Admin access is required.
            </p>
          </div>
        }
      >
        <SettingsContent />
      </RequireRole>
    </div>
  );
}
