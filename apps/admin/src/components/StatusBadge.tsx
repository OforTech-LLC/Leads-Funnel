'use client';

/**
 * Colored Status Badge
 *
 * Displays a status string in a pill-shaped badge with color coding.
 */

import { STATUS_COLORS } from '@/lib/constants';
import { formatStatus } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const colorClass =
    STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}
    >
      {formatStatus(status)}
    </span>
  );
}
