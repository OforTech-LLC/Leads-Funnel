'use client';

import React, { useEffect, useState } from 'react';
import { GlassCard, GlassSection } from '@/design-system/glass';
import { getFeatureFlags, updateFeatureFlag, type FeatureFlags } from '@/lib/admin/api';

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
        ${checked ? 'bg-indigo-600' : 'bg-gray-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        backgroundColor: checked ? 'rgba(99, 102, 241, 1)' : 'rgba(229, 231, 235, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
}

export default function AdminSettingsPage() {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadFlags();
  }, []);

  async function loadFlags() {
    try {
      setLoading(true);
      const data = await getFeatureFlags();
      setFlags(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(flag: string, enabled: boolean) {
    try {
      setUpdating(flag);
      // Optimistic update
      setFlags((prev) => (prev ? { ...prev, [flag]: enabled } : null));

      await updateFeatureFlag(flag, enabled);
    } catch (err) {
      // Revert on error
      setFlags((prev) => (prev ? { ...prev, [flag]: !enabled } : null));
      console.error('Failed to update flag:', err);
      alert('Failed to update feature flag');
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <GlassSection padding="lg">
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      </GlassSection>
    );
  }

  if (error) {
    return (
      <GlassSection padding="lg">
        <GlassCard className="border-red-500/50 bg-red-500/10 p-6 text-red-200">
          <h3 className="mb-2 text-lg font-semibold">Error</h3>
          <p>{error}</p>
          <button
            onClick={() => loadFlags()}
            className="mt-4 rounded bg-red-500/20 px-4 py-2 hover:bg-red-500/30"
          >
            Retry
          </button>
        </GlassCard>
      </GlassSection>
    );
  }

  return (
    <GlassSection padding="lg" fullWidth>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">System Settings</h1>
        <p className="mt-2 text-gray-400">
          Manage feature flags and system configuration. Changes take effect immediately but may
          take up to 60 seconds to propagate to all nodes.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {flags &&
          Object.entries(flags)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([flag, enabled]) => (
              <GlassCard key={flag} padding="md" variant="light">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 overflow-hidden">
                    <h3 className="truncate font-mono text-sm font-medium text-white" title={flag}>
                      {flag}
                    </h3>
                    <p className="mt-1 text-xs text-gray-400">{enabled ? 'Enabled' : 'Disabled'}</p>
                  </div>
                  <Toggle
                    checked={enabled}
                    onChange={(checked) => handleToggle(flag, checked)}
                    disabled={updating === flag}
                  />
                </div>
              </GlassCard>
            ))}
      </div>
    </GlassSection>
  );
}
