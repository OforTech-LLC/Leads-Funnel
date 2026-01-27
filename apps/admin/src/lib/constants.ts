/**
 * Application constants
 */

export const AUTH_COOKIE_NAME = 'admin_token';

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'converted',
  'lost',
  'dnc',
  'quarantined',
] as const;

export const PIPELINE_STATUSES = [
  'none',
  'nurturing',
  'negotiating',
  'closing',
  'closed_won',
  'closed_lost',
] as const;

export const EXPORT_FORMATS = ['csv', 'xlsx', 'pdf', 'docx', 'json'] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  qualified: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  converted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  lost: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  dnc: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  quarantined: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: 'dashboard' },
  { label: 'Organizations', href: '/orgs', icon: 'orgs' },
  { label: 'Users', href: '/users', icon: 'users' },
  { label: 'Assignment Rules', href: '/rules', icon: 'rules' },
  { label: 'Leads', href: '/leads', icon: 'leads' },
  { label: 'Notifications', href: '/notifications', icon: 'notifications' },
  { label: 'Exports', href: '/exports', icon: 'exports' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
] as const;
