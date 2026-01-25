/**
 * Security utilities for spam detection and suspicious lead analysis
 */

import type { NormalizedLead, SecurityAnalysis } from '../types.js';
import { hashIp, hashEmail, generateIdempotencyKey } from './hash.js';
import { getWindowBucket } from './time.js';

// =============================================================================
// Disposable Email Domains (hardcoded small list)
// =============================================================================

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com',
  'guerrillamail.com',
  'temp-mail.org',
  'yopmail.com',
  'tempmail.com',
  'throwaway.email',
  'fakeinbox.com',
  'trashmail.com',
  'sharklasers.com',
]);

// =============================================================================
// Spam Keywords (case-insensitive)
// =============================================================================

const SPAM_KEYWORDS = [
  'backlinks',
  'seo services',
  'crypto',
  'telegram',
  'whatsapp marketing',
  'buy followers',
  'cheap traffic',
  'make money fast',
  'work from home',
  'guaranteed income',
];

// =============================================================================
// URL Detection Regex
// =============================================================================

const URL_REGEX = /https?:\/\/[^\s]+/gi;

// =============================================================================
// Security Analysis Functions
// =============================================================================

/**
 * Check if email domain is disposable
 */
function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

/**
 * Check message for spam keywords
 */
function containsSpamKeywords(message: string | undefined): string[] {
  if (!message) return [];

  const lowerMessage = message.toLowerCase();
  return SPAM_KEYWORDS.filter((keyword) => lowerMessage.includes(keyword));
}

/**
 * Count URLs in message
 */
function countUrls(message: string | undefined): number {
  if (!message) return 0;
  const matches = message.match(URL_REGEX);
  return matches ? matches.length : 0;
}

/**
 * Extract client IP from request headers
 * Prefers X-Forwarded-For (first entry), falls back to source IP
 */
export function extractClientIp(
  headers: Record<string, string | undefined>,
  sourceIp?: string
): string {
  // Check X-Forwarded-For header (common for API Gateway / load balancers)
  const forwardedFor = headers['x-forwarded-for'] || headers['X-Forwarded-For'];
  if (forwardedFor) {
    // Take the first IP (original client)
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  // Fall back to source IP from request context
  if (sourceIp) return sourceIp;

  // Ultimate fallback (should not happen in Lambda)
  return 'unknown';
}

/**
 * Analyze lead for suspicious patterns
 */
export function analyzeLeadSecurity(
  lead: NormalizedLead,
  clientIp: string,
  ipHashSalt: string,
  windowMinutes: number
): SecurityAnalysis {
  const reasons: string[] = [];

  // Check disposable email
  if (isDisposableEmail(lead.email)) {
    reasons.push('disposable_email_domain');
  }

  // Check spam keywords in message
  const spamKeywords = containsSpamKeywords(lead.message);
  if (spamKeywords.length > 0) {
    reasons.push(`spam_keywords: ${spamKeywords.join(', ')}`);
  }

  // Check URL count in message
  const urlCount = countUrls(lead.message);
  if (urlCount >= 2) {
    reasons.push(`excessive_urls: ${urlCount}`);
  }

  // Generate hashes
  const ipHash = hashIp(clientIp, ipHashSalt);
  const emailHash = hashEmail(lead.email);
  const windowBucket = getWindowBucket(windowMinutes);
  const idempotencyKey = generateIdempotencyKey(lead.email, lead.pageUrl, windowBucket);

  return {
    suspicious: reasons.length > 0,
    reasons,
    ipHash,
    emailHash,
    idempotencyKey,
  };
}
