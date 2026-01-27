'use client';

/**
 * Rule Tester Page
 *
 * Test assignment rules by simulating a lead with a funnel and zip code.
 */

import { useState } from 'react';
import { useTestRuleMutation } from '@/store/services/rules';
import { useListFunnelsQuery } from '@/store/services/leads';
import FormField from '@/components/FormField';
import StatusBadge from '@/components/StatusBadge';
import ErrorAlert from '@/components/ErrorAlert';
import Link from 'next/link';

export default function RuleTestPage() {
  const [funnelId, setFunnelId] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [testRule, { data: result, isLoading, error }] = useTestRuleMutation();
  const { data: funnelsData } = useListFunnelsQuery();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (funnelId && zipCode) {
      testRule({ funnelId, zipCode });
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-2">
          <Link href="/rules" className="hover:text-[var(--text-primary)]">
            Rules
          </Link>
          <span>/</span>
          <span className="text-[var(--text-primary)]">Test</span>
        </div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Rule Tester</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Simulate a lead to see which assignment rule would match
        </p>
      </div>

      {/* Test Form */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Funnel"
              name="funnelId"
              type="select"
              value={funnelId}
              onChange={setFunnelId}
              required
              options={funnelsData?.funnels.map((f) => ({ value: f, label: f })) || []}
            />
            <FormField
              label="Zip Code"
              name="zipCode"
              value={zipCode}
              onChange={setZipCode}
              required
              placeholder="Enter zip code"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !funnelId || !zipCode}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Testing...' : 'Test Assignment'}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && <ErrorAlert message="Failed to test rules. Please try again." />}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Matched Rule */}
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Result</h2>
            {result.matchedRule ? (
              <div className="space-y-2">
                <p className="text-sm text-[var(--text-primary)]">
                  Lead would be assigned by rule:{' '}
                  <Link
                    href={`/rules/${result.matchedRule.ruleId}`}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                  >
                    {result.matchedRule.name}
                  </Link>
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Target: {result.matchedRule.targetOrgName}
                  {result.matchedRule.targetUserName && ` / ${result.matchedRule.targetUserName}`}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Priority: {result.matchedRule.priority}
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">
                No matching rule found. The lead would remain unassigned.
              </p>
            )}
          </div>

          {/* Evaluation Details */}
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
            <div className="px-6 py-4 border-b border-[var(--border-color)]">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Evaluation Details
              </h2>
            </div>
            {result.evaluatedRules.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-[var(--text-secondary)]">
                No rules were evaluated.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)]">
                    <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                      Rule
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                      Result
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.evaluatedRules.map((r) => (
                    <tr key={r.ruleId} className="border-b border-[var(--border-color)]">
                      <td className="px-6 py-3">
                        <Link
                          href={`/rules/${r.ruleId}`}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={r.matched ? 'active' : 'inactive'} />
                      </td>
                      <td className="px-6 py-3 text-[var(--text-secondary)]">{r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
