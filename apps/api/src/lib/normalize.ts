/**
 * Normalization utilities for lead data
 */

import type { LeadRequestPayload, LeadUtm } from '@kanjona/shared';
import type { NormalizedLead } from '../types.js';

/**
 * Normalize whitespace in a string
 * Trims and collapses multiple spaces to single space
 */
function normalizeWhitespace(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Normalize email address
 * Lowercase and trim
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Normalize phone number
 * Simple trim - don't overcomplicate E.164 conversion
 */
function normalizePhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  const trimmed = phone.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Normalize message/notes
 * Trim whitespace
 */
function normalizeMessage(message: string | undefined): string | undefined {
  if (!message) return undefined;
  const trimmed = message.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Normalize UTM parameters
 */
function normalizeUtm(utm: LeadUtm | undefined): LeadUtm | undefined {
  if (!utm) return undefined;

  const normalized: LeadUtm = {};

  if (utm.utm_source) normalized.utm_source = utm.utm_source.trim();
  if (utm.utm_medium) normalized.utm_medium = utm.utm_medium.trim();
  if (utm.utm_campaign) normalized.utm_campaign = utm.utm_campaign.trim();
  if (utm.utm_term) normalized.utm_term = utm.utm_term.trim();
  if (utm.utm_content) normalized.utm_content = utm.utm_content.trim();

  // Return undefined if all fields are empty
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

/**
 * Normalize the entire lead payload
 */
export function normalizeLead(payload: LeadRequestPayload): NormalizedLead {
  return {
    name: normalizeWhitespace(payload.name || ''),
    email: normalizeEmail(payload.email),
    phone: normalizePhone(payload.phone),
    message: normalizeMessage(payload.notes),
    pageUrl: payload.metadata?.pageUrl?.trim(),
    referrer: payload.metadata?.referrer?.trim(),
    utm: normalizeUtm(payload.utm),
  };
}
