/**
 * Microsoft Teams Webhook Integration Stub
 *
 * Sends formatted lead notifications to Teams channels via
 * incoming webhook URLs using Adaptive Card format.
 */

import { createLogger } from '../logging.js';
import type { TeamsMessage, TeamsAdaptiveCardBody, LeadInfo } from './types.js';

const log = createLogger('messaging-teams');

// ---------------------------------------------------------------------------
// Message Sending
// ---------------------------------------------------------------------------

/**
 * Send a message to a Microsoft Teams incoming webhook URL.
 */
export async function sendTeamsMessage(webhookUrl: string, payload: TeamsMessage): Promise<void> {
  log.info('teams.sendMessage', { webhookUrl: webhookUrl.slice(0, 40) + '...' });

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      log.error('teams.sendMessage.failed', {
        status: response.status,
        body: body.slice(0, 200),
      });
      throw new Error(`Teams webhook failed: ${response.status}`);
    }

    log.info('teams.sendMessage.success');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    log.error('teams.sendMessage.error', { error: msg });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Message Formatting (Adaptive Card)
// ---------------------------------------------------------------------------

/**
 * Format a lead notification as a Microsoft Teams Adaptive Card message.
 */
export function formatLeadNotification(lead: LeadInfo): TeamsMessage {
  const body: TeamsAdaptiveCardBody[] = [
    {
      type: 'TextBlock',
      text: 'New Lead Received',
      weight: 'Bolder',
      size: 'Large',
    },
    {
      type: 'FactSet',
      facts: [
        { title: 'Name', value: lead.name },
        { title: 'Email', value: lead.email },
        { title: 'Phone', value: lead.phone || 'N/A' },
        { title: 'Status', value: lead.status },
        { title: 'Funnel', value: lead.funnelId },
        { title: 'Created', value: lead.createdAt },
      ],
    },
  ];

  if (lead.message) {
    body.push({
      type: 'TextBlock',
      text: `Message: ${lead.message.slice(0, 500)}`,
      wrap: true,
      separator: true,
    });
  }

  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body,
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'View Lead',
              url: `https://app.kanjona.com/leads/${lead.funnelId}/${lead.leadId}`,
            },
          ],
        },
      },
    ],
  };
}
