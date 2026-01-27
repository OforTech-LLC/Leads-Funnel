'use client';

/**
 * Leads Search Page
 *
 * Cross-funnel lead search with filters, pagination, and bulk actions.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  useQueryLeadsQuery,
  useBulkUpdateLeadsMutation,
  useListFunnelsQuery,
} from '@/store/services/leads';
import type { Lead, QueryLeadsParams } from '@/store/services/leads';
import DataTable from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import FormField from '@/components/FormField';
import ErrorAlert from '@/components/ErrorAlert';
import { LEAD_STATUSES } from '@/lib/constants';
import type { LeadStatus } from '@/lib/constants';
import { formatRelativeTime, truncate } from '@/lib/utils';

export default function LeadsPage() {
  const router = useRouter();

  // Filters
  const [funnelId, setFunnelId] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [orgId, setOrgId] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [tokenStack, setTokenStack] = useState<(string | undefined)[]>([undefined]);
  const [currentPage, setCurrentPage] = useState(1);

  // Selection for bulk actions
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showBulkAction, setShowBulkAction] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<LeadStatus | ''>('');

  const { data: funnelsData } = useListFunnelsQuery();

  const queryParams: QueryLeadsParams = {
    funnelId: funnelId || undefined,
    status: (status as LeadStatus) || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    search: search || undefined,
    orgId: orgId || undefined,
    zipCode: zipCode || undefined,
    pageSize,
    nextToken: tokenStack[tokenStack.length - 1],
  };

  const { data, isLoading, error, refetch } = useQueryLeadsQuery(queryParams);
  const [bulkUpdate, { isLoading: isBulkUpdating }] = useBulkUpdateLeadsMutation();

  const columns: Column<Lead>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => <span className="font-medium text-[var(--text-primary)]">{row.name}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => (
        <span className="text-[var(--text-secondary)]">{truncate(row.email, 30)}</span>
      ),
    },
    {
      key: 'funnelId',
      header: 'Funnel',
      render: (row) => <span className="text-[var(--text-secondary)]">{row.funnelId}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'assignedOrgName',
      header: 'Assigned To',
      render: (row) => (
        <span className="text-[var(--text-secondary)]">{row.assignedOrgName || 'Unassigned'}</span>
      ),
    },
    {
      key: 'zipCode',
      header: 'Zip',
      render: (row) => <span className="text-[var(--text-tertiary)]">{row.zipCode || '--'}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => (
        <span className="text-[var(--text-tertiary)]">{formatRelativeTime(row.createdAt)}</span>
      ),
    },
  ];

  const handleSelectRow = useCallback((key: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!data) return;
    setSelectedRows((prev) => {
      if (prev.size === data.leads.length) {
        return new Set();
      }
      return new Set(data.leads.map((l) => l.leadId));
    });
  }, [data]);

  const handleBulkUpdate = useCallback(async () => {
    if (!bulkStatus || selectedRows.size === 0) return;
    // Group by funnelId
    const leadsByFunnel = new Map<string, string[]>();
    data?.leads.forEach((lead) => {
      if (selectedRows.has(lead.leadId)) {
        const existing = leadsByFunnel.get(lead.funnelId) || [];
        existing.push(lead.leadId);
        leadsByFunnel.set(lead.funnelId, existing);
      }
    });

    try {
      for (const [funnel, leadIds] of leadsByFunnel) {
        await bulkUpdate({ funnelId: funnel, leadIds, status: bulkStatus as LeadStatus }).unwrap();
      }
      setShowBulkAction(false);
      setSelectedRows(new Set());
      setBulkStatus('');
    } catch {
      // Error handled by RTK Query
    }
  }, [bulkUpdate, bulkStatus, selectedRows, data]);

  const handleNextPage = useCallback(() => {
    if (data?.nextToken) {
      setTokenStack((prev) => [...prev, data.nextToken]);
      setCurrentPage((p) => p + 1);
    }
  }, [data]);

  const handlePrevPage = useCallback(() => {
    setTokenStack((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const resetFilters = useCallback(() => {
    setFunnelId('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setOrgId('');
    setZipCode('');
    setTokenStack([undefined]);
    setCurrentPage(1);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Leads</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Search and manage leads across all funnels
        </p>
      </div>

      {/* Filters */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setTokenStack([undefined]);
              setCurrentPage(1);
            }}
            className="col-span-full md:col-span-2 px-3 py-2 text-sm border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={funnelId}
            onChange={(e) => {
              setFunnelId(e.target.value);
              setTokenStack([undefined]);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--text-primary)]"
          >
            <option value="">All Funnels</option>
            {funnelsData?.funnels.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setTokenStack([undefined]);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--text-primary)]"
          >
            <option value="">All Statuses</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setTokenStack([undefined]);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--text-primary)]"
            placeholder="Start date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setTokenStack([undefined]);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--text-primary)]"
            placeholder="End date"
          />
          <input
            type="text"
            placeholder="Zip code"
            value={zipCode}
            onChange={(e) => {
              setZipCode(e.target.value);
              setTokenStack([undefined]);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={resetFilters}
            className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)]"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedRows.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-blue-800 dark:text-blue-200">
            {selectedRows.size} lead{selectedRows.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedRows(new Set())}
              className="text-sm text-blue-700 dark:text-blue-300 hover:underline"
            >
              Clear selection
            </button>
            <button
              onClick={() => setShowBulkAction(true)}
              className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Bulk Update Status
            </button>
          </div>
        </div>
      )}

      {error && <ErrorAlert message="Failed to load leads." onRetry={refetch} />}

      {/* Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
        <DataTable
          columns={columns}
          data={data?.leads || []}
          loading={isLoading}
          emptyMessage="No leads found matching the current filters."
          rowKey={(row) => row.leadId}
          onRowClick={(row) => router.push(`/leads/${row.funnelId}/${row.leadId}`)}
          selectedRows={selectedRows}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAll}
        />
        {data && data.leads.length > 0 && (
          <Pagination
            total={data.totalCount}
            pageSize={pageSize}
            hasNext={!!data.nextToken}
            hasPrev={currentPage > 1}
            onNext={handleNextPage}
            onPrev={handlePrevPage}
            currentPage={currentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setTokenStack([undefined]);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* Bulk Action Modal */}
      <Modal
        open={showBulkAction}
        onClose={() => setShowBulkAction(false)}
        title="Bulk Update Status"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Update status for {selectedRows.size} selected lead{selectedRows.size !== 1 ? 's' : ''}.
          </p>
          <FormField
            label="New Status"
            name="bulkStatus"
            type="select"
            value={bulkStatus}
            onChange={(v) => setBulkStatus(v as LeadStatus)}
            options={LEAD_STATUSES.map((s) => ({
              value: s,
              label: s.charAt(0).toUpperCase() + s.slice(1),
            }))}
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowBulkAction(false)}
              className="px-4 py-2 text-sm border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkUpdate}
              disabled={isBulkUpdating || !bulkStatus}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isBulkUpdating ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
