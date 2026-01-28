// ──────────────────────────────────────────────
// Centralized constants for the Portal app
//
// Replaces hardcoded strings scattered across
// components and query hooks.
// ──────────────────────────────────────────────

import type { LeadStatus } from '@/lib/types';

// ── Auth ──────────────────────────────────────

export const AUTH_COOKIE_NAME = 'portal_token';

export const AUTH_ENDPOINT = '/api/auth';

// ── Storage Keys (localStorage/sessionStorage) ──

export const STORAGE_KEYS = {
  OAUTH_STATE: 'portal_oauth_state',
} as const;

// ── API endpoints ─────────────────────────────

export const API_ENDPOINTS = {
  // Profile
  PROFILE: '/api/v1/portal/profile',
  PROFILE_NOTIFICATIONS: '/api/v1/portal/profile/notifications',
  PROFILE_SERVICE_PREFERENCES: '/api/v1/portal/profile/service-preferences',
  PROFILE_NOTIFICATION_PREFERENCES: '/api/v1/portal/profile/notification-preferences',

  // Organization
  ORG: (orgId: string) => `/api/v1/portal/orgs/${orgId}`,

  // Team
  TEAM_MEMBERS: '/api/v1/portal/org/members',
  TEAM_INVITES: '/api/v1/portal/org/members/invites',
  TEAM_INVITE: '/api/v1/portal/org/members/invite',
  TEAM_MEMBER: (userId: string) => `/api/v1/portal/org/members/${userId}`,
  TEAM_MEMBER_ROLE: (userId: string) => `/api/v1/portal/org/members/${userId}/role`,

  // Leads
  LEADS: '/api/v1/portal/leads',
  LEAD_DETAIL: (funnelId: string, leadId: string) =>
    `/api/v1/portal/funnels/${funnelId}/leads/${leadId}`,
  LEAD_STATUS: (funnelId: string, leadId: string) =>
    `/api/v1/portal/funnels/${funnelId}/leads/${leadId}/status`,
  LEAD_ASSIGN: (funnelId: string, leadId: string) =>
    `/api/v1/portal/funnels/${funnelId}/leads/${leadId}/assign`,
  LEAD_NOTES: (funnelId: string, leadId: string) =>
    `/api/v1/portal/funnels/${funnelId}/leads/${leadId}/notes`,
  LEADS_BULK_STATUS: '/api/v1/portal/leads/bulk/status',
  LEADS_BULK_ASSIGN: '/api/v1/portal/leads/bulk/assign',

  // Dashboard & Analytics
  DASHBOARD: '/api/v1/portal/dashboard',
  ANALYTICS_OVERVIEW: '/api/v1/portal/analytics/overview',
  ANALYTICS_TRENDS: '/api/v1/portal/analytics/trends',
  ANALYTICS_FUNNEL: '/api/v1/portal/analytics/funnel',
  ANALYTICS_BY_FUNNEL: '/api/v1/portal/analytics/by-funnel',
  ANALYTICS_ACTIVITY: '/api/v1/portal/analytics/activity',

  // Notifications
  NOTIFICATIONS: '/api/v1/portal/notifications',
  NOTIFICATION_COUNT: '/api/v1/portal/notifications/count',
  NOTIFICATION_READ: (id: string) => `/api/v1/portal/notifications/${id}/read`,
  NOTIFICATIONS_MARK_ALL_READ: '/api/v1/portal/notifications/mark-all-read',

  // Exports
  EXPORTS: '/api/v1/portal/exports',
  EXPORT_STATUS: (id: string) => `/api/v1/portal/exports/${id}`,
  EXPORT_DOWNLOAD: (id: string) => `/api/v1/portal/exports/${id}/download`,
} as const;

// ── Role names ────────────────────────────────

export const ROLES = {
  ADMIN: 'admin' as const,
  AGENT: 'agent' as const,
  MANAGER: 'manager' as const,
};

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  agent: 'Agent',
  manager: 'Manager',
};

// ── Lead statuses ─────────────────────────────

export const LEAD_STATUSES: LeadStatus[] = [
  'new',
  'assigned',
  'unassigned',
  'contacted',
  'qualified',
  'converted',
  'booked',
  'won',
  'lost',
  'dnc',
  'quarantined',
];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  assigned: 'Assigned',
  unassigned: 'Unassigned',
  contacted: 'Contacted',
  qualified: 'Qualified',
  converted: 'Converted',
  booked: 'Booked',
  won: 'Won',
  lost: 'Lost',
  dnc: 'DNC',
  quarantined: 'Quarantined',
};

// ── Error messages ────────────────────────────

export const ERROR_MESSAGES = {
  // Generic
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',

  // Profile
  PROFILE_UPDATE_FAILED: 'Failed to update profile',
  ORG_UPDATE_FAILED: 'Failed to update organization',

  // Team
  INVITE_FAILED: 'Failed to send invitation. Please try again.',
  REMOVE_MEMBER_FAILED: 'Failed to remove team member',
  UPDATE_ROLE_FAILED: 'Failed to update role',

  // Leads
  STATUS_UPDATE_FAILED: 'Failed to update lead status',
  BULK_UPDATE_FAILED: 'Failed to update leads',
  BULK_ASSIGN_FAILED: 'Failed to assign leads',
  NOTE_ADD_FAILED: 'Failed to add note',

  // Export
  EXPORT_START_FAILED: 'Failed to start export. Please try again.',
  EXPORT_FAILED: 'Export failed. Please try again.',

  // Notifications
  NOTIFICATION_FAILED: 'Failed to update notification',

  // Validation
  EMAIL_REQUIRED: 'Email address is required',
  EMAIL_INVALID: 'Please enter a valid email address',
  NAME_TOO_SHORT: 'Name must be at least 2 characters',
  FIRST_NAME_REQUIRED: 'First name is required',
  LAST_NAME_REQUIRED: 'Last name is required',
  ZIP_INVALID: 'Please enter a valid 5-digit ZIP code',
} as const;

// ── Success messages ──────────────────────────

export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Profile updated',
  ORG_NAME_UPDATED: 'Organization name updated',
  ORG_ID_COPIED: 'Organization ID copied',
  INVITE_SENT: (email: string) => `Invitation sent to ${email}`,
  MEMBER_REMOVED: 'Team member removed',
  ROLE_UPDATED: 'Role updated',
  NOTIFICATION_PREFS_SAVED: 'Notification preferences saved',
  SERVICE_PREFS_SAVED: 'Service preferences saved',
  COVERAGE_ADDED: 'Coverage area added',
  BUSINESS_HOURS_SAVED: 'Business hours saved',
  LEADS_UPDATED: (count: number, status: string) => `${count} leads updated to ${status}`,
  LEADS_ASSIGNED: (count: number) => `${count} leads assigned`,
} as const;

// ── Form validation ───────────────────────────

export const VALIDATION = {
  MIN_NAME_LENGTH: 2,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  ZIP_REGEX: /^\d{5}$/,
} as const;
