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

import { PublishCommand } from '@aws-sdk/client-sns';
import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { LeadRecord, FeatureFlags } from '../types/events.js';
import { getSnsClient, getSecretsManagerClient } from '../clients.js';

// =============================================================================
// Twilio Credentials Cache
// =============================================================================

interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

let cachedTwilioCredentials: TwilioCredentials | null = null;
let credentialsCacheExpiry = 0;
const CREDENTIALS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load Twilio credentials from AWS Secrets Manager with caching.
 *
 * Credentials are cached for 5 minutes to reduce Secrets Manager API calls.
 * In a typical Lambda invocation pattern, this means credentials are loaded
 * once per warm Lambda instance and refreshed periodically.
 */
async function loadTwilioCredentials(
  region: string,
  secretArn: string
): Promise<TwilioCredentials> {
  const now = Date.now();

  if (cachedTwilioCredentials && now < credentialsCacheExpiry) {
    return cachedTwilioCredentials;
  }

  const client = getSecretsManagerClient(region);

  const result = await client.send(
    new GetSecretValueCommand({
      SecretId: secretArn,
    })
  );

  if (!result.SecretString) {
    throw new Error('Twilio secret is empty');
  }

  const parsed = JSON.parse(result.SecretString) as TwilioCredentials;

  if (!parsed.accountSid || !parsed.authToken || !parsed.fromNumber) {
    throw new Error('Twilio secret missing required fields');
  }

  cachedTwilioCredentials = parsed;
  credentialsCacheExpiry = now + CREDENTIALS_CACHE_TTL_MS;

  return parsed;
}

// =============================================================================
// SMS Sending
// =============================================================================

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
export async function sendSms(params: SendSmsParams): Promise<SendSmsResult> {
  const { to, body, region, featureFlags, twilioSecretArn } = params;

  // Validate phone number has some digits
  const digitsOnly = to.replace(/\D/g, '');
  if (digitsOnly.length < 10) {
    return {
      success: false,
      error: 'Invalid phone number: too few digits',
    };
  }

  // Try Twilio first
  if (featureFlags.enable_twilio_sms && twilioSecretArn) {
    return sendViaTwilio(to, body, region, twilioSecretArn);
  }

  // Fallback to SNS
  if (featureFlags.enable_sns_sms) {
    return sendViaSns(to, body, region);
  }

  // Neither provider enabled - return success (no-op)
  console.log(
    JSON.stringify({
      level: 'info',
      message: 'SMS sending skipped: no provider enabled',
    })
  );

  return {
    success: true,
    provider: undefined,
    messageId: undefined,
  };
}

/**
 * Send SMS via Twilio REST API.
 *
 * Uses the native fetch API (available in Node.js 18+) to call the Twilio
 * Messages API endpoint directly, avoiding the need for the Twilio SDK.
 */
async function sendViaTwilio(
  to: string,
  body: string,
  region: string,
  secretArn: string
): Promise<SendSmsResult> {
  try {
    const credentials = await loadTwilioCredentials(region, secretArn);

    const url = `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`;

    const formData = new URLSearchParams({
      To: to,
      From: credentials.fromNumber,
      Body: body,
    });

    const authHeader = Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString(
      'base64'
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.log(
        JSON.stringify({
          level: 'error',
          message: 'Twilio API error',
          statusCode: response.status,
        })
      );
      return {
        success: false,
        provider: 'twilio',
        error: `Twilio HTTP ${response.status}: ${errorBody.slice(0, 200)}`,
      };
    }

    const result = (await response.json()) as { sid?: string };

    return {
      success: true,
      provider: 'twilio',
      messageId: result.sid,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown Twilio error';
    console.log(
      JSON.stringify({
        level: 'error',
        message: 'Twilio send failed',
        error: errorMessage,
      })
    );

    return {
      success: false,
      provider: 'twilio',
      error: errorMessage,
    };
  }
}

/**
 * Send SMS via Amazon SNS.
 *
 * Uses the SNS Publish API to send a transactional SMS. The message type
 * is set to Transactional for higher delivery priority.
 */
async function sendViaSns(to: string, body: string, region: string): Promise<SendSmsResult> {
  try {
    const client = getSnsClient(region);

    const result = await client.send(
      new PublishCommand({
        PhoneNumber: to,
        Message: body,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
        },
      })
    );

    return {
      success: true,
      provider: 'sns',
      messageId: result.MessageId,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown SNS error';
    console.log(
      JSON.stringify({
        level: 'error',
        message: 'SNS SMS send failed',
        error: errorMessage,
      })
    );

    return {
      success: false,
      provider: 'sns',
      error: errorMessage,
    };
  }
}

// =============================================================================
// SMS Templates
// =============================================================================

/**
 * Build SMS body for a lead.assigned notification.
 *
 * Keeps the message short (< 160 chars) to fit in a single SMS segment.
 * Uses masked name to minimize PII exposure in SMS.
 *
 * @param lead - The assigned lead record
 * @returns SMS body text
 */
export function buildLeadAssignedSms(lead: LeadRecord): string {
  const name = lead.name || 'Unknown';
  const parts = name.trim().split(/\s+/);
  const maskedName =
    parts.length > 1
      ? `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`
      : `${parts[0].charAt(0).toUpperCase()}.`;

  const funnelId = lead.funnelId || 'unknown';
  const zipCode = lead.zipCode || '';

  const zipPart = zipCode ? ` in ${zipCode}` : '';

  return `New lead: ${maskedName}${zipPart} for ${funnelId}. Open portal to respond.`;
}

/**
 * Build SMS body for a lead.unassigned notification (internal ops).
 *
 * @param lead - The unassigned lead record
 * @param reason - The unassignment reason
 * @returns SMS body text
 */
export function buildLeadUnassignedSms(lead: LeadRecord, reason: string): string {
  const funnelId = lead.funnelId || 'unknown';
  const zipCode = lead.zipCode || 'N/A';

  return `[Alert] Unassigned lead for ${funnelId} (ZIP: ${zipCode}). Reason: ${reason}. Check admin console.`;
}
