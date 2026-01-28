'use client';

/**
 * Rule Detail Page
 *
 * View and edit an assignment rule with matched leads count.
 * RBAC: Edit and delete are ADMIN only.
 */

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useGetRuleQuery,
  useUpdateRuleMutation,
  useDeleteRuleMutation,
} from '@/store/services/rules';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorAlert from '@/components/ErrorAlert';
import FormField from '@/components/FormField';
import StatusBadge from '@/components/StatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import RequireRole from '@/components/RequireRole';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/utils';
import { ADMIN_ROLES } from '@/lib/constants';
import Link from 'next/link';

export default function RuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const ruleId = params.ruleId as string;

  const { data: rule, isLoading, error, refetch } = useGetRuleQuery(ruleId);
  const [updateRule, { isLoading: isUpdating }] = useUpdateRuleMutation();
  const [deleteRule, { isLoading: isDeleting }] = useDeleteRuleMutation();

  const [editMode, setEditMode] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState({
    name: '',
    priority: 0,
    funnelsInput: '',
    zipsInput: '',
    targetOrgId: '',
    targetUserId: '',
    active: true,
    dailyCap: '' as string | number,
    monthlyCap: '' as string | number,
    description: '',
  });

  const startEdit = useCallback(() => {
    if (rule) {
      setForm({
        name: rule.name,
        priority: rule.priority,
        funnelsInput: rule.funnels.join(', '),
        zipsInput: rule.zipCodes.join(', '),
        targetOrgId: rule.targetOrgId,
        targetUserId: rule.targetUserId || '',
        active: rule.active,
        dailyCap: rule.dailyCap || '',
        monthlyCap: rule.monthlyCap || '',
        description: rule.description || '',
      });
      setEditMode(true);
    }
  }, [rule]);

  const handleSave = useCallback(async () => {
    try {
      await updateRule({
        ruleId,
        name: form.name,
        priority: form.priority,
        funnels: form.funnelsInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        zipCodes: form.zipsInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        targetOrgId: form.targetOrgId,
        targetUserId: form.targetUserId || undefined,
        active: form.active,
        dailyCap: form.dailyCap ? Number(form.dailyCap) : undefined,
        monthlyCap: form.monthlyCap ? Number(form.monthlyCap) : undefined,
        description: form.description || undefined,
      }).unwrap();
      toast.success('Rule updated successfully');
      setEditMode(false);
    } catch {
      toast.error('Failed to update rule');
    }
  }, [updateRule, ruleId, form, toast]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteRule(ruleId).unwrap();
      toast.success('Rule deleted successfully');
      router.push('/rules');
    } catch {
      toast.error('Failed to delete rule');
    }
  }, [deleteRule, ruleId, router, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !rule) {
    return <ErrorAlert message="Failed to load rule details." onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-2">
          <Link href="/rules" className="hover:text-[var(--text-primary)]">
            Rules
          </Link>
          <span>/</span>
          <span className="text-[var(--text-primary)]">{rule.name}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{rule.name}</h1>
            <StatusBadge status={rule.active ? 'active' : 'inactive'} />
          </div>
          {!editMode && (
            <RequireRole roles={[ADMIN_ROLES.ADMIN]}>
              <div className="flex items-center gap-3 self-start">
                <button
                  onClick={() => setShowDelete(true)}
                  className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={startEdit}
                  className="px-4 py-2 text-sm font-medium border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
                >
                  Edit
                </button>
              </div>
            </RequireRole>
          )}
        </div>
      </div>

      {/* Detail / Edit Form */}
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
                label="Priority"
                name="priority"
                type="number"
                value={form.priority}
                onChange={(v) => setForm((f) => ({ ...f, priority: parseInt(v) || 0 }))}
                required
              />
            </div>
            <FormField
              label="Funnels (comma-separated)"
              name="funnels"
              value={form.funnelsInput}
              onChange={(v) => setForm((f) => ({ ...f, funnelsInput: v }))}
              placeholder="Leave empty for all"
            />
            <FormField
              label="Zip Codes (comma-separated)"
              name="zips"
              value={form.zipsInput}
              onChange={(v) => setForm((f) => ({ ...f, zipsInput: v }))}
              placeholder="Leave empty for all"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Target Org ID"
                name="targetOrgId"
                value={form.targetOrgId}
                onChange={(v) => setForm((f) => ({ ...f, targetOrgId: v }))}
                required
              />
              <FormField
                label="Target User ID"
                name="targetUserId"
                value={form.targetUserId}
                onChange={(v) => setForm((f) => ({ ...f, targetUserId: v }))}
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Daily Cap"
                name="dailyCap"
                type="number"
                value={form.dailyCap}
                onChange={(v) => setForm((f) => ({ ...f, dailyCap: v }))}
                placeholder="Optional"
              />
              <FormField
                label="Monthly Cap"
                name="monthlyCap"
                type="number"
                value={form.monthlyCap}
                onChange={(v) => setForm((f) => ({ ...f, monthlyCap: v }))}
                placeholder="Optional"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="active" className="text-sm text-[var(--text-primary)]">
                Active
              </label>
            </div>
            <FormField
              label="Description"
              name="description"
              type="textarea"
              value={form.description}
              onChange={(v) => setForm((f) => ({ ...f, description: v }))}
            />
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
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Priority</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">{rule.priority}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Matched Leads</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                {rule.matchedLeadsCount.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Funnels</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                {rule.funnels.length > 0 ? rule.funnels.join(', ') : 'All funnels'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Zip Codes</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                {rule.zipCodes.length > 0 ? rule.zipCodes.join(', ') : 'All zip codes'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">
                Target Organization
              </dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                <Link
                  href={`/orgs/${rule.targetOrgId}`}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  {rule.targetOrgName}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Target User</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                {rule.targetUserName ? (
                  <Link
                    href={`/users/${rule.targetUserId}`}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    {rule.targetUserName}
                  </Link>
                ) : (
                  'Any user in org'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Daily Cap</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                {rule.dailyCap ? `${rule.currentDailyCount} / ${rule.dailyCap}` : 'No limit'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Monthly Cap</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                {rule.monthlyCap ? `${rule.currentMonthlyCount} / ${rule.monthlyCap}` : 'No limit'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Created</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                {formatDate(rule.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--text-secondary)]">Updated</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                {formatDate(rule.updatedAt)}
              </dd>
            </div>
            {rule.description && (
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-[var(--text-secondary)]">Description</dt>
                <dd className="mt-1 text-sm text-[var(--text-primary)]">{rule.description}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Rule"
        message={`Are you sure you want to delete "${rule.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
