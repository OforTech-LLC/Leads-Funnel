'use client';

/**
 * Colored Status Badge
 *
 * Displays a status string in a pill-shaped badge with color coding
 * and an optional dot indicator.
 */

import type { LeadStatus } from '@kanjona/shared';
import { STATUS_COLORS } from '@/lib/constants';
import { formatStatus } from '@/lib/utils';

/**
 * Color configuration per lead status, including a dot color.
 * Falls back to a generic gray badge for unknown statuses.
 */
const STATUS_DOT_COLORS: Record<string, string> = {
  new: 'bg-blue-500',
  contacted: 'bg-yellow-500',
  qualified: 'bg-purple-500',
  converted: 'bg-green-500',
  lost: 'bg-gray-400',
  dnc: 'bg-red-500',
  quarantined: 'bg-orange-500',
  booked: 'bg-indigo-500',
  won: 'bg-emerald-500',
  active: 'bg-green-500',
  inactive: 'bg-gray-400',
  pending: 'bg-yellow-500',
  processing: 'bg-blue-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  sent: 'bg-green-500',
};

interface StatusBadgeProps {
  status: LeadStatus | string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  const colorClass =
    STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  const dotClass = STATUS_DOT_COLORS[status] || 'bg-gray-400';
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${colorClass} ${sizeClasses} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {formatStatus(status)}
    </span>
  );
}
