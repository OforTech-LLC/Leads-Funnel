'use client';

import Link from 'next/link';
import { useRecentActivity, type ActivityItem } from '@/lib/analytics';
import { timeAgo } from '@/lib/timeago';

// ── Activity type icons ──────────────────────

function ActivityIcon({ type }: { type: ActivityItem['type'] }) {
  switch (type) {
    case 'lead_received':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
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
              d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"
            />
          </svg>
        </div>
      );
    case 'status_changed':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
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
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
            />
          </svg>
        </div>
      );
    case 'note_added':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
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
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
            />
          </svg>
        </div>
      );
    case 'member_joined':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600">
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
              d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
            />
          </svg>
        </div>
      );
  }
}

// ── Activity Feed Component ──────────────────

interface ActivityFeedProps {
  className?: string;
}

export default function ActivityFeed({ className = '' }: ActivityFeedProps) {
  const { data: activities, isLoading } = useRecentActivity();

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="skeleton h-8 w-8 flex-shrink-0 rounded-full" />
            <div className="flex-1">
              <div className="skeleton mb-1 h-4 w-3/4" />
              <div className="skeleton h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <p className="text-sm text-gray-400">No recent activity</p>
      </div>
    );
  }

  return (
    <div className={`space-y-0 ${className}`}>
      {activities.map((activity, index) => {
        const content = (
          <div className="relative flex items-start gap-3 py-3">
            {/* Connecting line */}
            {index < activities.length - 1 && (
              <div className="absolute left-4 top-11 h-full w-px bg-gray-100" />
            )}

            {/* Icon */}
            <ActivityIcon type={activity.type} />

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-700">{activity.description}</p>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                <span>{activity.performedByName}</span>
                <span aria-hidden="true">--</span>
                <time dateTime={activity.createdAt}>{timeAgo(activity.createdAt)}</time>
              </div>
            </div>
          </div>
        );

        // Wrap in link if we have lead context
        if (activity.leadId && activity.funnelId) {
          return (
            <Link
              key={activity.id}
              href={`/leads/${activity.funnelId}/${activity.leadId}`}
              className="block rounded-lg transition-colors hover:bg-gray-50"
            >
              {content}
            </Link>
          );
        }

        return <div key={activity.id}>{content}</div>;
      })}
    </div>
  );
}
