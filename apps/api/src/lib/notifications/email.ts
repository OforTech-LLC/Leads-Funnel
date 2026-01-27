/**
 * Email Notification Service
 *
 * Sends email notifications via Amazon SES for lead assignment and
 * unassignment events. Provides professional HTML and plain-text
 * email templates.
 *
 * Security:
 * - No raw PII is logged (only hashed identifiers)
 * - Email content is sanitized to prevent injection
 * - SES handles bounce/complaint management
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import type { LeadRecord } from '../../workers/types.js';

// =============================================================================
// SES Client (reused across invocations)
// =============================================================================

let sesClient: SESClient | null = null;

function getSesClient(region: string): SESClient {
  if (!sesClient) {
    sesClient = new SESClient({ region });
  }
  return sesClient;
}

// =============================================================================
// Email Sending
// =============================================================================

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  fromAddress: string;
  region: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email via Amazon SES.
 *
 * @param params - Email parameters including recipient, content, and sender
 * @returns Result with success flag, SES messageId, or error
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const client = getSesClient(params.region);

  try {
    const result = await client.send(
      new SendEmailCommand({
        Destination: {
          ToAddresses: [params.to],
        },
        Message: {
          Subject: {
            Charset: 'UTF-8',
            Data: params.subject,
          },
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: params.htmlBody,
            },
            Text: {
              Charset: 'UTF-8',
              Data: params.textBody,
            },
          },
        },
        Source: params.fromAddress,
      })
    );

    return {
      success: true,
      messageId: result.MessageId,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown SES error';
    console.log(
      JSON.stringify({
        level: 'error',
        message: 'SES send failed',
        error: errorMessage,
      })
    );

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// =============================================================================
// Email Templates
// =============================================================================

/**
 * Sanitize a string for safe inclusion in HTML email content.
 * Prevents XSS in email clients that render HTML.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Mask PII for display in notifications (show partial info only).
 * Example: "John Smith" => "John S."
 */
function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase() + '.';
  }
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

export interface EmailContent {
  subject: string;
  htmlBody: string;
  textBody: string;
}

/**
 * Build email content for a lead.assigned notification.
 *
 * Content includes partial lead info (masked name, ZIP, funnel) without
 * exposing full PII in the email body. Recipients must log in to the
 * portal to see full details.
 *
 * @param lead - The assigned lead record
 * @param recipientName - Name of the email recipient
 * @returns Email subject, HTML body, and plain-text body
 */
export function buildLeadAssignedEmail(lead: LeadRecord, recipientName: string): EmailContent {
  const maskedName = maskName(lead.name || 'Unknown');
  const funnelId = lead.funnelId || 'unknown';
  const zipCode = lead.zipCode || 'N/A';
  const assignedAt = lead.assignedAt || new Date().toISOString();

  const subject = `New Lead Assigned: ${escapeHtml(maskedName)} - ${escapeHtml(funnelId)}`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f4f4f4;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:32px;">
    <div style="border-bottom:2px solid #2563eb;padding-bottom:16px;margin-bottom:24px;">
      <h1 style="color:#1e293b;font-size:20px;margin:0;">New Lead Assigned</h1>
    </div>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      Hi ${escapeHtml(recipientName)},
    </p>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      A new lead has been assigned to your organization. Here are the details:
    </p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr>
        <td style="padding:8px 12px;background:#f1f5f9;border:1px solid #e2e8f0;font-weight:600;color:#334155;width:120px;">Name</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#475569;">${escapeHtml(maskedName)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#f1f5f9;border:1px solid #e2e8f0;font-weight:600;color:#334155;">Service</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#475569;">${escapeHtml(funnelId)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#f1f5f9;border:1px solid #e2e8f0;font-weight:600;color:#334155;">ZIP Code</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#475569;">${escapeHtml(zipCode)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#f1f5f9;border:1px solid #e2e8f0;font-weight:600;color:#334155;">Assigned At</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#475569;">${escapeHtml(assignedAt)}</td>
      </tr>
    </table>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      Please log in to the portal to view full details and respond to this lead.
    </p>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        This is an automated notification from Kanjona. Do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>`.trim();

  const textBody = [
    `Hi ${recipientName},`,
    '',
    'A new lead has been assigned to your organization.',
    '',
    `Name: ${maskedName}`,
    `Service: ${funnelId}`,
    `ZIP Code: ${zipCode}`,
    `Assigned At: ${assignedAt}`,
    '',
    'Please log in to the portal to view full details and respond to this lead.',
    '',
    '---',
    'This is an automated notification from Kanjona. Do not reply to this email.',
  ].join('\n');

  return { subject, htmlBody, textBody };
}

/**
 * Build email content for a lead.unassigned notification (internal ops only).
 *
 * Alerts internal operations team that a lead could not be matched to any
 * assignment rule, including the reason for the failure.
 *
 * @param lead - The unassigned lead record
 * @param reason - Reason the lead was not assigned
 * @returns Email subject, HTML body, and plain-text body
 */
export function buildLeadUnassignedEmail(lead: LeadRecord, reason: string): EmailContent {
  const maskedName = maskName(lead.name || 'Unknown');
  const funnelId = lead.funnelId || 'unknown';
  const zipCode = lead.zipCode || 'N/A';
  const leadId = lead.leadId;

  const subject = `[Alert] Unassigned Lead: ${escapeHtml(maskedName)} - ${escapeHtml(funnelId)}`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f4f4f4;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:32px;">
    <div style="border-bottom:2px solid #dc2626;padding-bottom:16px;margin-bottom:24px;">
      <h1 style="color:#1e293b;font-size:20px;margin:0;">Unassigned Lead Alert</h1>
    </div>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      A lead could not be matched to any assignment rule and requires manual review.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr>
        <td style="padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;font-weight:600;color:#991b1b;width:120px;">Lead ID</td>
        <td style="padding:8px 12px;border:1px solid #fecaca;color:#475569;">${escapeHtml(leadId)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;font-weight:600;color:#991b1b;">Name</td>
        <td style="padding:8px 12px;border:1px solid #fecaca;color:#475569;">${escapeHtml(maskedName)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;font-weight:600;color:#991b1b;">Service</td>
        <td style="padding:8px 12px;border:1px solid #fecaca;color:#475569;">${escapeHtml(funnelId)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;font-weight:600;color:#991b1b;">ZIP Code</td>
        <td style="padding:8px 12px;border:1px solid #fecaca;color:#475569;">${escapeHtml(zipCode)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;font-weight:600;color:#991b1b;">Reason</td>
        <td style="padding:8px 12px;border:1px solid #fecaca;color:#dc2626;font-weight:600;">${escapeHtml(reason)}</td>
      </tr>
    </table>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      Please review the lead in the admin console and assign it manually if needed.
    </p>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        This is an automated alert from Kanjona. Do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>`.trim();

  const textBody = [
    'UNASSIGNED LEAD ALERT',
    '',
    'A lead could not be matched to any assignment rule and requires manual review.',
    '',
    `Lead ID: ${leadId}`,
    `Name: ${maskedName}`,
    `Service: ${funnelId}`,
    `ZIP Code: ${zipCode}`,
    `Reason: ${reason}`,
    '',
    'Please review the lead in the admin console and assign it manually if needed.',
    '',
    '---',
    'This is an automated alert from Kanjona. Do not reply to this email.',
  ].join('\n');

  return { subject, htmlBody, textBody };
}
