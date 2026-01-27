'use client';

/**
 * User Detail Page
 *
 * User profile with edit form, organization memberships, and lead count.
 */

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useGetUserQuery, useUpdateUserMutation } from '@/store/services/users';
import type { User } from '@/store/services/users';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorAlert from '@/components/ErrorAlert';
import FormField from '@/components/FormField';
import StatusBadge from '@/components/StatusBadge';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.userId as string;

  const { data: user, isLoading, error, refetch } = useGetUserQuery(userId);
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    status: '' as User['status'],
    role: '' as 'admin' | 'user',
  });

  const startEdit = useCallback(() => {
    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        status: user.status,
        role: user.role,
      });
      setEditMode(true);
    }
  }, [user]);

  const handleSave = useCallback(async () => {
    try {
      await updateUser({ userId, ...form }).unwrap();
      setEditMode(false);
    } catch {
      // Error handled by RTK Query
    }
  }, [updateUser, userId, form]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !user) {
    return <ErrorAlert message="Failed to load user details." onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-2">
          <Link href="/users" className="hover:text-[var(--text-primary)]">
            Users
          </Link>
          <span>/</span>
          <span className="text-[var(--text-primary)]">{user.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{user.name}</h1>
            <StatusBadge status={user.status} />
          </div>
          {!editMode && (
            <button
              onClick={startEdit}
              className="px-4 py-2 text-sm font-medium border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Profile */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6">
        {editMode ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
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
              />
              <FormField
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                required
              />
              <FormField
                label="Phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
              />
              <FormField
                label="Status"
                name="status"
                type="select"
                value={form.status}
                onChange={(v) => setForm((f) => ({ ...f, status: v as User['status'] }))}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'invited', label: 'Invited' },
                ]}
              />
              <FormField
                label="Role"
                name="role"
                type="select"
                value={form.role}
                onChange={(v) => setForm((f) => ({ ...f, role: v as 'admin' | 'user' }))}
                options={[
                  { value: 'user', label: 'User' },
                  { value: 'admin', label: 'Admin' },
                ]}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="px-4 py-2 text-sm border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Email</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Phone</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">{user.phone || '--'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Role</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)] capitalize">{user.role}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Assigned Leads</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">{user.leadCount}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Created</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                {formatDate(user.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Last Login</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {/* Organization Memberships */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Organization Memberships
          </h2>
        </div>
        {user.orgs.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-[var(--text-secondary)]">
            Not a member of any organization.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                  Organization
                </th>
                <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                  Role
                </th>
                <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {user.orgs.map((org) => (
                <tr key={org.orgId} className="border-b border-[var(--border-color)]">
                  <td className="px-6 py-3">
                    <Link
                      href={`/orgs/${org.orgId}`}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                    >
                      {org.orgName}
                    </Link>
                  </td>
                  <td className="px-6 py-3 capitalize text-[var(--text-secondary)]">{org.role}</td>
                  <td className="px-6 py-3 text-[var(--text-tertiary)]">
                    {formatDate(org.joinedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
