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
 *
 * Performance: Uses the centralized SES client from clients.ts with
 * HTTP keep-alive for connection reuse across Lambda invocations.
 */
import type { LeadRecord } from '../types/events.js';
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
export declare function sendEmail(params: SendEmailParams): Promise<SendEmailResult>;
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
export declare function buildLeadAssignedEmail(lead: LeadRecord, recipientName: string): EmailContent;
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
export declare function buildLeadUnassignedEmail(lead: LeadRecord, reason: string): EmailContent;
