import {
  ADMIN_PIPELINE_STATUSES,
  LEAD_STATUSES,
  type AdminPipelineStatus,
  type LeadStatus,
} from '@kanjona/shared';

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
  dnc: 'Do Not Contact',
  quarantined: 'Quarantined',
};

export const PIPELINE_LABELS: Record<AdminPipelineStatus, string> = {
  none: 'None',
  nurturing: 'Nurturing',
  negotiating: 'Negotiating',
  closing: 'Closing',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
};

export const LEAD_STATUS_OPTIONS: LeadStatus[] = [...LEAD_STATUSES];
export const PIPELINE_STATUS_OPTIONS: AdminPipelineStatus[] = [...ADMIN_PIPELINE_STATUSES];

export const LEAD_STATUS_FILTER_OPTIONS: { value: LeadStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  ...LEAD_STATUS_OPTIONS.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
];
