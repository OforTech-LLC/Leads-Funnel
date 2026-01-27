'use client';

/**
 * Assignment Rules List Page
 *
 * Lists all assignment rules with create, search, and filter.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useListRulesQuery, useCreateRuleMutation } from '@/store/services/rules';
import type { AssignmentRule, CreateRuleRequest } from '@/store/services/rules';
import DataTable from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import FormField from '@/components/FormField';
import ErrorAlert from '@/components/ErrorAlert';
import Link from 'next/link';

export default function RulesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, error, refetch } = useListRulesQuery({
    search: search || undefined,
    active: activeFilter === '' ? undefined : activeFilter === 'true',
    page,
    pageSize,
  });

  const [createRule, { isLoading: isCreating }] = useCreateRuleMutation();

  const [form, setForm] = useState<CreateRuleRequest>({
    name: '',
    priority: 100,
    funnels: [],
    zipCodes: [],
    targetOrgId: '',
    active: true,
  });
  const [funnelsInput, setFunnelsInput] = useState('');
  const [zipsInput, setZipsInput] = useState('');

  const columns: Column<AssignmentRule>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => <span className="font-medium text-[var(--text-primary)]">{row.name}</span>,
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (row) => <span className="text-[var(--text-secondary)]">{row.priority}</span>,
    },
    {
      key: 'funnels',
      header: 'Funnels',
      render: (row) => (
        <span className="text-[var(--text-secondary)]">
          {row.funnels.length > 0 ? row.funnels.join(', ') : 'All'}
        </span>
      ),
    },
    {
      key: 'zipCodes',
      header: 'Zip Codes',
      render: (row) => (
        <span className="text-[var(--text-secondary)]">
          {row.zipCodes.length > 0
            ? row.zipCodes.length > 3
              ? `${row.zipCodes.slice(0, 3).join(', ')} +${row.zipCodes.length - 3}`
              : row.zipCodes.join(', ')
            : 'All'}
        </span>
      ),
    },
    {
      key: 'targetOrgName',
      header: 'Target Org',
      render: (row) => <span className="text-[var(--text-secondary)]">{row.targetOrgName}</span>,
    },
    {
      key: 'active',
      header: 'Status',
      render: (row) => <StatusBadge status={row.active ? 'active' : 'inactive'} />,
    },
    {
      key: 'caps',
      header: 'Caps',
      render: (row) => (
        <span className="text-xs text-[var(--text-tertiary)]">
          {row.dailyCap ? `${row.currentDailyCount}/${row.dailyCap}/d` : '--'}
          {row.dailyCap && row.monthlyCap ? ' | ' : ''}
          {row.monthlyCap ? `${row.currentMonthlyCount}/${row.monthlyCap}/m` : ''}
        </span>
      ),
    },
  ];

  const handleCreate = useCallback(async () => {
    try {
      const req: CreateRuleRequest = {
        ...form,
        funnels: funnelsInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        zipCodes: zipsInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      await createRule(req).unwrap();
      setShowCreate(false);
      setForm({
        name: '',
        priority: 100,
        funnels: [],
        zipCodes: [],
        targetOrgId: '',
        active: true,
      });
      setFunnelsInput('');
      setZipsInput('');
    } catch {
      // Error handled by RTK Query
    }
  }, [createRule, form, funnelsInput, zipsInput]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Assignment Rules</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Configure lead assignment rules and routing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/rules/test"
            className="px-4 py-2 text-sm font-medium border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
          >
            Test Rules
          </Link>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Rule
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search rules..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--text-primary)]"
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {error && <ErrorAlert message="Failed to load rules." onRetry={refetch} />}

      {/* Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
        <DataTable
          columns={columns}
          data={data?.rules || []}
          loading={isLoading}
          emptyMessage="No assignment rules found."
          rowKey={(row) => row.ruleId}
          onRowClick={(row) => router.push(`/rules/${row.ruleId}`)}
        />
        {data && data.rules.length > 0 && (
          <Pagination
            total={data.total}
            pageSize={pageSize}
            hasNext={!!data.nextToken}
            hasPrev={page > 1}
            onNext={() => setPage((p) => p + 1)}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            currentPage={page}
          />
        )}
      </div>

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Assignment Rule"
        width="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Name"
              name="name"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              required
              placeholder="Rule name"
            />
            <FormField
              label="Priority"
              name="priority"
              type="number"
              value={form.priority}
              onChange={(v) => setForm((f) => ({ ...f, priority: parseInt(v) || 0 }))}
              required
              placeholder="100"
            />
          </div>
          <FormField
            label="Funnels (comma-separated)"
            name="funnels"
            value={funnelsInput}
            onChange={setFunnelsInput}
            placeholder="funnel1, funnel2 (leave empty for all)"
          />
          <FormField
            label="Zip Codes (comma-separated)"
            name="zipCodes"
            value={zipsInput}
            onChange={setZipsInput}
            placeholder="90210, 10001 (leave empty for all)"
          />
          <FormField
            label="Target Organization ID"
            name="targetOrgId"
            value={form.targetOrgId}
            onChange={(v) => setForm((f) => ({ ...f, targetOrgId: v }))}
            required
            placeholder="org-id"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Daily Cap"
              name="dailyCap"
              type="number"
              value={form.dailyCap || ''}
              onChange={(v) => setForm((f) => ({ ...f, dailyCap: v ? parseInt(v) : undefined }))}
              placeholder="Optional"
            />
            <FormField
              label="Monthly Cap"
              name="monthlyCap"
              type="number"
              value={form.monthlyCap || ''}
              onChange={(v) => setForm((f) => ({ ...f, monthlyCap: v ? parseInt(v) : undefined }))}
              placeholder="Optional"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !form.name || !form.targetOrgId}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
