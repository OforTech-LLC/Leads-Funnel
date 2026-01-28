'use client';

/**
 * Exports Page
 *
 * Create data exports, view past export jobs with download links,
 * and manage scheduled recurring exports.
 */

import { useState, useCallback } from 'react';
import {
  useListExportsQuery,
  useCreateExportMutation,
  useLazyGetExportDownloadUrlQuery,
  useListScheduledExportsQuery,
  useCreateScheduledExportMutation,
  useDeleteScheduledExportMutation,
} from '@/store/services/exports';
import type {
  ExportJob,
  CreateExportRequest,
  ScheduledExport,
  ScheduleFrequency,
  CreateScheduledExportRequest,
} from '@/store/services/exports';
import { useListFunnelsQuery } from '@/store/services/leads';
import DataTable from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import StatusBadge from '@/components/StatusBadge';
import FormField from '@/components/FormField';
import ErrorAlert from '@/components/ErrorAlert';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import RequireRole from '@/components/RequireRole';
import { useToast } from '@/components/Toast';
import { EXPORT_FORMATS, LEAD_STATUSES, ADMIN_ROLES } from '@/lib/constants';
import type { ExportFormat } from '@/lib/constants';
import { formatDateTime, formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidDownloadUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname.endsWith('.amazonaws.com') || parsed.hostname.endsWith('.kanjona.com'))
    );
  } catch {
    return false;
  }
}

const FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  once: 'One-time',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const DAY_OF_WEEK = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '7', label: 'Sunday' },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ExportsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const toast = useToast();

  const { data, isLoading, error, refetch } = useListExportsQuery({ page, pageSize });
  const { data: funnelsData } = useListFunnelsQuery();
  const [createExport, { isLoading: isCreating }] = useCreateExportMutation();
  const [getDownloadUrl] = useLazyGetExportDownloadUrlQuery();

  // Schedule state
  const { data: schedulesData, isLoading: schedulesLoading } = useListScheduledExportsQuery();
  const [createSchedule, { isLoading: isScheduling }] = useCreateScheduledExportMutation();
  const [deleteSchedule, { isLoading: isDeleting }] = useDeleteScheduledExportMutation();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState<CreateExportRequest>({
    funnelId: '',
    format: 'csv',
    status: undefined,
    startDate: undefined,
    endDate: undefined,
  });

  const [scheduleForm, setScheduleForm] = useState<{
    funnelId: string;
    format: ExportFormat;
    frequency: ScheduleFrequency;
    dayOfWeekOrMonth: string;
    timeUtc: string;
    deliveryEmail: string;
    enableEmail: boolean;
  }>({
    funnelId: '',
    format: 'csv',
    frequency: 'weekly',
    dayOfWeekOrMonth: '1',
    timeUtc: '08:00',
    deliveryEmail: '',
    enableEmail: false,
  });

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await createExport(form).unwrap();
        toast.success('Export started, you will be notified when ready');
        setForm({
          funnelId: '',
          format: 'csv',
          status: undefined,
          startDate: undefined,
          endDate: undefined,
        });
      } catch {
        toast.error('Failed to create export');
      }
    },
    [createExport, form, toast]
  );

  const handleDownload = useCallback(
    async (jobId: string) => {
      try {
        const result = await getDownloadUrl(jobId).unwrap();
        if (result.downloadUrl && isValidDownloadUrl(result.downloadUrl)) {
          window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
        } else {
          toast.error('Invalid download URL');
        }
      } catch {
        toast.error('Failed to get download link');
      }
    },
    [getDownloadUrl, toast]
  );

  const handleCreateSchedule = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const req: CreateScheduledExportRequest = {
          funnelId: scheduleForm.funnelId,
          format: scheduleForm.format as ExportFormat,
          frequency: scheduleForm.frequency,
          dayOfWeekOrMonth:
            scheduleForm.frequency === 'weekly' || scheduleForm.frequency === 'monthly'
              ? parseInt(scheduleForm.dayOfWeekOrMonth)
              : undefined,
          timeUtc: scheduleForm.timeUtc,
          deliveryEmail: scheduleForm.enableEmail ? scheduleForm.deliveryEmail : undefined,
        };
        await createSchedule(req).unwrap();
        toast.success('Export schedule created');
        setShowScheduleModal(false);
        setScheduleForm({
          funnelId: '',
          format: 'csv',
          frequency: 'weekly',
          dayOfWeekOrMonth: '1',
          timeUtc: '08:00',
          deliveryEmail: '',
          enableEmail: false,
        });
      } catch {
        toast.error('Failed to create schedule');
      }
    },
    [createSchedule, scheduleForm, toast]
  );

  const handleDeleteSchedule = useCallback(async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteSchedule(confirmDeleteId).unwrap();
      toast.success('Schedule deleted');
      setConfirmDeleteId(null);
    } catch {
      toast.error('Failed to delete schedule');
    }
  }, [deleteSchedule, confirmDeleteId, toast]);

  const exportColumns: Column<ExportJob>[] = [
    {
      key: 'funnelId',
      header: 'Funnel',
      render: (row) => <span className="text-[var(--text-primary)]">{row.funnelId}</span>,
    },
    {
      key: 'format',
      header: 'Format',
      render: (row) => (
        <span className="uppercase text-xs font-mono text-[var(--text-secondary)]">
          {row.format}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'recordCount',
      header: 'Records',
      render: (row) => (
        <span className="text-[var(--text-secondary)]">
          {row.recordCount !== undefined ? row.recordCount.toLocaleString() : '--'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) => (
        <span className="text-[var(--text-tertiary)]">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => {
        if (row.status === 'completed') {
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(row.jobId);
              }}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Download
            </button>
          );
        }
        if (row.status === 'failed') {
          return (
            <span className="text-xs text-red-600 dark:text-red-400" title={row.errorMessage}>
              {row.errorMessage ? 'Error' : 'Failed'}
            </span>
          );
        }
        return <span className="text-xs text-[var(--text-tertiary)]">Processing...</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Exports</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Export lead data and manage scheduled exports
          </p>
        </div>
        <RequireRole roles={[ADMIN_ROLES.ADMIN, ADMIN_ROLES.OPERATOR]}>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-4 py-2 text-sm font-medium border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
          >
            Schedule Export
          </button>
        </RequireRole>
      </div>

      {/* Create Export */}
      <RequireRole roles={[ADMIN_ROLES.ADMIN, ADMIN_ROLES.OPERATOR]}>
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Create Export</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                label="Funnel"
                name="funnelId"
                type="select"
                value={form.funnelId}
                onChange={(v) => setForm((f) => ({ ...f, funnelId: v }))}
                required
                options={funnelsData?.funnels.map((f) => ({ value: f, label: f })) || []}
              />
              <FormField
                label="Format"
                name="format"
                type="select"
                value={form.format}
                onChange={(v) => setForm((f) => ({ ...f, format: v as ExportFormat }))}
                required
                options={EXPORT_FORMATS.map((fmt) => ({ value: fmt, label: fmt.toUpperCase() }))}
              />
              <FormField
                label="Status Filter"
                name="status"
                type="select"
                value={form.status || ''}
                onChange={(v) => setForm((f) => ({ ...f, status: v || undefined }))}
                options={LEAD_STATUSES.map((s) => ({
                  value: s,
                  label: s.charAt(0).toUpperCase() + s.slice(1),
                }))}
              />
              <FormField
                label="Start Date"
                name="startDate"
                type="text"
                value={form.startDate || ''}
                onChange={(v) => setForm((f) => ({ ...f, startDate: v || undefined }))}
                placeholder="YYYY-MM-DD"
              />
              <FormField
                label="End Date"
                name="endDate"
                type="text"
                value={form.endDate || ''}
                onChange={(v) => setForm((f) => ({ ...f, endDate: v || undefined }))}
                placeholder="YYYY-MM-DD"
              />
            </div>
            <button
              type="submit"
              disabled={isCreating || !form.funnelId}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Export'}
            </button>
          </form>
        </div>
      </RequireRole>

      {/* Scheduled Exports */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Scheduled Exports</h2>
        </div>
        {schedulesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full border-[var(--border-color)] border-t-blue-600 h-6 w-6 border-2" />
          </div>
        ) : !schedulesData?.schedules?.length ? (
          <div className="px-6 py-12 text-center text-sm text-[var(--text-secondary)]">
            No scheduled exports. Click &quot;Schedule Export&quot; to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Funnel
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Format
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Frequency
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Time (UTC)
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Next Run
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {schedulesData.schedules.map((schedule) => (
                  <tr key={schedule.id} className="border-b border-[var(--border-color)]">
                    <td className="px-4 py-3 text-[var(--text-primary)]">{schedule.funnelId}</td>
                    <td className="px-4 py-3 uppercase text-xs font-mono text-[var(--text-secondary)]">
                      {schedule.format}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {FREQUENCY_LABELS[schedule.frequency]}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{schedule.timeUtc}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">
                      {schedule.deliveryEmail || '--'}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-tertiary)] text-xs">
                      {formatDate(schedule.nextRunAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={schedule.enabled ? 'active' : 'inactive'} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RequireRole roles={[ADMIN_ROLES.ADMIN]}>
                        <button
                          onClick={() => setConfirmDeleteId(schedule.id)}
                          className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          Delete
                        </button>
                      </RequireRole>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {error && <ErrorAlert message="Failed to load exports." onRetry={refetch} />}

      {/* Past Exports Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Past Exports</h2>
        </div>
        <DataTable
          columns={exportColumns}
          data={data?.exports || []}
          loading={isLoading}
          emptyMessage="No exports yet. Create your first export above."
          rowKey={(row) => row.jobId}
        />
        {data && data.exports.length > 0 && (
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

      {/* Schedule Export Modal */}
      <Modal
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Schedule Export"
        width="lg"
      >
        <form onSubmit={handleCreateSchedule} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Funnel"
              name="scheduleFunnelId"
              type="select"
              value={scheduleForm.funnelId}
              onChange={(v) => setScheduleForm((f) => ({ ...f, funnelId: v }))}
              required
              options={funnelsData?.funnels.map((f) => ({ value: f, label: f })) || []}
            />
            <FormField
              label="Format"
              name="scheduleFormat"
              type="select"
              value={scheduleForm.format}
              onChange={(v) => setScheduleForm((f) => ({ ...f, format: v as ExportFormat }))}
              required
              options={EXPORT_FORMATS.map((fmt) => ({ value: fmt, label: fmt.toUpperCase() }))}
            />
          </div>

          <FormField
            label="Frequency"
            name="frequency"
            type="select"
            value={scheduleForm.frequency}
            onChange={(v) => setScheduleForm((f) => ({ ...f, frequency: v as ScheduleFrequency }))}
            required
            options={Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />

          {scheduleForm.frequency === 'weekly' && (
            <FormField
              label="Day of Week"
              name="dayOfWeek"
              type="select"
              value={scheduleForm.dayOfWeekOrMonth}
              onChange={(v) => setScheduleForm((f) => ({ ...f, dayOfWeekOrMonth: v }))}
              options={DAY_OF_WEEK}
            />
          )}

          {scheduleForm.frequency === 'monthly' && (
            <FormField
              label="Day of Month"
              name="dayOfMonth"
              type="number"
              value={scheduleForm.dayOfWeekOrMonth}
              onChange={(v) => setScheduleForm((f) => ({ ...f, dayOfWeekOrMonth: v }))}
              placeholder="1-28"
            />
          )}

          <FormField
            label="Time (UTC)"
            name="timeUtc"
            value={scheduleForm.timeUtc}
            onChange={(v) => setScheduleForm((f) => ({ ...f, timeUtc: v }))}
            required
            placeholder="HH:mm"
          />

          {/* Email delivery */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableEmail"
                checked={scheduleForm.enableEmail}
                onChange={(e) => setScheduleForm((f) => ({ ...f, enableEmail: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="enableEmail" className="text-sm text-[var(--text-primary)]">
                Deliver via email
              </label>
            </div>
            {scheduleForm.enableEmail && (
              <FormField
                label="Email Address"
                name="deliveryEmail"
                type="email"
                value={scheduleForm.deliveryEmail}
                onChange={(v) => setScheduleForm((f) => ({ ...f, deliveryEmail: v }))}
                required
                placeholder="exports@company.com"
              />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowScheduleModal(false)}
              className="px-4 py-2 text-sm border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isScheduling || !scheduleForm.funnelId}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isScheduling ? 'Creating...' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Schedule */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDeleteSchedule}
        title="Delete Schedule"
        message="Are you sure you want to delete this export schedule? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
