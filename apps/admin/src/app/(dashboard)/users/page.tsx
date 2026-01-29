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
import { useListOrgsQuery } from '@/store/services/orgs';
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
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [orgSearch, setOrgSearch] = useState('');
  const [selectedOrgName, setSelectedOrgName] = useState('');

  const { data, isLoading, error, refetch } = useListUsersQuery({
    search: search || undefined,
    status: (statusFilter as User['status']) || undefined,
    cursor,
    limit: pageSize,
  });

  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();

  const [form, setForm] = useState<CreateUserRequest>({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    userType: 'platform',
    portalRole: 'agent',
    orgId: '',
    createOrg: false,
    orgName: '',
    orgSlug: '',
  });
  const isPortalUser = form.userType === 'portal';
  const isCreatingOrg = isPortalUser && form.createOrg;
  const shouldSearchOrgs = isPortalUser && !isCreatingOrg;

  const { data: orgResults } = useListOrgsQuery(
    shouldSearchOrgs
      ? {
          search: orgSearch || undefined,
          limit: 10,
        }
      : undefined,
    { skip: !shouldSearchOrgs }
  );

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
      const response = await createUser(form).unwrap();
      const portalInviteSent = (response as { portalInviteSent?: boolean }).portalInviteSent;
      toast.success(
        portalInviteSent
          ? 'Portal user invited. Temporary password sent for reset.'
          : 'User created successfully'
      );
      setShowCreate(false);
      setForm({
        name: '',
        email: '',
        phone: '',
        role: 'user',
        userType: 'platform',
        portalRole: 'agent',
        orgId: '',
        createOrg: false,
        orgName: '',
        orgSlug: '',
      });
      setOrgSearch('');
      setSelectedOrgName('');
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
              setCursor(undefined);
              setCursorStack([]);
            }}
            className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
              setCursor(undefined);
              setCursorStack([]);
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
            hasPrev={cursorStack.length > 0}
            onNext={() => {
              if (!data.nextToken) return;
              setCursorStack((prev) => [...prev, cursor || '']);
              setCursor(data.nextToken);
              setPage((p) => p + 1);
            }}
            onPrev={() => {
              setCursorStack((prev) => {
                if (prev.length === 0) return prev;
                const next = [...prev];
                const previousCursor = next.pop() || '';
                setCursor(previousCursor || undefined);
                return next;
              });
              setPage((p) => Math.max(1, p - 1));
            }}
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
            label="User Type"
            name="userType"
            type="select"
            value={form.userType || 'platform'}
            onChange={(v) => {
              const nextType = v as 'platform' | 'portal';
              setOrgSearch('');
              setSelectedOrgName('');
              setForm((f) => ({
                ...f,
                userType: nextType,
                createOrg: nextType === 'portal' ? true : false,
                portalRole: nextType === 'portal' ? 'admin' : f.portalRole,
                orgId: nextType === 'portal' ? f.orgId : '',
                orgName: nextType === 'portal' ? f.orgName : '',
                orgSlug: nextType === 'portal' ? f.orgSlug : '',
              }));
            }}
            options={[
              { value: 'platform', label: 'Platform User' },
              { value: 'portal', label: 'Portal User' },
            ]}
          />

          {isPortalUser ? (
            <>
              <FormField
                label="Organization Mode"
                name="orgMode"
                type="select"
                value={isCreatingOrg ? 'create' : 'existing'}
                onChange={(v) => {
                  const create = v === 'create';
                  setOrgSearch('');
                  setSelectedOrgName('');
                  setForm((f) => ({
                    ...f,
                    createOrg: create,
                    portalRole: create ? 'admin' : f.portalRole,
                    orgId: create ? '' : f.orgId,
                    orgName: create ? f.orgName : '',
                    orgSlug: create ? f.orgSlug : '',
                  }));
                }}
                options={[
                  { value: 'create', label: 'Create new organization' },
                  { value: 'existing', label: 'Assign to existing organization' },
                ]}
              />
              {isCreatingOrg ? (
                <>
                  <FormField
                    label="Organization Name"
                    name="orgName"
                    value={form.orgName || ''}
                    onChange={(v) => setForm((f) => ({ ...f, orgName: v }))}
                    placeholder="Company or team name"
                    required
                  />
                  <FormField
                    label="Organization Slug"
                    name="orgSlug"
                    value={form.orgSlug || ''}
                    onChange={(v) => setForm((f) => ({ ...f, orgSlug: v }))}
                    placeholder="Optional, auto-generated if blank"
                  />
                </>
              ) : (
                <div className="space-y-2">
                  <FormField
                    label="Search Organization"
                    name="orgSearch"
                    value={orgSearch}
                    onChange={(v) => {
                      setOrgSearch(v);
                      setSelectedOrgName('');
                      setForm((f) => ({ ...f, orgId: '' }));
                    }}
                    placeholder="Search by name, slug, or org ID"
                  />
                  <div className="max-h-40 overflow-auto rounded-md border border-[var(--border-color)] bg-[var(--card-bg)]">
                    {orgResults?.orgs && orgResults.orgs.length > 0 ? (
                      orgResults.orgs.map((org) => (
                        <button
                          key={org.orgId}
                          type="button"
                          onClick={() => {
                            setForm((f) => ({ ...f, orgId: org.orgId }));
                            setSelectedOrgName(org.name);
                            setOrgSearch(org.name);
                          }}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] ${
                            form.orgId === org.orgId
                              ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                              : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          <span className="font-medium text-[var(--text-primary)]">{org.name}</span>
                          <span className="text-xs text-[var(--text-tertiary)]">{org.slug}</span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-xs text-[var(--text-tertiary)]">
                        {orgSearch ? 'No organizations found.' : 'Start typing to search.'}
                      </p>
                    )}
                  </div>
                  <FormField
                    label="Organization ID"
                    name="orgId"
                    value={form.orgId || ''}
                    onChange={(v) => {
                      setSelectedOrgName('');
                      setForm((f) => ({ ...f, orgId: v }));
                    }}
                    placeholder="Select above or paste org ID"
                    required
                  />
                  {selectedOrgName && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      Selected: {selectedOrgName}
                    </p>
                  )}
                </div>
              )}
              <FormField
                label="Portal Role"
                name="portalRole"
                type="select"
                value={isCreatingOrg ? 'admin' : form.portalRole || 'agent'}
                onChange={(v) =>
                  setForm((f) => ({ ...f, portalRole: v as 'admin' | 'manager' | 'agent' }))
                }
                disabled={isCreatingOrg}
                options={[
                  { value: 'agent', label: 'Agent' },
                  { value: 'manager', label: 'Manager' },
                  { value: 'admin', label: 'Admin' },
                ]}
              />
              <p className="text-xs text-[var(--text-secondary)]">
                Portal users receive a temporary password and must reset it on first login.
              </p>
              {isCreatingOrg && (
                <p className="text-xs text-[var(--text-secondary)]">
                  A new organization will be created and this user will be set as the owner.
                </p>
              )}
            </>
          ) : (
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
          )}
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
              disabled={isCreating || !form.name || !form.email || (isPortalUser && !form.orgId)}
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
