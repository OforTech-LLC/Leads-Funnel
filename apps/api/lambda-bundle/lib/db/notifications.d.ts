/**
 * DynamoDB operations for Notification records
 *
 * Single-table access patterns:
 *   PK = NOTIFY#<leadId>   SK = <channel>#<timestamp>
 *   GSI1PK = NOTIFYLOG     GSI1SK = <timestamp>  (global log)
 */
export type NotifyChannel = 'email' | 'sms';
export type NotifyStatus = 'sent' | 'failed' | 'skipped';
export interface NotificationRecord {
    pk: string;
    sk: string;
    notificationId: string;
    leadId: string;
    funnelId: string;
    orgId?: string;
    userId?: string;
    channel: NotifyChannel;
    recipient: string;
    status: NotifyStatus;
    errorMessage?: string;
    sentAt: string;
    gsi1pk: string;
    gsi1sk: string;
}
export interface RecordNotificationInput {
    leadId: string;
    funnelId: string;
    orgId?: string;
    userId?: string;
    channel: NotifyChannel;
    recipientHash: string;
    status: NotifyStatus;
    errorMessage?: string;
}
export declare function recordNotification(input: RecordNotificationInput): Promise<NotificationRecord>;
export interface PaginatedNotifications {
    items: NotificationRecord[];
    nextCursor?: string;
}
/**
 * List notifications for a specific lead.
 */
export declare function listNotificationsByLead(leadId: string, cursor?: string, limit?: number): Promise<PaginatedNotifications>;
/**
 * List recent notifications globally (admin view).
 */
export declare function listNotifications(cursor?: string, limit?: number, startDate?: string, endDate?: string): Promise<PaginatedNotifications>;
