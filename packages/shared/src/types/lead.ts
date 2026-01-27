/**
 * Extended lead types with assignment, pipeline status, and notification tracking.
 * These types represent the full lead lifecycle in the 3-sided platform.
 */

export type PipelineStatus = 'new' | 'contacted' | 'booked' | 'won' | 'lost' | 'dnc';

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
