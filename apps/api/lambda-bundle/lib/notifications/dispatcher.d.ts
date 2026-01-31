/**
 * Notification Dispatcher
 *
 * Orchestrates all notification sending for lead events. Handles:
 * - Internal ops notifications (email + SMS)
 * - Org member notifications based on org notification policy
 * - Feature flag checks for each notification channel
 * - Recording all notification attempts in DynamoDB
 *
 * Error Handling:
 * - Individual notification failures do not stop other notifications
 * - All attempts are recorded regardless of success/failure
 * - Errors are logged but never propagated to fail the entire worker
 */
import type { FeatureFlags, LeadRecord, LeadAssignedEventDetail, LeadUnassignedEventDetail, NotificationWorkerConfig } from '../types/events.js';
/**
 * Dispatch all notifications for a lead event.
 *
 * Orchestrates internal and org notifications based on event type and
 * feature flags. All errors are handled gracefully - individual notification
 * failures do not prevent other notifications from being sent.
 *
 * @param config - Worker configuration
 * @param featureFlags - Current feature flag state
 * @param event - The EventBridge event detail (assigned or unassigned)
 * @param lead - The lead record from DynamoDB
 */
export declare function dispatchNotifications(config: NotificationWorkerConfig, featureFlags: FeatureFlags, event: LeadAssignedEventDetail | LeadUnassignedEventDetail, lead: LeadRecord): Promise<void>;
