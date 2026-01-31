/**
 * Notification Worker - SQS Lambda Handler
 *
 * Processes lead.assigned and lead.unassigned events from the
 * notification-queue (SQS). Dispatches email and SMS notifications
 * to internal ops and organization members.
 *
 * Event Flow:
 *   lead.assigned / lead.unassigned (EventBridge) -> SQS notification-queue -> this handler
 *
 * Notification Targets:
 *   lead.assigned:
 *     - Internal ops (email + SMS)
 *     - Assigned org members (based on org notification policy)
 *
 *   lead.unassigned:
 *     - Internal ops only (alert notification)
 *
 * Idempotency:
 *   Uses DynamoDB conditional update to atomically claim notification
 *   ownership before dispatching, preventing duplicate notifications
 *   on message replay.
 *
 * Partial Failure:
 *   Returns batchItemFailures for SQS partial batch failure handling.
 */
import type { SQSEvent, SQSBatchResponse } from 'aws-lambda';
/**
 * SQS Lambda handler for the notification queue.
 *
 * Processes a batch of SQS messages containing lead.assigned and
 * lead.unassigned events. Uses partial batch failure reporting.
 *
 * @param event - SQS event containing one or more messages
 * @returns SQSBatchResponse with list of failed message IDs
 */
export declare function handler(event: SQSEvent): Promise<SQSBatchResponse>;
