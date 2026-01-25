/**
 * EventBridge event publishing for lead events
 */

import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import type { LeadCreatedEventDetail, EnvConfig, LeadRecord, SecurityAnalysis } from '../types.js';

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
const EVENT_DETAIL_TYPE = 'lead.created';

// =============================================================================
// Event Publishing
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
          DetailType: EVENT_DETAIL_TYPE,
          Detail: JSON.stringify(detail),
          EventBusName: config.eventBusName,
        },
      ],
    })
  );
}
