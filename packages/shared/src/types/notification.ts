/**
 * Notification types for tracking email and SMS delivery to
 * internal teams, organizations, and individual users.
 */

/**
 * Const enum-like object for notification channels.
 * Use `NotificationChannelEnum.EMAIL` instead of hardcoding `'email'`.
 */
export const NotificationChannelEnum = {
  EMAIL: 'email',
  SMS: 'sms',
} as const;

export type NotificationChannel =
  (typeof NotificationChannelEnum)[keyof typeof NotificationChannelEnum];

/**
 * Const enum-like object for notification statuses.
 * Use `NotificationStatusEnum.SENT` instead of hardcoding `'sent'`.
 */
export const NotificationStatusEnum = {
  SENT: 'sent',
  FAILED: 'failed',
  BOUNCED: 'bounced',
} as const;

export type NotificationStatus =
  (typeof NotificationStatusEnum)[keyof typeof NotificationStatusEnum];

/**
 * Const enum-like object for notification target types.
 * Use `NotificationTargetTypeEnum.INTERNAL` instead of hardcoding `'internal'`.
 */
export const NotificationTargetTypeEnum = {
  INTERNAL: 'internal',
  ORG: 'org',
  USER: 'user',
} as const;

export type NotificationTargetType =
  (typeof NotificationTargetTypeEnum)[keyof typeof NotificationTargetTypeEnum];

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
