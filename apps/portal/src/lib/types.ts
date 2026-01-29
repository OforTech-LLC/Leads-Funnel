// ──────────────────────────────────────────────
// Domain types for the Portal app
//
// LeadStatus is imported from @kanjona/shared to
// maintain a single source of truth across all apps.
// ──────────────────────────────────────────────

import type { LeadStatus } from '@kanjona/shared';

export type { LeadStatus };

export interface Lead {
  id: string;
  funnelId: string;
  funnelName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zip: string;
  city: string;
  state: string;
  status: LeadStatus;
  assignedTo: string | null;
  assignedName: string | null;
  notes: Note[];
  timeline: TimelineEvent[];
  qualityScore?: number;
  evidencePack?: EvidencePack;
  createdAt: string;
  updatedAt: string;
}

export interface EvidencePack {
  capturedAt: string;
  funnelId: string;
  pageVariant?: string;
  pageUrl?: string;
  referrer?: string;
  utm?: Record<string, string>;
  consent?: {
    privacyAccepted: boolean;
    marketingConsent?: boolean;
    privacyPolicyVersion?: string;
    termsVersion?: string;
    capturedAt: string;
    ipHash: string;
  };
  verification?: {
    emailValid?: boolean;
    phoneValid?: boolean;
    captchaVerified?: boolean;
    captchaScore?: number;
  };
  quality?: {
    score?: number;
    threshold?: number;
    matchedRules?: string[];
    status?: string;
  };
  security?: {
    suspicious: boolean;
    reasons: string[];
  };
  assignment?: {
    ruleId?: string;
    assignedOrgId?: string;
    assignedUserId?: string;
    assignedAt?: string;
  };
}

export interface Note {
  id: string;
  leadId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  leadId: string;
  type: 'status_change' | 'note_added' | 'assigned' | 'created' | 'contacted';
  description: string;
  performedBy: string;
  performedByName: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'agent' | 'manager' | 'admin';
  orgIds: string[];
  primaryOrgId: string;
  avatarUrl: string | null;
  phone: string | null;
  notificationPreferences: NotificationPreferences;
  profileCompleteness: ProfileCompleteness;
  createdAt: string;
}

export interface ProfileCompleteness {
  score: number;
  missingFields: string[];
  isComplete: boolean;
}

export interface AvatarUploadResponse {
  uploadUrl: string;
  publicUrl: string;
  headers?: Record<string, string>;
  maxBytes?: number;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export interface GranularNotificationPreferences {
  newLeadEmail: boolean;
  newLeadSms: boolean;
  newLeadPush: boolean;
  statusChangeEmail: boolean;
  statusChangeSms: boolean;
  statusChangePush: boolean;
  teamActivityEmail: boolean;
  teamActivitySms: boolean;
  teamActivityPush: boolean;
  weeklyDigestEmail: boolean;
}

export interface BusinessHoursDay {
  enabled: boolean;
  start: string; // "09:00"
  end: string; // "17:00"
}

export type BusinessHours = Record<string, BusinessHoursDay>;

export interface ServicePreferences {
  categories: string[];
  zipCodes: string[];
  businessHours: BusinessHours;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  plan: string;
  memberCount: number;
  leadsUsed?: number;
  leadsLimit?: number;
  createdAt?: string;
}

export interface TeamMember {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'agent';
  status: 'active' | 'inactive';
  avatarUrl: string | null;
  lastActiveAt: string | null;
  joinedAt: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: 'admin' | 'agent';
  status: 'pending' | 'accepted' | 'expired';
  invitedBy: string;
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  total: number;
}

export interface DashboardMetrics {
  newLeadsToday: number;
  totalActiveLeads: number;
  leadsByStatus: Record<LeadStatus, number>;
  recentLeads: Lead[];
}

export interface LeadFilters {
  search?: string;
  status?: LeadStatus | '';
  funnelId?: string;
  dateFrom?: string;
  dateTo?: string;
}
