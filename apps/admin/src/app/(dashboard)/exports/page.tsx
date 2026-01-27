'use client';

/**
 * Exports Page
 *
 * Create data exports and view past export jobs with download links.
 */

import { useState, useCallback } from 'react';
import {
  useListExportsQuery,
  useCreateExportMutation,
  useLazyGetExportDownloadUrlQuery,
} from '@/store/services/exports';
import type { ExportJob, CreateExportRequest } from '@/store/services/exports';
import { useListFunnelsQuery } from '@/store/services/leads';
import DataTable from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import StatusBadge from '@/components/StatusBadge';
import FormField from '@/components/FormField';
import ErrorAlert from '@/components/ErrorAlert';
import { EXPORT_FORMATS, LEAD_STATUSES } from '@/lib/constants';
import type { ExportFormat, LeadStatus } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';

/**
 * Validate that a download URL points to an allowed origin.
 */
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

export default function ExportsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  const { data, isLoading, error, refetch } = useListExportsQuery({ page, pageSize });
  const { data: funnelsData } = useListFunnelsQuery();
  const [createExport, { isLoading: isCreating }] = useCreateExportMutation();
  const [getDownloadUrl] = useLazyGetExportDownloadUrlQuery();

  const [form, setForm] = useState<CreateExportRequest>({
    funnelId: '',
    format: 'csv',
    status: undefined,
    startDate: undefined,
    endDate: undefined,
  });

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await createExport(form).unwrap();
        setForm({
          funnelId: '',
          format: 'csv',
          status: undefined,
          startDate: undefined,
          endDate: undefined,
        });
      } catch {
        // Error handled by RTK Query
      }
    },
    [createExport, form]
  );

  const handleDownload = useCallback(
    async (jobId: string) => {
      try {
        const result = await getDownloadUrl(jobId).unwrap();
        if (result.downloadUrl && isValidDownloadUrl(result.downloadUrl)) {
          window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
        } else {
          console.error('Invalid download URL received');
        }
      } catch {
        // Error handled silently
      }
    },
    [getDownloadUrl]
  );

  const columns: Column<ExportJob>[] = [
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
      key: 'completedAt',
      header: 'Completed',
      render: (row) => (
        <span className="text-[var(--text-tertiary)]">
          {row.completedAt ? formatDateTime(row.completedAt) : '--'}
        </span>
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
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Exports</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Export lead data in various formats
        </p>
      </div>

      {/* Create Export */}
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

      {error && <ErrorAlert message="Failed to load exports." onRetry={refetch} />}

      {/* Exports Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Past Exports</h2>
        </div>
        <DataTable
          columns={columns}
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
    </div>
  );
}
