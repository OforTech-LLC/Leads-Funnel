'use client';

/**
 * Notifications Page
 *
 * Lists recent notifications with filter by channel, status, and date.
 */

import { useState } from 'react';
import {
  useListNotificationsQuery,
  useRetryNotificationMutation,
} from '@/store/services/notifications';
import type { Notification } from '@/store/services/notifications';
import DataTable from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import StatusBadge from '@/components/StatusBadge';
import ErrorAlert from '@/components/ErrorAlert';
import { formatRelativeTime, truncate } from '@/lib/utils';
import Link from 'next/link';

export default function NotificationsPage() {
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  const { data, isLoading, error, refetch } = useListNotificationsQuery({
    channel: (channel as Notification['channel']) || undefined,
    status: (status as Notification['status']) || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    pageSize,
  });

  const [retryNotification] = useRetryNotificationMutation();

  const columns: Column<Notification>[] = [
    {
      key: 'channel',
      header: 'Channel',
      render: (row) => <span className="capitalize text-[var(--text-primary)]">{row.channel}</span>,
    },
    {
      key: 'recipient',
      header: 'Recipient',
      render: (row) => (
        <span className="text-[var(--text-secondary)]">{truncate(row.recipient, 30)}</span>
      ),
    },
    {
      key: 'subject',
      header: 'Subject / Template',
      render: (row) => (
        <span className="text-[var(--text-secondary)]">{row.subject || row.template || '--'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'leadId',
      header: 'Lead',
      render: (row) => (
        <Link
          href={`/leads/${row.funnelId}/${row.leadId}`}
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-xs"
        >
          {truncate(row.leadId, 12)}
        </Link>
      ),
    },
    {
      key: 'sentAt',
      header: 'Sent',
      render: (row) => (
        <span className="text-[var(--text-tertiary)]">{formatRelativeTime(row.sentAt)}</span>
      ),
    },
    {
      key: 'error',
      header: 'Error',
      render: (row) => (
        <span className="text-xs text-red-600 dark:text-red-400">{row.error || '--'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        row.status === 'failed' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              retryNotification(row.notificationId);
            }}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Retry
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Notifications</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          View and manage notification delivery
        </p>
      </div>

      {/* Filters */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
        <div className="flex flex-wrap gap-4">
          <select
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--text-primary)]"
          >
            <option value="">All Channels</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="webhook">Webhook</option>
          </select>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--text-primary)]"
          >
            <option value="">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="retrying">Retrying</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--text-primary)]"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--text-primary)]"
          />
        </div>
      </div>

      {error && <ErrorAlert message="Failed to load notifications." onRetry={refetch} />}

      {/* Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
        <DataTable
          columns={columns}
          data={data?.notifications || []}
          loading={isLoading}
          emptyMessage="No notifications found."
          rowKey={(row) => row.notificationId}
        />
        {data && data.notifications.length > 0 && (
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
