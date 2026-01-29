'use client';

/**
 * Colored Status Badge
 *
 * Displays a lead status in a pill-shaped badge with color coding
 * and a dot indicator.
 */

import type { LeadStatus } from '@/lib/types';
import { STATUS_BADGE_STYLES } from '@/lib/lead-status';

interface StatusBadgeProps {
  status: LeadStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_BADGE_STYLES[status] || STATUS_BADGE_STYLES.new;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bgClass} ${config.textClass} ${sizeClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
    </span>
  );
}
