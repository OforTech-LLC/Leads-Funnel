/**
 * Messaging Dispatcher
 *
 * Routes lead notifications to all configured messaging channels
 * (Slack, Teams) for an organization.
 */
import { GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient, tableName } from '../db/client.js';
import { createLogger } from '../logging.js';
import { sendSlackMessage, formatLeadNotification as formatSlack } from './slack.js';
import { sendTeamsMessage, formatLeadNotification as formatTeams } from './teams.js';
const log = createLogger('messaging-dispatcher');
// ---------------------------------------------------------------------------
// Channel Config CRUD
// ---------------------------------------------------------------------------
/**
 * Save a messaging channel configuration for an org.
 */
export async function saveChannelConfig(orgId, provider, webhookUrl, channelName) {
    const doc = getDocClient();
    const now = new Date().toISOString();
    const config = {
        pk: `MSGCONFIG#${orgId}`,
        sk: `PROVIDER#${provider}`,
        orgId,
        provider,
        webhookUrl,
        channelName,
        active: true,
        createdAt: now,
        updatedAt: now,
    };
    await doc.send(new PutCommand({
        TableName: tableName(),
        Item: config,
    }));
    log.info('messaging.config.saved', { orgId, provider });
    return config;
}
/**
 * Get a messaging channel configuration for an org + provider.
 */
export async function getChannelConfig(orgId, provider) {
    const doc = getDocClient();
    const result = await doc.send(new GetCommand({
        TableName: tableName(),
        Key: {
            pk: `MSGCONFIG#${orgId}`,
            sk: `PROVIDER#${provider}`,
        },
    }));
    return result.Item || null;
}
/**
 * Delete a messaging channel configuration.
 */
export async function deleteChannelConfig(orgId, provider) {
    const doc = getDocClient();
    await doc.send(new DeleteCommand({
        TableName: tableName(),
        Key: {
            pk: `MSGCONFIG#${orgId}`,
            sk: `PROVIDER#${provider}`,
        },
    }));
    log.info('messaging.config.deleted', { orgId, provider });
}
// ---------------------------------------------------------------------------
// Dispatch Notifications
// ---------------------------------------------------------------------------
/**
 * Send a lead notification to all configured messaging channels for an org.
 *
 * @param orgId - Organization ID
 * @param lead - Lead information for formatting
 * @param enabledProviders - Set of providers currently enabled by feature flags
 */
export async function dispatchLeadNotification(orgId, lead, enabledProviders) {
    const providers = ['slack', 'teams'];
    for (const provider of providers) {
        if (!enabledProviders.has(provider)) {
            continue;
        }
        const config = await getChannelConfig(orgId, provider);
        if (!config || !config.active) {
            continue;
        }
        try {
            if (provider === 'slack') {
                const message = formatSlack(lead);
                await sendSlackMessage(config.webhookUrl, message);
            }
            else if (provider === 'teams') {
                const message = formatTeams(lead);
                await sendTeamsMessage(config.webhookUrl, message);
            }
            log.info('messaging.notification.sent', { orgId, provider });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            log.error('messaging.notification.failed', { orgId, provider, error: msg });
            // Do not throw - messaging failures should not block lead processing
        }
    }
}
/**
 * Send a test notification to a specific provider for an org.
 */
export async function sendTestNotification(orgId, provider) {
    const config = await getChannelConfig(orgId, provider);
    if (!config) {
        return { success: false, error: `No ${provider} configuration found for org` };
    }
    const testLead = {
        leadId: 'test-lead-001',
        funnelId: 'test-funnel',
        name: 'Test Lead',
        email: 'test@example.com',
        phone: '+15551234567',
        status: 'new',
        createdAt: new Date().toISOString(),
        message: 'This is a test notification from Kanjona.',
    };
    try {
        if (provider === 'slack') {
            const message = formatSlack(testLead);
            await sendSlackMessage(config.webhookUrl, message);
        }
        else if (provider === 'teams') {
            const message = formatTeams(testLead);
            await sendTeamsMessage(config.webhookUrl, message);
        }
        return { success: true };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return { success: false, error: msg };
    }
}
//# sourceMappingURL=dispatcher.js.map