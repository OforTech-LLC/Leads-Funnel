import { LEAD_STATUSES, type LeadStatus } from '@kanjona/shared';

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  assigned: 'Assigned',
  unassigned: 'Unassigned',
  contacted: 'Contacted',
  qualified: 'Qualified',
  booked: 'Booked',
  converted: 'Converted',
  won: 'Won',
  lost: 'Lost',
  dnc: 'DNC',
  quarantined: 'Quarantined',
};

export const STATUS_BADGE_STYLES: Record<
  LeadStatus,
  { label: string; bgClass: string; textClass: string; dotClass: string }
> = {
  new: {
    label: STATUS_LABELS.new,
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    dotClass: 'bg-blue-500',
  },
  assigned: {
    label: STATUS_LABELS.assigned,
    bgClass: 'bg-cyan-50',
    textClass: 'text-cyan-700',
    dotClass: 'bg-cyan-500',
  },
  unassigned: {
    label: STATUS_LABELS.unassigned,
    bgClass: 'bg-slate-50',
    textClass: 'text-slate-600',
    dotClass: 'bg-slate-400',
  },
  contacted: {
    label: STATUS_LABELS.contacted,
    bgClass: 'bg-yellow-50',
    textClass: 'text-yellow-700',
    dotClass: 'bg-yellow-500',
  },
  qualified: {
    label: STATUS_LABELS.qualified,
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700',
    dotClass: 'bg-purple-500',
  },
  booked: {
    label: STATUS_LABELS.booked,
    bgClass: 'bg-indigo-50',
    textClass: 'text-indigo-700',
    dotClass: 'bg-indigo-500',
  },
  converted: {
    label: STATUS_LABELS.converted,
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
    dotClass: 'bg-green-500',
  },
  won: {
    label: STATUS_LABELS.won,
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    dotClass: 'bg-emerald-500',
  },
  lost: {
    label: STATUS_LABELS.lost,
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    dotClass: 'bg-red-500',
  },
  dnc: {
    label: STATUS_LABELS.dnc,
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-600',
    dotClass: 'bg-gray-400',
  },
  quarantined: {
    label: STATUS_LABELS.quarantined,
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-700',
    dotClass: 'bg-orange-500',
  },
};

export const STATUS_DOT_COLORS: Record<LeadStatus, string> = Object.fromEntries(
  LEAD_STATUSES.map((status) => [status, STATUS_BADGE_STYLES[status].dotClass])
) as Record<LeadStatus, string>;

const PORTAL_STATUS_ORDER: LeadStatus[] = ['new', 'contacted', 'booked', 'won', 'lost', 'dnc'];

const PORTAL_EXPORT_STATUS_ORDER: LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'booked',
  'won',
  'lost',
  'dnc',
];

export const PORTAL_STATUS_OPTIONS: { value: LeadStatus; label: string }[] =
  PORTAL_STATUS_ORDER.map((status) => ({
    value: status,
    label: STATUS_LABELS[status],
  }));

export const PORTAL_STATUS_FILTER_OPTIONS: { value: LeadStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  ...PORTAL_STATUS_OPTIONS,
];

export const PORTAL_EXPORT_STATUS_OPTIONS: { value: LeadStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  ...PORTAL_EXPORT_STATUS_ORDER.map((status) => ({
    value: status,
    label: STATUS_LABELS[status],
  })),
];
