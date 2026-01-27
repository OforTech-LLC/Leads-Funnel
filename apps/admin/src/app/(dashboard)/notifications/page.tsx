'use client';

/**
 * Notifications Page
 *
 * Enhanced notifications view with:
 * - Delivery notifications table (email/sms/webhook)
 * - Admin alert notifications with read/unread styling
 * - Mark as read on click, mark all as read
 * - Filter by type/channel/status
 * - Group by date
 */

import { useState, useMemo } from 'react';
import {
  useListDeliveryNotificationsQuery,
  useRetryNotificationMutation,
  useListNotificationsQuery as useListAlertsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '@/store/services/notifications';
import type { Notification, AdminNotification } from '@/store/services/notifications';
import DataTable from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import StatusBadge from '@/components/StatusBadge';
import ErrorAlert from '@/components/ErrorAlert';
import { formatRelativeTime, formatDate, truncate } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Group alerts by date
// ---------------------------------------------------------------------------

function groupByDate(items: AdminNotification[]): Record<string, AdminNotification[]> {
  const groups: Record<string, AdminNotification[]> = {};
  for (const item of items) {
    const date = new Date(item.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(item);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Tab types
// ---------------------------------------------------------------------------

type ActiveTab = 'alerts' | 'deliveries';

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('alerts');
  const toast = useToast();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Notifications</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          View admin alerts and notification delivery
        </p>
      </div>

      {/* Tab Selector */}
      <div className="flex items-center gap-1 border-b border-[var(--border-color)]">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'alerts'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Alerts
        </button>
        <button
          onClick={() => setActiveTab('deliveries')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'deliveries'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Delivery Log
        </button>
      </div>

      {activeTab === 'alerts' ? <AlertsSection /> : <DeliverySection />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alerts Section (Notification Center full page)
// ---------------------------------------------------------------------------

function AlertsSection() {
  const [typeFilter, setTypeFilter] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useListAlertsQuery({
    page,
    limit: 50,
    type: typeFilter || undefined,
    unreadOnly: unreadOnly || undefined,
  });

  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();
  const toast = useToast();

  const grouped = useMemo(() => {
    if (!data?.items) return {};
    return groupByDate(data.items);
  }, [data]);

  const handleMarkAllRead = async () => {
    try {
      await markAllRead().unwrap();
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark notifications as read');
    }
  };

  return (
    <>
      {/* Filters */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--text-primary)]"
          >
            <option value="">All Types</option>
            <option value="lead_new">New Lead</option>
            <option value="lead_assigned">Lead Assigned</option>
            <option value="lead_converted">Lead Converted</option>
            <option value="export_complete">Export Complete</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => {
                setUnreadOnly(e.target.checked);
                setPage(1);
              }}
              className="rounded border-gray-300"
            />
            Unread only
          </label>

          <div className="flex-1" />

          {data && data.unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Mark all as read ({data.unreadCount})
            </button>
          )}
        </div>
      </div>

      {error && <ErrorAlert message="Failed to load notifications." onRetry={refetch} />}

      {/* Grouped Alerts */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full border-[var(--border-color)] border-t-blue-600 h-8 w-8 border-2" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg py-16 text-center text-sm text-[var(--text-secondary)]">
          No notifications found.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2 px-1">{date}</h3>
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg divide-y divide-[var(--border-color)]">
                {items.map((notification) => {
                  const isUnread = !notification.readAt;
                  return (
                    <button
                      key={notification.id}
                      onClick={() => {
                        if (isUnread) markRead(notification.id);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-[var(--bg-tertiary)] transition-colors ${
                        isUnread ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                            isUnread ? 'bg-blue-500' : 'bg-transparent'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${
                              isUnread
                                ? 'font-medium text-[var(--text-primary)]'
                                : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-[var(--text-tertiary)]">
                              {formatRelativeTime(notification.createdAt)}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">
                              {notification.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Delivery Log Section (original notifications table)
// ---------------------------------------------------------------------------

function DeliverySection() {
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const toast = useToast();

  const { data, isLoading, error, refetch } = useListDeliveryNotificationsQuery({
    channel: (channel as Notification['channel']) || undefined,
    status: (status as Notification['status']) || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    pageSize,
  });

  const [retryNotification] = useRetryNotificationMutation();

  const handleRetry = async (id: string) => {
    try {
      await retryNotification(id).unwrap();
      toast.success('Notification retry initiated');
    } catch {
      toast.error('Failed to retry notification');
    }
  };

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
              handleRetry(row.notificationId);
            }}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Retry
          </button>
        ) : null,
    },
  ];

  return (
    <>
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
    </>
  );
}
