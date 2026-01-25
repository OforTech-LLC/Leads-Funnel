/**
 * Hashing utilities for privacy-preserving logging and idempotency
 */

import { createHash } from 'crypto';

/**
 * Compute SHA-256 hash of a string
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Hash an IP address with optional salt
 * Never store or log raw IP addresses
 */
export function hashIp(ip: string, salt: string = ''): string {
  return sha256(`${ip}${salt}`);
}

/**
 * Hash an email address for logging
 * Never log raw email addresses
 */
export function hashEmail(email: string): string {
  return sha256(email.toLowerCase().trim());
}

/**
 * Generate idempotency key from email, pageUrl, and window bucket
 */
export function generateIdempotencyKey(
  normalizedEmail: string,
  pageUrl: string | undefined,
  windowBucket: string
): string {
  const input = `${normalizedEmail}|${pageUrl || ''}|${windowBucket}`;
  return sha256(input);
}
