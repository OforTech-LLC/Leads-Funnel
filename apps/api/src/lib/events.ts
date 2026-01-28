/**
 * EventBridge event publishing for lead events
 *
 * Publishes lead lifecycle events to EventBridge:
 * - lead.created: Published when a new lead is captured
 * - lead.assigned: Published when a lead is matched to an org/user
 * - lead.unassigned: Published when a lead cannot be matched
 *
 * Also dispatches webhook events when the webhooks_enabled flag is on.
 *
 * Performance: Uses the centralized EventBridge client from clients.ts
 * which has HTTP keep-alive enabled for connection reuse across requests.
 */

import { PutEventsCommand } from '@aws-sdk/client-eventbridge';
import type { LeadCreatedEventDetail, EnvConfig, LeadRecord, SecurityAnalysis } from '../types.js';
import type { LeadAssignedEventDetail, LeadUnassignedEventDetail } from './types/events.js';
import { isFeatureEnabled } from './config.js';
import { getEventBridgeClient } from './clients.js';
import { EVENT_SOURCE, EVENT_TYPES } from './constants.js';

// =============================================================================
// Webhook Dispatch (non-blocking)
// =============================================================================

/**
 * Conditionally dispatch a webhook event if the webhooks_enabled flag is on.
 * This is fire-and-forget: errors are logged but never propagated.
 */
async function maybeDispatchWebhook(
  eventType: 'lead.created' | 'lead.assigned' | 'lead.status_changed' | 'lead.note_added',
  data: Record<string, unknown>
): Promise<void> {
  try {
    const enabled = await isFeatureEnabled('webhooks_enabled');
    if (!enabled) return;

    // Dynamic import to avoid circular deps and loading when disabled
    const { dispatchWebhookEvent } = await import('./webhooks/dispatcher.js');
    await dispatchWebhookEvent(eventType, data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.log(
      JSON.stringify({
        level: 'warn',
        message: 'Webhook dispatch failed (non-blocking)',
        eventType,
        error: msg,
      })
    );
  }
}

// =============================================================================
// Event Publishing - lead.created
// =============================================================================

/**
 * Publish lead.created event to EventBridge
 */
export async function publishLeadCreatedEvent(
  config: EnvConfig,
  lead: LeadRecord,
  security: SecurityAnalysis
): Promise<void> {
  const client = getEventBridgeClient(config.awsRegion);

  const detail: LeadCreatedEventDetail = {
    leadId: lead.leadId,
    funnelId: lead.funnelId,
    createdAt: lead.createdAt,
    status: lead.status,
    suspicious: security.suspicious,
    reasons: security.reasons,
  };

  await client.send(
    new PutEventsCommand({
      Entries: [
        {
          Source: EVENT_SOURCE,
          DetailType: EVENT_TYPES.LEAD_CREATED,
          Detail: JSON.stringify(detail),
          EventBusName: config.eventBusName,
        },
      ],
    })
  );

  // Dispatch webhook (fire-and-forget)
  // Note: LeadRecord (capture-time) does not carry funnelId; that is set
  // later by the assignment worker on PlatformLead.
  void maybeDispatchWebhook(EVENT_TYPES.LEAD_CREATED as 'lead.created', {
    leadId: lead.leadId,
    status: lead.status,
    createdAt: lead.createdAt,
    suspicious: security.suspicious,
  });
}

// =============================================================================
// Event Publishing - lead.assigned
// =============================================================================

/**
 * Publish lead.assigned event to EventBridge.
 *
 * Emitted when the assignment worker successfully matches a lead to an
 * organization (and optionally a specific user) via an assignment rule.
 *
 * @param region - AWS region
 * @param eventBusName - EventBridge bus name
 * @param detail - Assignment event detail including lead, org, and rule IDs
 */
export async function emitLeadAssigned(
  region: string,
  eventBusName: string,
  detail: LeadAssignedEventDetail
): Promise<void> {
  const client = getEventBridgeClient(region);

  await client.send(
    new PutEventsCommand({
      Entries: [
        {
          Source: EVENT_SOURCE,
          DetailType: EVENT_TYPES.LEAD_ASSIGNED,
          Detail: JSON.stringify(detail),
          EventBusName: eventBusName,
        },
      ],
    })
  );

  // Dispatch webhook (fire-and-forget)
  void maybeDispatchWebhook(EVENT_TYPES.LEAD_ASSIGNED as 'lead.assigned', {
    leadId: detail.leadId,
    funnelId: detail.funnelId,
    assignedOrgId: detail.assignedOrgId,
    assignedUserId: detail.assignedUserId,
    assignmentRuleId: detail.assignmentRuleId,
    assignedAt: detail.assignedAt,
  });
}

// =============================================================================
// Event Publishing - lead.unassigned
// =============================================================================

/**
 * Publish lead.unassigned event to EventBridge.
 *
 * Emitted when the assignment worker cannot match a lead to any assignment
 * rule. Includes the reason for the failure (e.g., no matching rule,
 * all caps exceeded, no active targets).
 *
 * @param region - AWS region
 * @param eventBusName - EventBridge bus name
 * @param leadId - The unmatched lead ID
 * @param funnelId - The lead's funnel ID
 * @param zipCode - The lead's ZIP code (if available)
 * @param reason - Human-readable reason for non-assignment
 */
export async function emitLeadUnassigned(
  region: string,
  eventBusName: string,
  leadId: string,
  funnelId: string,
  zipCode: string | undefined,
  reason: string
): Promise<void> {
  const client = getEventBridgeClient(region);

  const detail: LeadUnassignedEventDetail = {
    leadId,
    funnelId,
    zipCode,
    reason,
    evaluatedAt: new Date().toISOString(),
  };

  await client.send(
    new PutEventsCommand({
      Entries: [
        {
          Source: EVENT_SOURCE,
          DetailType: EVENT_TYPES.LEAD_UNASSIGNED,
          Detail: JSON.stringify(detail),
          EventBusName: eventBusName,
        },
      ],
    })
  );
}

// =============================================================================
// Convenience: lead.status_changed and lead.note_added webhook triggers
// =============================================================================

/**
 * Fire a webhook for lead status change events.
 * Called from admin/portal handlers when a lead status is updated.
 */
export async function emitLeadStatusChanged(data: {
  leadId: string;
  funnelId: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
}): Promise<void> {
  void maybeDispatchWebhook(EVENT_TYPES.LEAD_STATUS_CHANGED as 'lead.status_changed', data);
}

/**
 * Fire a webhook for lead note added events.
 * Called from portal handler when a note is added to a lead.
 */
export async function emitLeadNoteAdded(data: {
  leadId: string;
  funnelId: string;
  addedBy: string;
}): Promise<void> {
  void maybeDispatchWebhook(EVENT_TYPES.LEAD_NOTE_ADDED as 'lead.note_added', data);
}
