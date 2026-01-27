'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  useInfiniteNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
  useNotificationCount,
  type NotificationType,
  type Notification,
} from '@/lib/notifications';
import { timeAgo, getDateGroup } from '@/lib/timeago';
import InfiniteScroll from '@/components/InfiniteScroll';
import EmptyState from '@/components/EmptyState';

// ── Notification type icons ──────────────────

function NotificationIcon({ type }: { type: NotificationType }) {
  const iconClass = 'h-5 w-5';
  switch (type) {
    case 'lead_received':
      return (
        <svg
          className={iconClass}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"
          />
        </svg>
      );
    case 'lead_assigned':
      return (
        <svg
          className={iconClass}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
          />
        </svg>
      );
    case 'lead_status_changed':
      return (
        <svg
          className={iconClass}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
          />
        </svg>
      );
    case 'team_member_joined':
      return (
        <svg
          className={iconClass}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
          />
        </svg>
      );
    case 'system_announcement':
      return (
        <svg
          className={iconClass}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
          />
        </svg>
      );
    default:
      return (
        <svg
          className={iconClass}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
      );
  }
}

const TYPE_BG_COLORS: Record<NotificationType, string> = {
  lead_received: 'bg-blue-100 text-blue-600',
  lead_assigned: 'bg-purple-100 text-purple-600',
  lead_status_changed: 'bg-yellow-100 text-yellow-600',
  team_member_joined: 'bg-green-100 text-green-600',
  system_announcement: 'bg-orange-100 text-orange-600',
};

const TYPE_FILTER_OPTIONS: { value: NotificationType | ''; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'lead_received', label: 'Lead received' },
  { value: 'lead_assigned', label: 'Lead assigned' },
  { value: 'lead_status_changed', label: 'Status changed' },
  { value: 'team_member_joined', label: 'Team member joined' },
  { value: 'system_announcement', label: 'Announcements' },
];

const READ_FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'false', label: 'Unread' },
  { value: 'true', label: 'Read' },
];

export default function NotificationsPage() {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<NotificationType | ''>('');
  const [readFilter, setReadFilter] = useState<string>('');

  const filters = useMemo(
    () => ({
      type: typeFilter || undefined,
      read: readFilter === '' ? undefined : readFilter === 'true',
    }),
    [typeFilter, readFilter]
  );

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteNotifications(filters);

  const { data: countData } = useNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  const allNotifications = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: { label: string; notifications: Notification[] }[] = [];
    let currentGroup = '';

    for (const n of allNotifications) {
      const group = getDateGroup(n.createdAt);
      if (group !== currentGroup) {
        currentGroup = group;
        groups.push({ label: group, notifications: [] });
      }
      groups[groups.length - 1].notifications.push(n);
    }

    return groups;
  }, [allNotifications]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  function handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      markRead.mutate(notification.id);
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          {countData && countData.unread > 0 && (
            <p className="mt-0.5 text-xs text-gray-500">{countData.unread} unread</p>
          )}
        </div>
        {countData && countData.unread > 0 && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="min-h-[36px] rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-100 disabled:opacity-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as NotificationType | '')}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          aria-label="Filter by type"
        >
          {TYPE_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Read/unread filter */}
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
          {READ_FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setReadFilter(option.value)}
              className={`min-h-[32px] rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                readFilter === option.value
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notification list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="skeleton h-10 w-10 flex-shrink-0 rounded-full" />
              <div className="flex-1">
                <div className="skeleton mb-2 h-4 w-3/4" />
                <div className="skeleton mb-1 h-3 w-full" />
                <div className="skeleton h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : allNotifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          description={
            typeFilter || readFilter
              ? 'Try adjusting your filters'
              : 'You are all caught up! New notifications will appear here.'
          }
          action={
            typeFilter || readFilter
              ? {
                  label: 'Clear filters',
                  onClick: () => {
                    setTypeFilter('');
                    setReadFilter('');
                  },
                }
              : undefined
          }
        />
      ) : (
        <InfiniteScroll
          hasMore={!!hasNextPage}
          isLoading={isFetchingNextPage}
          onLoadMore={handleLoadMore}
        >
          {groupedNotifications.map((group) => (
            <div key={group.label} className="mb-6">
              {/* Date group header */}
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {group.label}
              </h2>

              <div className="space-y-2">
                {group.notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`flex w-full items-start gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:shadow-md active:bg-gray-50 ${
                      notification.read ? 'border-gray-100' : 'border-brand-200 bg-brand-50/30'
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                        TYPE_BG_COLORS[notification.type] || 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <NotificationIcon type={notification.type} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm ${
                          notification.read ? 'text-gray-600' : 'font-semibold text-gray-900'
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">{notification.message}</p>
                      <p className="mt-1.5 text-[11px] text-gray-400">
                        <time dateTime={notification.createdAt}>
                          {timeAgo(notification.createdAt)}
                        </time>
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!notification.read && (
                      <div className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-brand-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </InfiniteScroll>
      )}
    </div>
  );
}
