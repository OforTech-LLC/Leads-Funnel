/**
 * Security utilities for spam detection and suspicious lead analysis
 *
 * Provides heuristic-based detection of potentially malicious or spam leads,
 * including disposable email detection, spam keyword analysis, and URL counting.
 *
 * Also includes GDPR-compliant IP anonymization and salted email hashing.
 *
 * Privacy Architecture:
 * - Full IPs are never stored in logs (GDPR compliance)
 * - Emails are hashed with salt for deduplication without storing plaintext
 * - Anonymized data still allows abuse detection and geographic analysis
 */

import type { NormalizedLead, SecurityAnalysis } from '../types.js';
import { hashIp, hashEmailWithSalt, generateIdempotencyKey } from './hash.js';
import { getWindowBucket } from './time.js';

// =============================================================================
// Disposable Email Domains (hardcoded small list)
// =============================================================================

/**
 * Known disposable/temporary email domains that indicate potential spam
 *
 * Security: Disposable emails are commonly used for spam, fraud, and
 * avoiding accountability. Flagging these helps identify low-quality leads.
 *
 * Note: This is a small hardcoded list. Production systems may want to
 * use a more comprehensive database or third-party API.
 */
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

/**
 * Common spam indicator keywords found in message content
 *
 * Security: These keywords are commonly found in unsolicited marketing,
 * scam attempts, and spam submissions. Their presence increases suspicion score.
 */
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

/**
 * Pattern to detect HTTP/HTTPS URLs in text
 *
 * Security: Multiple URLs in form submissions often indicate spam content
 * (e.g., link farms, phishing attempts, or SEO spam).
 */
const URL_REGEX = /https?:\/\/[^\s]+/gi;

// =============================================================================
// Environment Configuration
// =============================================================================

/**
 * Get the email hash salt from environment
 *
 * Security: Salt must be unique per environment to prevent rainbow table attacks.
 * Even if attackers obtain hashed emails from one environment, they cannot
 * use those hashes to identify users in another environment.
 *
 * Warning: Changing the salt will invalidate all existing email hashes,
 * breaking deduplication against historical data.
 *
 * @throws Error if EMAIL_HASH_SALT is not configured
 */
function getEmailHashSalt(): string {
  const salt = process.env.EMAIL_HASH_SALT;
  if (!salt) {
    throw new Error('EMAIL_HASH_SALT environment variable must be set');
  }
  return salt;
}

// =============================================================================
// IP Anonymization (GDPR Compliance)
// =============================================================================

/**
 * Anonymize an IPv4 address by zeroing the last octet
 *
 * GDPR Compliance: Full IP addresses are personal data under GDPR.
 * Zeroing the last octet (e.g., 192.168.1.123 -> 192.168.1.0) anonymizes
 * the address while preserving geographic and network information for
 * abuse detection and analytics.
 *
 * This technique is endorsed by data protection authorities including
 * the German DPA and is used by Google Analytics in anonymized mode.
 *
 * @param ip - The full IPv4 address
 * @returns Anonymized IP (e.g., "192.168.1.0")
 */
export function anonymizeIPv4(ip: string): string {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return 'invalid';
  }
  // Zero the last octet - removes individual identification
  // while preserving /24 network information
  parts[3] = '0';
  return parts.join('.');
}

/**
 * Anonymize an IPv6 address by zeroing the last 80 bits
 *
 * GDPR Compliance: Reduces IPv6 to /48 prefix which typically represents
 * an organization or ISP block, not an individual. This matches the
 * anonymization level recommended for GDPR compliance.
 *
 * @param ip - The full IPv6 address
 * @returns Anonymized IP prefix (e.g., "2001:db8:85a3::")
 */
export function anonymizeIPv6(ip: string): string {
  // Expand abbreviated IPv6 addresses
  const parts = ip.split(':');

  if (parts.length < 3) {
    return 'invalid';
  }

  // Keep only the first 3 segments (48 bits) for /48 prefix
  // This removes interface identifiers and host portions
  const prefix = parts.slice(0, 3).join(':');
  return `${prefix}::`;
}

/**
 * Anonymize an IP address for GDPR-compliant logging
 *
 * Automatically detects IPv4 vs IPv6 and applies appropriate anonymization:
 * - IPv4: Zeros the last octet (/24 prefix)
 * - IPv6: Reduces to /48 prefix
 *
 * @param ip - The full IP address (IPv4 or IPv6)
 * @returns Anonymized IP address safe for logging
 */
export function anonymizeIp(ip: string): string {
  if (!ip || ip === 'unknown') {
    return 'unknown';
  }

  // IPv6 addresses contain colons
  if (ip.includes(':')) {
    return anonymizeIPv6(ip);
  }

  // IPv4
  return anonymizeIPv4(ip);
}

// =============================================================================
// Security Analysis Functions
// =============================================================================

/**
 * Checks if an email address uses a known disposable email domain.
 *
 * @param email - The email address to check
 * @returns True if the email domain is in the disposable domains list
 */
function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

/**
 * Scans message content for known spam keywords.
 *
 * Security: Case-insensitive matching catches common spam patterns
 * regardless of capitalization tricks (e.g., "CRYPTO", "Crypto", "crypto").
 *
 * @param message - The message content to scan, or undefined
 * @returns Array of matched spam keywords found in the message
 */
function containsSpamKeywords(message: string | undefined): string[] {
  if (!message) return [];

  const lowerMessage = message.toLowerCase();
  return SPAM_KEYWORDS.filter((keyword) => lowerMessage.includes(keyword));
}

/**
 * Counts the number of URLs present in a message.
 *
 * Security: Multiple URLs in a message often indicate spam content:
 * - Link farms attempting to gain SEO value
 * - Phishing attempts with multiple redirect links
 * - Promotional spam with product links
 *
 * Threshold of 2+ URLs triggers suspicious flag based on heuristic analysis.
 *
 * @param message - The message content to analyze, or undefined
 * @returns The count of HTTP/HTTPS URLs found
 */
function countUrls(message: string | undefined): number {
  if (!message) return 0;
  const matches = message.match(URL_REGEX);
  return matches ? matches.length : 0;
}

/**
 * Extracts the real client IP address from request headers.
 *
 * Security Considerations:
 * - X-Forwarded-For can be spoofed by malicious clients
 * - Only trust it when infrastructure (CloudFront/ALB) validates/overwrites it
 * - Take the FIRST IP as it represents the original client
 *
 * @param headers - Request headers object with potential forwarding headers
 * @param sourceIp - Fallback source IP from the request context
 * @returns The extracted client IP address, or 'unknown' if unavailable
 */
export function extractClientIp(
  headers: Record<string, string | undefined>,
  sourceIp?: string
): string {
  // Check X-Forwarded-For header (common for API Gateway / load balancers)
  const forwardedFor = headers['x-forwarded-for'] || headers['X-Forwarded-For'];
  if (forwardedFor) {
    // Take the first IP (original client)
    // Format: "client_ip, proxy1_ip, proxy2_ip"
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  // Fall back to source IP from request context
  if (sourceIp) return sourceIp;

  // Ultimate fallback (should not happen in Lambda)
  return 'unknown';
}

/**
 * Performs comprehensive security analysis on a lead submission.
 *
 * Analysis Checks:
 * 1. Disposable email domain - indicates throwaway/fake leads
 * 2. Spam keywords in message - indicates promotional/scam content
 * 3. URL count in message - multiple URLs suggest spam/link farms
 *
 * Generated Security Artifacts:
 * - ipHash: For rate limiting without storing raw IP (privacy)
 * - emailHash: For deduplication without storing plaintext email
 * - idempotencyKey: For preventing duplicate submissions within time window
 *
 * @param lead - The normalized lead data to analyze
 * @param clientIp - The client's IP address
 * @param ipHashSalt - Salt for IP hashing (should be environment-specific)
 * @param windowMinutes - Time window for idempotency key generation
 * @returns Complete security analysis with suspicious flag, reasons, and hashes
 */
export function analyzeLeadSecurity(
  lead: NormalizedLead,
  clientIp: string,
  ipHashSalt: string,
  windowMinutes: number
): SecurityAnalysis {
  const reasons: string[] = [];

  // Check 1: Disposable email detection
  if (isDisposableEmail(lead.email)) {
    reasons.push('disposable_email_domain');
  }

  // Check 2: Spam keyword detection
  const spamKeywords = containsSpamKeywords(lead.message);
  if (spamKeywords.length > 0) {
    reasons.push(`spam_keywords: ${spamKeywords.join(', ')}`);
  }

  // Check 3: Excessive URL detection (threshold: 2+)
  const urlCount = countUrls(lead.message);
  if (urlCount >= 2) {
    reasons.push(`excessive_urls: ${urlCount}`);
  }

  // Generate privacy-preserving hashes for rate limiting and deduplication
  // These allow abuse detection without storing PII
  const ipHash = hashIp(clientIp, ipHashSalt);
  const emailHashSalt = getEmailHashSalt();
  const emailHash = hashEmailWithSalt(lead.email, emailHashSalt);

  // Idempotency key prevents duplicate submissions from same email/page
  // within the time window (e.g., double-click, page refresh)
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

/**
 * Prepare log-safe lead data that complies with GDPR
 *
 * Privacy: Creates audit log data without storing any PII directly:
 * - IP is anonymized (last octet zeroed)
 * - IP hash allows correlation without storing full IP
 * - Email hash allows deduplication without storing plaintext
 *
 * @param leadId - The lead ID
 * @param clientIp - The client IP address
 * @param email - The email address
 * @param ipHashSalt - Salt for IP hashing
 * @returns Object safe for logging (no raw PII)
 */
export function prepareAuditLogData(
  leadId: string,
  clientIp: string,
  email: string,
  ipHashSalt: string
): {
  leadId: string;
  anonymizedIp: string;
  ipHash: string;
  emailHash: string;
  timestamp: string;
} {
  const emailHashSalt = getEmailHashSalt();

  return {
    leadId,
    anonymizedIp: anonymizeIp(clientIp),
    ipHash: hashIp(clientIp, ipHashSalt),
    emailHash: hashEmailWithSalt(email, emailHashSalt),
    timestamp: new Date().toISOString(),
  };
}
