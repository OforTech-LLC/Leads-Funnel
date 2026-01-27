export const NOTIFICATION_TYPES = [
  'lead_received',
  'lead_assigned',
  'lead_status_changed',
  'team_member_joined',
  'export_ready',
  'system_announcement',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

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
  digestFrequency: 'realtime' | 'daily' | 'weekly' | 'none';
}
