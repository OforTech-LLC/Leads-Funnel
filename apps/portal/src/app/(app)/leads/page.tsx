'use client';

import { useState, useCallback, useMemo } from 'react';
import { useLeads, useUpdateLeadStatus } from '@/lib/queries/leads';
import LeadCard from '@/components/LeadCard';
import InfiniteScroll from '@/components/InfiniteScroll';
import PullToRefresh from '@/components/PullToRefresh';
import EmptyState from '@/components/EmptyState';
import { LeadListSkeleton } from '@/components/LoadingSpinner';
import type { LeadStatus, LeadFilters } from '@/lib/types';

const STATUS_OPTIONS: { value: LeadStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'booked', label: 'Booked' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'dnc', label: 'DNC' },
];

export default function LeadsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);

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
    }),
    [debouncedSearch, statusFilter]
  );

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useLeads(filters);

  const updateStatus = useUpdateLeadStatus();

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      {/* Search bar */}
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

        {/* Filter toggle */}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
            showFilters || statusFilter
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
        <div className="mb-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
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
      )}

      {/* Results count */}
      {!isLoading && (
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {totalCount} {totalCount === 1 ? 'lead' : 'leads'}
            {statusFilter && (
              <span className="ml-1">
                filtered by <span className="font-medium">{statusFilter}</span>
              </span>
            )}
          </p>
        </div>
      )}

      {/* Lead list */}
      {isLoading ? (
        <LeadListSkeleton count={8} />
      ) : allLeads.length === 0 ? (
        <EmptyState
          title="No leads found"
          description={
            search || statusFilter
              ? 'Try adjusting your search or filters'
              : 'New leads will appear here when they come in'
          }
          action={
            search || statusFilter
              ? {
                  label: 'Clear filters',
                  onClick: () => {
                    setSearch('');
                    setDebouncedSearch('');
                    setStatusFilter('');
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
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onStatusChange={handleStatusChange}
                  isUpdating={updateStatus.isPending && updateStatus.variables?.leadId === lead.id}
                />
              ))}
            </div>
          </InfiniteScroll>
        </PullToRefresh>
      )}
    </div>
  );
}
