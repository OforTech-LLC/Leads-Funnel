/**
 * Const enum-like object for notification types.
 * Use `NotificationTypeEnum.LEAD_RECEIVED` instead of hardcoding `'lead_received'`.
 */
export const NotificationTypeEnum = {
  LEAD_RECEIVED: 'lead_received',
  LEAD_ASSIGNED: 'lead_assigned',
  LEAD_STATUS_CHANGED: 'lead_status_changed',
  TEAM_MEMBER_JOINED: 'team_member_joined',
  EXPORT_READY: 'export_ready',
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
} as const;

export const NOTIFICATION_TYPES = [
  'lead_received',
  'lead_assigned',
  'lead_status_changed',
  'team_member_joined',
  'export_ready',
  'system_announcement',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * Const enum-like object for digest frequency options.
 * Use `DigestFrequencyEnum.REALTIME` instead of hardcoding `'realtime'`.
 */
export const DigestFrequencyEnum = {
  REALTIME: 'realtime',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  NONE: 'none',
} as const;

export type DigestFrequency = (typeof DigestFrequencyEnum)[keyof typeof DigestFrequencyEnum];

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  perEvent: Partial<Record<NotificationType, { email: boolean; sms: boolean; push: boolean }>>;
  digestFrequency: DigestFrequency;
}
