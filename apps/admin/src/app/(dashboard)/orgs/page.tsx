'use client';

/**
 * Organizations List Page
 *
 * Lists all organizations with search, filter, and create functionality.
 * RBAC: Create org is ADMIN only.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useListOrgsQuery, useCreateOrgMutation } from '@/store/services/orgs';
import type { Org, CreateOrgRequest } from '@/store/services/orgs';
import DataTable from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import FormField from '@/components/FormField';
import ErrorAlert from '@/components/ErrorAlert';
import RequireRole from '@/components/RequireRole';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/utils';
import { ADMIN_ROLES } from '@/lib/constants';

export default function OrgsPage() {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, error, refetch } = useListOrgsQuery({
    search: search || undefined,
    type: (typeFilter as Org['type']) || undefined,
    status: (statusFilter as Org['status']) || undefined,
    page,
    pageSize,
  });

  const [createOrg, { isLoading: isCreating }] = useCreateOrgMutation();

  const [form, setForm] = useState<CreateOrgRequest>({
    name: '',
    type: 'agency',
    description: '',
  });

  const columns: Column<Org>[] = [
    { key: 'name', header: 'Name', sortable: true },
    {
      key: 'type',
      header: 'Type',
      render: (row) => <span className="capitalize text-[var(--text-secondary)]">{row.type}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'memberCount',
      header: 'Members',
      render: (row) => <span className="text-[var(--text-secondary)]">{row.memberCount}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => (
        <span className="text-[var(--text-tertiary)]">{formatDate(row.createdAt)}</span>
      ),
    },
  ];

  const handleCreate = useCallback(async () => {
    try {
      await createOrg(form).unwrap();
      toast.success('Organization created successfully');
      setShowCreate(false);
      setForm({ name: '', type: 'agency', description: '' });
    } catch {
      toast.error('Failed to create organization');
    }
  }, [createOrg, form, toast]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Organizations</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage organizations and their members
          </p>
        </div>
        <RequireRole roles={[ADMIN_ROLES.ADMIN]}>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors self-start"
          >
            Create Organization
          </button>
        </RequireRole>
      </div>

      {/* Filters */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--text-primary)]"
          >
            <option value="">All Types</option>
            <option value="agency">Agency</option>
            <option value="broker">Broker</option>
            <option value="direct">Direct</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--text-primary)]"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && <ErrorAlert message="Failed to load organizations." onRetry={refetch} />}

      {/* Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
        <DataTable
          columns={columns}
          data={data?.orgs || []}
          loading={isLoading}
          emptyMessage="No organizations found."
          rowKey={(row) => row.orgId}
          onRowClick={(row) => router.push(`/orgs/${row.orgId}`)}
        />
        {data && data.orgs.length > 0 && (
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
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Organization">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
          className="space-y-4"
        >
          <FormField
            label="Name"
            name="name"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            required
            placeholder="Organization name"
          />
          <FormField
            label="Type"
            name="type"
            type="select"
            value={form.type}
            onChange={(v) => setForm((f) => ({ ...f, type: v as Org['type'] }))}
            options={[
              { value: 'agency', label: 'Agency' },
              { value: 'broker', label: 'Broker' },
              { value: 'direct', label: 'Direct' },
            ]}
          />
          <FormField
            label="Description"
            name="description"
            type="textarea"
            value={form.description || ''}
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder="Optional description"
          />
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
              disabled={isCreating || !form.name}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
