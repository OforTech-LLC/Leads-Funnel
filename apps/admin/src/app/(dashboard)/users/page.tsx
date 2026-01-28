'use client';

/**
 * Users List Page
 *
 * Lists all users with search, filter, and create functionality.
 * RBAC: Create user is ADMIN only.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useListUsersQuery, useCreateUserMutation } from '@/store/services/users';
import type { User, CreateUserRequest } from '@/store/services/users';
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

export default function UsersPage() {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, error, refetch } = useListUsersQuery({
    search: search || undefined,
    status: (statusFilter as User['status']) || undefined,
    page,
    pageSize,
  });

  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();

  const [form, setForm] = useState<CreateUserRequest>({
    name: '',
    email: '',
    phone: '',
    role: 'user',
  });

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => <span className="font-medium text-[var(--text-primary)]">{row.name}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => <span className="text-[var(--text-secondary)]">{row.email}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'orgNames',
      header: 'Organizations',
      render: (row) => (
        <span className="text-[var(--text-secondary)]">
          {row.orgNames.length > 0 ? row.orgNames.join(', ') : 'None'}
        </span>
      ),
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
      await createUser(form).unwrap();
      toast.success('User created successfully');
      setShowCreate(false);
      setForm({ name: '', email: '', phone: '', role: 'user' });
    } catch {
      toast.error('Failed to create user');
    }
  }, [createUser, form, toast]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Users</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage platform users and their access
          </p>
        </div>
        <RequireRole roles={[ADMIN_ROLES.ADMIN]}>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors self-start"
          >
            Create User
          </button>
        </RequireRole>
      </div>

      {/* Filters */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
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
            <option value="invited">Invited</option>
          </select>
        </div>
      </div>

      {error && <ErrorAlert message="Failed to load users." onRetry={refetch} />}

      {/* Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
        <DataTable
          columns={columns}
          data={data?.users || []}
          loading={isLoading}
          emptyMessage="No users found."
          rowKey={(row) => row.userId}
          onRowClick={(row) => router.push(`/users/${row.userId}`)}
        />
        {data && data.users.length > 0 && (
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
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create User">
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
            placeholder="Full name"
          />
          <FormField
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            required
            placeholder="email@example.com"
          />
          <FormField
            label="Phone"
            name="phone"
            type="tel"
            value={form.phone || ''}
            onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            placeholder="Optional"
          />
          <FormField
            label="Role"
            name="role"
            type="select"
            value={form.role || 'user'}
            onChange={(v) => setForm((f) => ({ ...f, role: v as 'admin' | 'user' }))}
            options={[
              { value: 'user', label: 'User' },
              { value: 'admin', label: 'Admin' },
            ]}
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
              disabled={isCreating || !form.name || !form.email}
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
