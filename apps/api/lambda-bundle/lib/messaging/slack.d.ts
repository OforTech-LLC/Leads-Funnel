/**
 * Slack Webhook Integration Stub
 *
 * Sends formatted lead notifications to Slack channels via
 * incoming webhook URLs using Block Kit format.
 */
import type { SlackMessage, LeadInfo } from './types.js';
/**
 * Send a message to a Slack incoming webhook URL.
 */
export declare function sendSlackMessage(webhookUrl: string, payload: SlackMessage): Promise<void>;
/**
 * Format a lead notification as a Slack Block Kit message.
 */
export declare function formatLeadNotification(lead: LeadInfo): SlackMessage;
