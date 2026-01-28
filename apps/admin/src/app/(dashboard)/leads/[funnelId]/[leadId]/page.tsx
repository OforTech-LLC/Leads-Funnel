'use client';

/**
 * Lead Detail Page
 *
 * Full lead view with edit capabilities, reassign, notifications, and audit trail.
 * RBAC: Reassign is ADMIN only. Edit is ADMIN or OPERATOR.
 */

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  useGetLeadQuery,
  useUpdateLeadMutation,
  useReassignLeadMutation,
} from '@/store/services/leads';
import type { LeadStatus, PipelineStatus } from '@/lib/constants';
import { LEAD_STATUSES, PIPELINE_STATUSES, ADMIN_ROLES } from '@/lib/constants';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorAlert from '@/components/ErrorAlert';
import FormField from '@/components/FormField';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import RequireRole from '@/components/RequireRole';
import { useToast } from '@/components/Toast';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

export default function LeadDetailPage() {
  const params = useParams();
  const toast = useToast();
  const funnelId = params.funnelId as string;
  const leadId = params.leadId as string;

  const { data: lead, isLoading, error, refetch } = useGetLeadQuery({ funnelId, leadId });
  const [updateLead, { isLoading: isUpdating }] = useUpdateLeadMutation();
  const [reassignLead, { isLoading: isReassigning }] = useReassignLeadMutation();

  const [editMode, setEditMode] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [form, setForm] = useState({
    status: '' as LeadStatus,
    pipelineStatus: '' as PipelineStatus,
    tags: '',
    notes: '',
    doNotContact: false,
  });
  const [reassignForm, setReassignForm] = useState({
    targetOrgId: '',
    targetUserId: '',
  });

  const startEdit = useCallback(() => {
    if (lead) {
      setForm({
        status: lead.status,
        pipelineStatus: lead.pipelineStatus,
        tags: lead.tags.join(', '),
        notes: lead.notes,
        doNotContact: lead.doNotContact,
      });
      setEditMode(true);
    }
  }, [lead]);

  const handleSave = useCallback(async () => {
    try {
      await updateLead({
        funnelId,
        leadId,
        status: form.status,
        pipelineStatus: form.pipelineStatus,
        tags: form.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        notes: form.notes,
        doNotContact: form.doNotContact,
      }).unwrap();
      toast.success('Lead updated successfully');
      setEditMode(false);
    } catch {
      toast.error('Failed to update lead');
    }
  }, [updateLead, funnelId, leadId, form, toast]);

  const handleReassign = useCallback(async () => {
    try {
      await reassignLead({
        funnelId,
        leadId,
        targetOrgId: reassignForm.targetOrgId,
        targetUserId: reassignForm.targetUserId || undefined,
      }).unwrap();
      toast.success('Lead reassigned successfully');
      setShowReassign(false);
      setReassignForm({ targetOrgId: '', targetUserId: '' });
    } catch {
      toast.error('Failed to reassign lead');
    }
  }, [reassignLead, funnelId, leadId, reassignForm, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !lead) {
    return <ErrorAlert message="Failed to load lead details." onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-2">
          <Link href="/leads" className="hover:text-[var(--text-primary)]">
            Leads
          </Link>
          <span>/</span>
          <span className="text-[var(--text-tertiary)]">{funnelId}</span>
          <span>/</span>
          <span className="text-[var(--text-primary)]">{lead.name}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{lead.name}</h1>
            <StatusBadge status={lead.status} />
            {lead.doNotContact && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                DNC
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 self-start">
            <RequireRole roles={[ADMIN_ROLES.ADMIN]}>
              <button
                onClick={() => setShowReassign(true)}
                className="px-4 py-2 text-sm font-medium border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
              >
                Reassign
              </button>
            </RequireRole>
            {!editMode && (
              <RequireRole roles={[ADMIN_ROLES.ADMIN, ADMIN_ROLES.OPERATOR]}>
                <button
                  onClick={startEdit}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Edit
                </button>
              </RequireRole>
            )}
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Contact Information
        </h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          <div>
            <dt className="text-sm font-medium text-[var(--text-secondary)]">Email</dt>
            <dd className="mt-1 text-sm text-[var(--text-primary)]">{lead.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--text-secondary)]">Phone</dt>
            <dd className="mt-1 text-sm text-[var(--text-primary)]">{lead.phone || '--'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--text-secondary)]">Funnel</dt>
            <dd className="mt-1 text-sm text-[var(--text-primary)]">{lead.funnelId}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--text-secondary)]">Created</dt>
            <dd className="mt-1 text-sm text-[var(--text-primary)]">
              {formatDateTime(lead.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--text-secondary)]">Updated</dt>
            <dd className="mt-1 text-sm text-[var(--text-primary)]">
              {formatDateTime(lead.updatedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--text-secondary)]">Zip Code</dt>
            <dd className="mt-1 text-sm text-[var(--text-primary)]">{lead.zipCode || '--'}</dd>
          </div>
          {lead.assignedOrgName && (
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Assigned Org</dt>
              <dd className="mt-1 text-sm">
                <Link
                  href={`/orgs/${lead.assignedOrgId}`}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  {lead.assignedOrgName}
                </Link>
              </dd>
            </div>
          )}
          {lead.assignedUserName && (
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Assigned User</dt>
              <dd className="mt-1 text-sm">
                <Link
                  href={`/users/${lead.assignedUserId}`}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  {lead.assignedUserName}
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Status / Edit */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Status & Details</h2>
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
                label="Status"
                name="status"
                type="select"
                value={form.status}
                onChange={(v) => setForm((f) => ({ ...f, status: v as LeadStatus }))}
                options={LEAD_STATUSES.map((s) => ({
                  value: s,
                  label: s.charAt(0).toUpperCase() + s.slice(1),
                }))}
              />
              <FormField
                label="Pipeline Status"
                name="pipelineStatus"
                type="select"
                value={form.pipelineStatus}
                onChange={(v) => setForm((f) => ({ ...f, pipelineStatus: v as PipelineStatus }))}
                options={PIPELINE_STATUSES.map((s) => ({
                  value: s,
                  label: s
                    .split('_')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' '),
                }))}
              />
            </div>
            <FormField
              label="Tags (comma-separated)"
              name="tags"
              value={form.tags}
              onChange={(v) => setForm((f) => ({ ...f, tags: v }))}
              placeholder="tag1, tag2"
            />
            <FormField
              label="Notes"
              name="notes"
              type="textarea"
              value={form.notes}
              onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
              rows={4}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="doNotContact"
                checked={form.doNotContact}
                onChange={(e) => setForm((f) => ({ ...f, doNotContact: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="doNotContact" className="text-sm text-[var(--text-primary)]">
                Do Not Contact
              </label>
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
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Pipeline Status</dt>
              <dd className="mt-1">
                <StatusBadge status={lead.pipelineStatus} />
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Tags</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                {lead.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {lead.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex px-2 py-0.5 bg-[var(--bg-tertiary)] rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  '--'
                )}
              </dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Notes</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                {lead.notes || '--'}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {/* UTM & Source Info */}
      {(lead.pageUrl || lead.referrer || lead.utm) && (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Source Information
          </h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {lead.pageUrl && (
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-[var(--text-secondary)]">Page URL</dt>
                <dd className="mt-1 text-sm text-[var(--text-primary)] break-all">
                  {lead.pageUrl}
                </dd>
              </div>
            )}
            {lead.referrer && (
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-[var(--text-secondary)]">Referrer</dt>
                <dd className="mt-1 text-sm text-[var(--text-primary)] break-all">
                  {lead.referrer}
                </dd>
              </div>
            )}
            {lead.utm &&
              Object.entries(lead.utm)
                .filter(([, v]) => v)
                .map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-sm font-medium text-[var(--text-secondary)]">UTM {key}</dt>
                    <dd className="mt-1 text-sm text-[var(--text-primary)]">{String(value)}</dd>
                  </div>
                ))}
          </dl>
        </div>
      )}

      {/* Notification History */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Notification History</h2>
        </div>
        {lead.notificationHistory.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-[var(--text-secondary)]">
            No notifications sent for this lead.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Channel
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody>
                {lead.notificationHistory.map((n) => (
                  <tr key={n.id} className="border-b border-[var(--border-color)]">
                    <td className="px-6 py-3 capitalize">{n.channel}</td>
                    <td className="px-6 py-3 text-[var(--text-secondary)]">{n.recipient}</td>
                    <td className="px-6 py-3">
                      <StatusBadge status={n.status} />
                    </td>
                    <td className="px-6 py-3 text-[var(--text-tertiary)]">
                      {formatRelativeTime(n.sentAt)}
                    </td>
                    <td className="px-6 py-3 text-red-600 dark:text-red-400 text-xs">
                      {n.error || '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Trail */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Audit Trail</h2>
        </div>
        {lead.auditTrail.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-[var(--text-secondary)]">
            No audit entries for this lead.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {lead.auditTrail.map((entry) => (
              <div key={entry.id} className="px-6 py-3 flex items-start gap-4">
                <div className="text-xs text-[var(--text-tertiary)] whitespace-nowrap mt-0.5">
                  {formatDateTime(entry.timestamp)}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[var(--text-primary)]">
                    <span className="font-medium">{entry.userEmail}</span>{' '}
                    <span className="text-[var(--text-secondary)]">{entry.action}</span>
                  </p>
                  {Object.keys(entry.details).length > 0 && (
                    <pre className="mt-1 text-xs text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] p-2 rounded overflow-x-auto">
                      {JSON.stringify(entry.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reassign Modal */}
      <Modal open={showReassign} onClose={() => setShowReassign(false)} title="Reassign Lead">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleReassign();
          }}
          className="space-y-4"
        >
          <FormField
            label="Target Organization ID"
            name="targetOrgId"
            value={reassignForm.targetOrgId}
            onChange={(v) => setReassignForm((f) => ({ ...f, targetOrgId: v }))}
            required
            placeholder="org-id"
          />
          <FormField
            label="Target User ID (optional)"
            name="targetUserId"
            value={reassignForm.targetUserId}
            onChange={(v) => setReassignForm((f) => ({ ...f, targetUserId: v }))}
            placeholder="user-id"
          />
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowReassign(false)}
              className="px-4 py-2 text-sm border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isReassigning || !reassignForm.targetOrgId}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isReassigning ? 'Reassigning...' : 'Reassign'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
