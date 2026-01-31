/**
 * Microsoft Teams Webhook Integration Stub
 *
 * Sends formatted lead notifications to Teams channels via
 * incoming webhook URLs using Adaptive Card format.
 */
import type { TeamsMessage, LeadInfo } from './types.js';
/**
 * Send a message to a Microsoft Teams incoming webhook URL.
 */
export declare function sendTeamsMessage(webhookUrl: string, payload: TeamsMessage): Promise<void>;
/**
 * Format a lead notification as a Microsoft Teams Adaptive Card message.
 */
export declare function formatLeadNotification(lead: LeadInfo): TeamsMessage;
