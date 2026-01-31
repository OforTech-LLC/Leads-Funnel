/**
 * Assignment Worker - SQS Lambda Handler
 *
 * Processes lead.created events from the assignment-queue (SQS).
 * Matches leads to assignment rules using ZIP longest-prefix algorithm,
 * checks daily/monthly caps, and assigns leads to organizations/users.
 *
 * Event Flow:
 *   lead.created (EventBridge) -> SQS assignment-queue -> this handler
 *
 * Outputs:
 *   - lead.assigned event (lead matched to an org)
 *   - lead.unassigned event (no matching rule found)
 *
 * Idempotency:
 *   Uses conditional DynamoDB update with status = "new"
 *   to prevent duplicate assignments on message replay.
 *
 * Partial Failure:
 *   Returns batchItemFailures for SQS partial batch failure handling,
 *   so only failed messages are retried (not the entire batch).
 */
import type { SQSEvent, SQSBatchResponse } from 'aws-lambda';
/**
 * SQS Lambda handler for the assignment queue.
 *
 * Processes a batch of SQS messages containing lead.created events.
 * Uses partial batch failure reporting so only failed messages are
 * retried by SQS, not the entire batch.
 *
 * @param event - SQS event containing one or more messages
 * @returns SQSBatchResponse with list of failed message IDs
 */
export declare function handler(event: SQSEvent): Promise<SQSBatchResponse>;
