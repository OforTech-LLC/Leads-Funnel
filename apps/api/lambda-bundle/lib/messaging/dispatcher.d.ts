/**
 * Messaging Dispatcher
 *
 * Routes lead notifications to all configured messaging channels
 * (Slack, Teams) for an organization.
 */
import type { ChannelConfig, MessagingProvider, LeadInfo } from './types.js';
/**
 * Save a messaging channel configuration for an org.
 */
export declare function saveChannelConfig(orgId: string, provider: MessagingProvider, webhookUrl: string, channelName?: string): Promise<ChannelConfig>;
/**
 * Get a messaging channel configuration for an org + provider.
 */
export declare function getChannelConfig(orgId: string, provider: MessagingProvider): Promise<ChannelConfig | null>;
/**
 * Delete a messaging channel configuration.
 */
export declare function deleteChannelConfig(orgId: string, provider: MessagingProvider): Promise<void>;
/**
 * Send a lead notification to all configured messaging channels for an org.
 *
 * @param orgId - Organization ID
 * @param lead - Lead information for formatting
 * @param enabledProviders - Set of providers currently enabled by feature flags
 */
export declare function dispatchLeadNotification(orgId: string, lead: LeadInfo, enabledProviders: Set<MessagingProvider>): Promise<void>;
/**
 * Send a test notification to a specific provider for an org.
 */
export declare function sendTestNotification(orgId: string, provider: MessagingProvider): Promise<{
    success: boolean;
    error?: string;
}>;
