'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  useLeads,
  useUpdateLeadStatus,
  useBulkUpdateStatus,
  useBulkAssignLeads,
} from '@/lib/queries/leads';
import { useTeamMembers } from '@/lib/queries/team';
import LeadCard from '@/components/LeadCard';
import InfiniteScroll from '@/components/InfiniteScroll';
import PullToRefresh from '@/components/PullToRefresh';
import EmptyState from '@/components/EmptyState';
import ExportModal from '@/components/ExportModal';
import { LeadListSkeleton } from '@/components/LoadingSpinner';
import { toast } from '@/lib/toast';
import type { LeadStatus, LeadFilters, Lead } from '@/lib/types';

const STATUS_OPTIONS: { value: LeadStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'booked', label: 'Booked' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'dnc', label: 'DNC' },
];

const BULK_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'booked', label: 'Booked' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'dnc', label: 'DNC' },
];

const DATE_PRESETS = [
  {
    label: 'Today',
    getValue: () => {
      const d = new Date();
      return { from: d.toISOString().split('T')[0], to: d.toISOString().split('T')[0] };
    },
  },
  {
    label: 'This Week',
    getValue: () => {
      const d = new Date();
      const day = d.getDay();
      const start = new Date(d);
      start.setDate(d.getDate() - day);
      return { from: start.toISOString().split('T')[0], to: d.toISOString().split('T')[0] };
    },
  },
  {
    label: 'This Month',
    getValue: () => {
      const d = new Date();
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      return { from: start.toISOString().split('T')[0], to: d.toISOString().split('T')[0] };
    },
  },
  {
    label: 'Last 30 Days',
    getValue: () => {
      const d = new Date();
      const start = new Date(d);
      start.setDate(d.getDate() - 30);
      return { from: start.toISOString().split('T')[0], to: d.toISOString().split('T')[0] };
    },
  },
];

export default function LeadsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkStatus, setShowBulkStatus] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (value: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => setDebouncedSearch(value), 300);
    };
  }, []);

  function handleSearchChange(value: string) {
    setSearch(value);
    debounceTimer(value);
  }

  const filters: LeadFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [debouncedSearch, statusFilter, dateFrom, dateTo]
  );

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useLeads(filters);

  const updateStatus = useUpdateLeadStatus();
  const bulkUpdateStatus = useBulkUpdateStatus();
  const bulkAssign = useBulkAssignLeads();
  const { data: teamMembers } = useTeamMembers();

  const allLeads = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

  const totalCount = data?.pages[0]?.total ?? 0;

  const handleStatusChange = useCallback(
    (leadId: string, funnelId: string, status: LeadStatus) => {
      updateStatus.mutate({ leadId, funnelId, status });
    },
    [updateStatus]
  );

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Selection handlers
  const toggleSelect = useCallback((leadId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === allLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allLeads.map((l) => l.id)));
    }
  }, [allLeads, selectedIds.size]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setShowBulkStatus(false);
    setShowBulkAssign(false);
  }, []);

  // Get selected leads with their funnelId
  const selectedLeads = useMemo(
    () =>
      allLeads
        .filter((l) => selectedIds.has(l.id))
        .map((l) => ({ leadId: l.id, funnelId: l.funnelId })),
    [allLeads, selectedIds]
  );

  function handleBulkStatusChange(status: LeadStatus) {
    bulkUpdateStatus.mutate(
      { leads: selectedLeads, status },
      {
        onSuccess: () => {
          toast.success(`${selectedLeads.length} leads updated to ${status}`);
          clearSelection();
        },
        onError: () => toast.error('Failed to update leads'),
      }
    );
    setShowBulkStatus(false);
  }

  function handleBulkAssign(assignedTo: string) {
    bulkAssign.mutate(
      { leads: selectedLeads, assignedTo },
      {
        onSuccess: () => {
          toast.success(`${selectedLeads.length} leads assigned`);
          clearSelection();
        },
        onError: () => toast.error('Failed to assign leads'),
      }
    );
    setShowBulkAssign(false);
  }

  function handleDatePreset(preset: (typeof DATE_PRESETS)[0]) {
    const { from, to } = preset.getValue();
    setDateFrom(from);
    setDateTo(to);
  }

  function clearDateFilter() {
    setDateFrom('');
    setDateTo('');
  }

  const hasActiveFilters = statusFilter || dateFrom || dateTo;
  const isSelectMode = selectedIds.size > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      {/* Search bar + Export button */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="search"
            placeholder="Search name, email, zip..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            aria-label="Search leads"
          />
        </div>

        {/* Export button */}
        <button
          type="button"
          onClick={() => setShowExportModal(true)}
          className="flex h-11 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 active:bg-gray-100"
          aria-label="Export leads"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Filter toggle */}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
            showFilters || hasActiveFilters
              ? 'border-brand-200 bg-brand-50 text-brand-600'
              : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
          }`}
          aria-label="Toggle filters"
          aria-expanded={showFilters}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
            />
          </svg>
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="mb-4 space-y-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          {/* Status filters */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
              Status
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value as LeadStatus | '')}
                  className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === option.value
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date range filters */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
              Date Range
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleDatePreset(preset)}
                  className="min-h-[36px] rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 active:bg-gray-300"
                >
                  {preset.label}
                </button>
              ))}
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={clearDateFilter}
                  className="min-h-[36px] rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                >
                  Clear dates
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label htmlFor="date-from" className="sr-only">
                  From date
                </label>
                <input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  placeholder="From"
                />
              </div>
              <span className="text-xs text-gray-400">to</span>
              <div className="flex-1">
                <label htmlFor="date-to" className="sr-only">
                  To date
                </label>
                <input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  placeholder="To"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results count and select all */}
      {!isLoading && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {allLeads.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size === allLeads.length && allLeads.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  aria-label="Select all leads"
                />
                <span className="text-xs text-gray-500">Select all</span>
              </label>
            )}
            <p className="text-xs text-gray-500">
              {totalCount} {totalCount === 1 ? 'lead' : 'leads'}
              {statusFilter && (
                <span className="ml-1">
                  filtered by <span className="font-medium">{statusFilter}</span>
                </span>
              )}
              {(dateFrom || dateTo) && (
                <span className="ml-1">
                  {dateFrom && dateTo
                    ? `from ${dateFrom} to ${dateTo}`
                    : dateFrom
                      ? `from ${dateFrom}`
                      : `until ${dateTo}`}
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Lead list */}
      {isLoading ? (
        <LeadListSkeleton count={8} />
      ) : allLeads.length === 0 ? (
        <EmptyState
          title="No leads found"
          description={
            search || statusFilter || dateFrom || dateTo
              ? 'Try adjusting your search or filters'
              : 'New leads will appear here when they come in'
          }
          action={
            search || statusFilter || dateFrom || dateTo
              ? {
                  label: 'Clear filters',
                  onClick: () => {
                    setSearch('');
                    setDebouncedSearch('');
                    setStatusFilter('');
                    setDateFrom('');
                    setDateTo('');
                  },
                }
              : undefined
          }
        />
      ) : (
        <PullToRefresh onRefresh={handleRefresh}>
          <InfiniteScroll
            hasMore={!!hasNextPage}
            isLoading={isFetchingNextPage}
            onLoadMore={handleLoadMore}
          >
            <div className="space-y-3">
              {allLeads.map((lead) => (
                <div key={lead.id} className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div className="mt-4 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      aria-label={`Select ${lead.firstName} ${lead.lastName}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <LeadCard
                      lead={lead}
                      onStatusChange={handleStatusChange}
                      isUpdating={
                        updateStatus.isPending && updateStatus.variables?.leadId === lead.id
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </InfiniteScroll>
        </PullToRefresh>
      )}

      {/* Floating bulk action bar */}
      {isSelectMode && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 lg:bottom-6 animate-slide-up">
          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-xl">
            <span className="mr-2 text-sm font-medium text-gray-900">
              {selectedIds.size} selected
            </span>

            {/* Change Status */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowBulkStatus(!showBulkStatus);
                  setShowBulkAssign(false);
                }}
                disabled={bulkUpdateStatus.isPending}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-50"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                  />
                </svg>
                Status
              </button>
              {showBulkStatus && (
                <div className="absolute bottom-full left-0 mb-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  {BULK_STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleBulkStatusChange(opt.value)}
                      className="flex w-full min-h-[40px] items-center px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Assign To */}
            {teamMembers && teamMembers.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkAssign(!showBulkAssign);
                    setShowBulkStatus(false);
                  }}
                  disabled={bulkAssign.isPending}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100 disabled:opacity-50"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                  Assign
                </button>
                {showBulkAssign && (
                  <div className="absolute bottom-full left-0 mb-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {teamMembers.map((member) => (
                      <button
                        key={member.userId}
                        type="button"
                        onClick={() => handleBulkAssign(member.userId)}
                        className="flex w-full min-h-[40px] items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700">
                          {member.firstName.charAt(0)}
                          {member.lastName.charAt(0)}
                        </span>
                        {member.firstName} {member.lastName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Export */}
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              Export
            </button>

            {/* Clear */}
            <button
              type="button"
              onClick={clearSelection}
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Clear selection"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />
    </div>
  );
}
