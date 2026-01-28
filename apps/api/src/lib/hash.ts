/**
 * Hashing utilities for privacy-preserving logging and idempotency
 *
 * All hash functions use SHA-256 for security.
 * Sensitive data (emails, IPs) should always use salted hashing.
 */

import { createHash, createHmac } from 'crypto';

/**
 * Compute SHA-256 hash of a string
 *
 * @param input - String to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Compute HMAC-SHA-256 with a secret key
 *
 * More secure than concatenation for keyed hashing.
 *
 * @param input - String to hash
 * @param key - Secret key for HMAC
 * @returns Hex-encoded HMAC-SHA-256
 */
export function hmacSha256(input: string, key: string): string {
  return createHmac('sha256', key).update(input).digest('hex');
}

/**
 * Hash an IP address with salt for privacy-preserving rate limiting
 *
 * Uses HMAC for proper keyed hashing instead of simple concatenation.
 * Never store or log raw IP addresses.
 *
 * @param ip - The IP address to hash
 * @param salt - Salt for the hash (environment-specific)
 * @returns Hex-encoded hashed IP
 *
 * @example
 * ```typescript
 * const ipHash = hashIp(clientIp, process.env.IP_HASH_SALT);
 * ```
 */
export function hashIp(ip: string, salt: string = ''): string {
  if (!salt) {
    console.warn('[Security] IP hashing without salt - hashes are reversible');
    return sha256(ip);
  }
  return hmacSha256(ip, salt);
}

/**
 * Hash an email address with salt for privacy-preserving logging
 *
 * Uses HMAC for proper keyed hashing. This prevents rainbow table attacks
 * and ensures emails cannot be correlated across different systems.
 *
 * @param email - The email address to hash
 * @param salt - Salt for the hash (from EMAIL_HASH_SALT environment variable)
 * @returns Hex-encoded hashed email
 *
 * @example
 * ```typescript
 * const emailHash = hashEmailWithSalt(email, process.env.EMAIL_HASH_SALT);
 * ```
 */
export function hashEmailWithSalt(email: string, salt: string): string {
  const normalizedEmail = email.toLowerCase().trim();

  if (!salt) {
    // Warn and fallback if salt is not provided
    console.warn('[Hash] Email hashing without salt is not recommended');
    return sha256(normalizedEmail);
  }

  return hmacSha256(normalizedEmail, salt);
}

/**
 * Generate idempotency key from lead content
 *
 * Fix 6: Use content-based hashing instead of time-based buckets.
 * This ensures that submitting the exact same lead content (email + funnel + message)
 * always produces the same key, preventing duplicates even if the user
 * keeps the tab open for > 24 hours.
 *
 * @param normalizedEmail - Normalized (lowercase, trimmed) email
 * @param funnelId - Funnel identifier
 * @param content - Unique content payload (e.g. message + phone + name)
 * @returns Hex-encoded idempotency key
 */
export function generateIdempotencyKey(
  normalizedEmail: string,
  funnelId: string,
  content: string
): string {
  const input = `${normalizedEmail}|${funnelId}|${content}`;
  return sha256(input);
}

/**
 * Generate a truncated hash for display/logging purposes
 *
 * Useful for showing a partial identifier without revealing the full hash.
 *
 * @param input - String to hash
 * @param length - Number of characters to include (default 12)
 * @returns Truncated hex-encoded hash
 *
 * @example
 * ```typescript
 * const shortHash = truncatedHash(email, 8); // e.g., "a1b2c3d4"
 * ```
 */
export function truncatedHash(input: string, length: number = 12): string {
  return sha256(input).slice(0, length);
}
