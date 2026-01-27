'use client';

/**
 * Notification Center
 *
 * Bell icon in the header with:
 * - Unread count badge
 * - Dropdown panel with recent notifications
 * - Mark as read on click
 * - Mark all as read
 * - Link to full notifications page
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  useListNotificationsQuery,
  useMarkNotificationReadMutation,
} from '@/store/services/notifications';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

const NOTIFICATION_TYPE_ICONS: Record<string, string> = {
  lead_new: 'text-blue-500',
  lead_assigned: 'text-green-500',
  lead_converted: 'text-purple-500',
  rule_matched: 'text-indigo-500',
  export_complete: 'text-cyan-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-400',
};

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: notifications } = useListNotificationsQuery(
    { page: 1, limit: 10 },
    { pollingInterval: 30000 } // Poll every 30 seconds
  );
  const [markRead] = useMarkNotificationReadMutation();

  const unreadCount = notifications?.items?.filter((n) => !n.readAt)?.length ?? 0;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
    }
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const handleNotificationClick = useCallback(
    (id: string) => {
      markRead(id);
    },
    [markRead]
  );

  const handleMarkAllRead = useCallback(() => {
    notifications?.items?.forEach((n) => {
      if (!n.readAt) markRead(n.id);
    });
  }, [notifications, markRead]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
      >
        <svg
          className="w-5 h-5 text-[var(--text-secondary)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {!notifications?.items || notifications.items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
                No notifications yet.
              </div>
            ) : (
              notifications.items.map((notification) => {
                const isUnread = !notification.readAt;
                const typeColor = NOTIFICATION_TYPE_ICONS[notification.type] || 'text-gray-400';
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id)}
                    className={`w-full text-left px-4 py-3 border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors ${
                      isUnread ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Unread dot */}
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                          isUnread ? 'bg-blue-500' : 'bg-transparent'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${isUnread ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                        >
                          {notification.message}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[var(--border-color)]">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center text-xs text-blue-600 dark:text-blue-400 hover:underline py-1"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
