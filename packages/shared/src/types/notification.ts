/**
 * Notification types for tracking email and SMS delivery to
 * internal teams, organizations, and individual users.
 */

export type NotificationChannel = 'email' | 'sms';
export type NotificationStatus = 'sent' | 'failed' | 'bounced';
export type NotificationTargetType = 'internal' | 'org' | 'user';

export interface Notification {
  notificationId: string;
  leadId: string;
  funnelId: string;
  targetType: NotificationTargetType;
  targetId?: string;
  recipientHash: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  ttl: number;
}
