/**
 * EventBridge event publishing for lead events
 *
 * Publishes lead lifecycle events to EventBridge:
 * - lead.created: Published when a new lead is captured
 * - lead.assigned: Published when a lead is matched to an org/user
 * - lead.unassigned: Published when a lead cannot be matched
 */

import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import type { LeadCreatedEventDetail, EnvConfig, LeadRecord, SecurityAnalysis } from '../types.js';
import type { LeadAssignedEventDetail, LeadUnassignedEventDetail } from './types/events.js';

// =============================================================================
// EventBridge Client Initialization
// =============================================================================

let eventClient: EventBridgeClient | null = null;

function getEventClient(region: string): EventBridgeClient {
  if (!eventClient) {
    eventClient = new EventBridgeClient({ region });
  }
  return eventClient;
}

// =============================================================================
// Event Constants
// =============================================================================

const EVENT_SOURCE = 'kanjona.funnel';
const EVENT_DETAIL_TYPE_CREATED = 'lead.created';
const EVENT_DETAIL_TYPE_ASSIGNED = 'lead.assigned';
const EVENT_DETAIL_TYPE_UNASSIGNED = 'lead.unassigned';

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
  const client = getEventClient(config.awsRegion);

  const detail: LeadCreatedEventDetail = {
    leadId: lead.leadId,
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
          DetailType: EVENT_DETAIL_TYPE_CREATED,
          Detail: JSON.stringify(detail),
          EventBusName: config.eventBusName,
        },
      ],
    })
  );
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
  const client = getEventClient(region);

  await client.send(
    new PutEventsCommand({
      Entries: [
        {
          Source: EVENT_SOURCE,
          DetailType: EVENT_DETAIL_TYPE_ASSIGNED,
          Detail: JSON.stringify(detail),
          EventBusName: eventBusName,
        },
      ],
    })
  );
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
  const client = getEventClient(region);

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
          DetailType: EVENT_DETAIL_TYPE_UNASSIGNED,
          Detail: JSON.stringify(detail),
          EventBusName: eventBusName,
        },
      ],
    })
  );
}
