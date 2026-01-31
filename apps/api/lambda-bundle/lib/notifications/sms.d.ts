/**
 * SMS Notification Service
 *
 * Sends SMS notifications for lead events via Twilio (primary) or
 * Amazon SNS (fallback). The provider is determined by feature flags:
 *
 * - enable_twilio_sms: Use Twilio REST API
 * - enable_sns_sms: Use Amazon SNS SMS (fallback when Twilio is disabled)
 *
 * Security:
 * - Twilio credentials are loaded from AWS Secrets Manager
 * - No raw PII is logged
 * - Phone numbers are validated before sending
 *
 * Performance: Uses centralized SNS and Secrets Manager clients from
 * clients.ts with HTTP keep-alive for connection reuse.
 */
import type { LeadRecord, FeatureFlags } from '../types/events.js';
export interface SendSmsParams {
    to: string;
    body: string;
    region: string;
    featureFlags: FeatureFlags;
    twilioSecretArn: string;
}
export interface SendSmsResult {
    success: boolean;
    messageId?: string;
    provider?: 'twilio' | 'sns';
    error?: string;
}
/**
 * Send an SMS message using the configured provider.
 *
 * Provider selection:
 * 1. If enable_twilio_sms is true, use Twilio REST API
 * 2. If enable_sns_sms is true, use Amazon SNS
 * 3. If neither is enabled, skip and return success (no-op)
 *
 * @param params - SMS parameters including recipient, body, and configuration
 * @returns Result with success flag, provider used, and messageId or error
 */
export declare function sendSms(params: SendSmsParams): Promise<SendSmsResult>;
/**
 * Build SMS body for a lead.assigned notification.
 *
 * Keeps the message short (< 160 chars) to fit in a single SMS segment.
 * Uses masked name to minimize PII exposure in SMS.
 *
 * @param lead - The assigned lead record
 * @returns SMS body text
 */
export declare function buildLeadAssignedSms(lead: LeadRecord): string;
/**
 * Build SMS body for a lead.unassigned notification (internal ops).
 *
 * @param lead - The unassigned lead record
 * @param reason - The unassignment reason
 * @returns SMS body text
 */
export declare function buildLeadUnassignedSms(lead: LeadRecord, reason: string): string;
