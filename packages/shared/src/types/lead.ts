/**
 * Extended lead types with assignment, pipeline status, and notification tracking.
 * These types represent the full lead lifecycle in the 3-sided platform.
 */

/**
 * Const enum-like object for pipeline statuses.
 * Use `PipelineStatusEnum.NEW` instead of hardcoding `'new'`.
 */
export const PipelineStatusEnum = {
  NEW: 'new',
  CONTACTED: 'contacted',
  BOOKED: 'booked',
  WON: 'won',
  LOST: 'lost',
  DNC: 'dnc',
} as const;

export type PipelineStatus = (typeof PipelineStatusEnum)[keyof typeof PipelineStatusEnum];

export interface Lead {
  leadId: string;
  funnelId: string;
  email: string;
  emailNormalized: string;
  phone?: string;
  phoneE164?: string;
  name: string;
  zipCode: string;
  city?: string;
  state?: string;
  assignedOrgId?: string;
  assignedUserId?: string;
  assignmentRuleId?: string;
  assignedAt?: string;
  pipelineStatus: PipelineStatus;
  adminNotes?: string;
  tags?: string[];
  source?: string;
  utmParams?: Record<string, string>;
  ipHash?: string;
  userAgent?: string;
  createdAt: string;
  lastUpdatedAt: string;
  notification?: LeadNotificationInfo;
  deletedAt?: string;
  ttl?: number;
}

export interface LeadNotificationInfo {
  internalNotifiedAt?: string;
  orgNotifiedAt?: string;
  userNotifiedAt?: string;
  notificationErrors?: Array<{
    channel: string;
    error: string;
    at: string;
  }>;
}

export interface UpdateLeadInput {
  pipelineStatus?: PipelineStatus;
  adminNotes?: string;
  tags?: string[];
}

export interface ReassignLeadInput {
  assignedOrgId: string;
  assignedUserId?: string;
  reason?: string;
}
