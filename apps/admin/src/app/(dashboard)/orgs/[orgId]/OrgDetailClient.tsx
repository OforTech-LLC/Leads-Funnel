'use client';

/**
 * Organization Detail Client Component
 *
 * Edit form, members list, associated leads and rules.
 */

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  useGetOrgQuery,
  useUpdateOrgMutation,
  useListOrgMembersQuery,
  useAddOrgMemberMutation,
  useRemoveOrgMemberMutation,
  useUpdateMemberRoleMutation,
} from '@/store/services/orgs';
import type { OrgMember } from '@/store/services/orgs';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorAlert from '@/components/ErrorAlert';
import FormField from '@/components/FormField';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function OrgDetailClient() {
  const params = useParams();
  const orgId = params.orgId as string;

  const { data: org, isLoading, error, refetch } = useGetOrgQuery(orgId);
  const { data: members = [] } = useListOrgMembersQuery({ orgId });
  const [updateOrg, { isLoading: isUpdating }] = useUpdateOrgMutation();
  const [addMember, { isLoading: isAdding }] = useAddOrgMemberMutation();
  const [removeMember] = useRemoveOrgMemberMutation();
  const [updateMemberRole] = useUpdateMemberRoleMutation();

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    contactEmail: '',
    phone: '',
    timezone: '',
  });

  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ userId: '', role: 'member' as OrgMember['role'] });
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const startEdit = useCallback(() => {
    if (org) {
      setForm({
        name: org.name,
        slug: org.slug,
        contactEmail: org.contactEmail || '',
        phone: org.phone || '',
        timezone: org.timezone || '',
      });
      setEditMode(true);
    }
  }, [org]);

  const handleSave = useCallback(async () => {
    try {
      await updateOrg({
        orgId,
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        phone: form.phone.trim() || undefined,
        timezone: form.timezone.trim() || undefined,
      }).unwrap();
      setEditMode(false);
    } catch {
      // Error handled by RTK Query
    }
  }, [updateOrg, orgId, form]);

  const handleAddMember = useCallback(async () => {
    try {
      await addMember({ orgId, ...memberForm }).unwrap();
      setShowAddMember(false);
      setMemberForm({ userId: '', role: 'member' });
    } catch {
      // Error handled by RTK Query
    }
  }, [addMember, orgId, memberForm]);

  const handleRemoveMember = useCallback(async () => {
    if (confirmRemove) {
      try {
        await removeMember({ orgId, userId: confirmRemove }).unwrap();
        setConfirmRemove(null);
      } catch {
        // Error handled by RTK Query
      }
    }
  }, [removeMember, orgId, confirmRemove]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !org) {
    return <ErrorAlert message="Failed to load organization details." onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-2">
          <Link href="/orgs" className="hover:text-[var(--text-primary)]">
            Organizations
          </Link>
          <span>/</span>
          <span className="text-[var(--text-primary)]">{org.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{org.name}</h1>
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

      {/* Edit Form or Details */}
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
                label="Slug"
                name="slug"
                value={form.slug}
                onChange={(v) => setForm((f) => ({ ...f, slug: v }))}
              />
              <FormField
                label="Contact Email"
                name="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={(v) => setForm((f) => ({ ...f, contactEmail: v }))}
              />
              <FormField
                label="Phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
              />
              <FormField
                label="Timezone"
                name="timezone"
                value={form.timezone}
                onChange={(v) => setForm((f) => ({ ...f, timezone: v }))}
                placeholder="America/New_York"
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
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Slug</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">{org.slug}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Contact Email</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">{org.contactEmail}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Phone</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">{org.phone || '--'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Timezone</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                {org.timezone || 'America/New_York'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Created</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                {formatDate(org.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Updated</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                {formatDate(org.updatedAt)}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {/* Members */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Members</h2>
          <button
            onClick={() => setShowAddMember(true)}
            className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Member
          </button>
        </div>
        {members.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-[var(--text-secondary)]">
            No members yet.
          </div>
        ) : (
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
                  Role
                </th>
                <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                  Joined
                </th>
                <th className="px-6 py-3 text-right font-medium text-[var(--text-secondary)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.userId} className="border-b border-[var(--border-color)]">
                  <td className="px-6 py-3">
                    <Link
                      href={`/users/${member.userId}`}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                    >
                      {member.name}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-[var(--text-secondary)]">{member.email}</td>
                  <td className="px-6 py-3">
                    <select
                      value={member.role}
                      onChange={(e) =>
                        updateMemberRole({
                          orgId,
                          userId: member.userId,
                          role: e.target.value as OrgMember['role'],
                        })
                      }
                      className="text-sm border border-[var(--border-color)] rounded px-2 py-1 bg-[var(--card-bg)] text-[var(--text-primary)]"
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                  </td>
                  <td className="px-6 py-3 text-[var(--text-tertiary)]">
                    {formatDate(member.joinedAt)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => setConfirmRemove(member.userId)}
                      className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Member Modal */}
      <Modal open={showAddMember} onClose={() => setShowAddMember(false)} title="Add Member">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddMember();
          }}
          className="space-y-4"
        >
          <FormField
            label="User ID"
            name="userId"
            value={memberForm.userId}
            onChange={(v) => setMemberForm((f) => ({ ...f, userId: v }))}
            required
            placeholder="Enter user ID"
          />
          <FormField
            label="Role"
            name="role"
            type="select"
            value={memberForm.role}
            onChange={(v) => setMemberForm((f) => ({ ...f, role: v as OrgMember['role'] }))}
            options={[
              { value: 'owner', label: 'Owner' },
              { value: 'admin', label: 'Admin' },
              { value: 'member', label: 'Member' },
            ]}
          />
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAddMember(false)}
              className="px-4 py-2 text-sm border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAdding || !memberForm.userId}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isAdding ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Remove Dialog */}
      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        message="Are you sure you want to remove this member from the organization?"
        confirmLabel="Remove"
        confirmVariant="danger"
      />
    </div>
  );
}
