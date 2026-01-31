/**
 * Slack Webhook Integration Stub
 *
 * Sends formatted lead notifications to Slack channels via
 * incoming webhook URLs using Block Kit format.
 */
import { createLogger } from '../logging.js';
const log = createLogger('messaging-slack');
// ---------------------------------------------------------------------------
// Message Sending
// ---------------------------------------------------------------------------
/**
 * Send a message to a Slack incoming webhook URL.
 */
export async function sendSlackMessage(webhookUrl, payload) {
    log.info('slack.sendMessage', { webhookUrl: webhookUrl.slice(0, 40) + '...' });
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const body = await response.text().catch(() => '');
            log.error('slack.sendMessage.failed', {
                status: response.status,
                body: body.slice(0, 200),
            });
            throw new Error(`Slack webhook failed: ${response.status}`);
        }
        log.info('slack.sendMessage.success');
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        log.error('slack.sendMessage.error', { error: msg });
        throw err;
    }
}
// ---------------------------------------------------------------------------
// Message Formatting (Block Kit)
// ---------------------------------------------------------------------------
/**
 * Format a lead notification as a Slack Block Kit message.
 */
export function formatLeadNotification(lead) {
    const blocks = [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: 'New Lead Received',
                emoji: true,
            },
        },
        {
            type: 'section',
            fields: [
                { type: 'mrkdwn', text: `*Name:*\n${lead.name}` },
                { type: 'mrkdwn', text: `*Email:*\n${lead.email}` },
                { type: 'mrkdwn', text: `*Phone:*\n${lead.phone || 'N/A'}` },
                { type: 'mrkdwn', text: `*Status:*\n${lead.status}` },
                { type: 'mrkdwn', text: `*Funnel:*\n${lead.funnelId}` },
                { type: 'mrkdwn', text: `*Created:*\n${lead.createdAt}` },
            ],
        },
    ];
    if (lead.message) {
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Message:*\n${lead.message.slice(0, 500)}`,
            },
        });
    }
    blocks.push({
        type: 'actions',
        elements: [
            {
                type: 'button',
                text: { type: 'plain_text', text: 'View Lead' },
                style: 'primary',
                url: `https://app.kanjona.com/leads/${lead.funnelId}/${lead.leadId}`,
            },
        ],
    });
    return {
        text: `New lead from ${lead.name} (${lead.email})`,
        blocks,
    };
}
//# sourceMappingURL=slack.js.map