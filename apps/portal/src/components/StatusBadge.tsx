'use client';

import type { LeadStatus } from '@/lib/types';

const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; bgClass: string; textClass: string; dotClass: string }
> = {
  new: {
    label: 'New',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    dotClass: 'bg-blue-500',
  },
  contacted: {
    label: 'Contacted',
    bgClass: 'bg-yellow-50',
    textClass: 'text-yellow-700',
    dotClass: 'bg-yellow-500',
  },
  booked: {
    label: 'Booked',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700',
    dotClass: 'bg-purple-500',
  },
  won: {
    label: 'Won',
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
    dotClass: 'bg-green-500',
  },
  lost: {
    label: 'Lost',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    dotClass: 'bg-red-500',
  },
  dnc: {
    label: 'DNC',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-600',
    dotClass: 'bg-gray-400',
  },
};

interface StatusBadgeProps {
  status: LeadStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.new;
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
