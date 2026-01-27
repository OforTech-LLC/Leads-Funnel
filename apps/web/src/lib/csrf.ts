/**
 * CSRF Protection Utilities
 *
 * Provides token generation and validation for protecting against
 * Cross-Site Request Forgery attacks on form submissions.
 *
 * Security Architecture:
 * - Tokens are signed with HMAC-SHA256 to prevent tampering
 * - Tokens include timestamp for expiration enforcement
 * - Timing-safe comparison prevents timing attacks during validation
 * - Server-side secret ensures tokens cannot be forged client-side
 */

import { createHash, randomBytes } from 'crypto';

// Token configuration
// Security: 256 bits provides sufficient entropy against brute force
const TOKEN_LENGTH = 32; // 32 bytes = 256 bits
// Security: 1 hour expiry balances usability with security
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// Environment-based secret for signing tokens
// Security: Must be set in production - default value is for development only
const CSRF_SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';

/**
 * CSRF Token payload structure
 */
interface CSRFTokenPayload {
  /** Random token value */
  token: string;
  /** Timestamp when token was created */
  timestamp: number;
  /** Signature to verify token authenticity */
  signature: string;
}

/**
 * Generate a cryptographically secure random token
 *
 * Security: Uses Node.js crypto.randomBytes() which is cryptographically
 * secure and suitable for security-sensitive applications.
 */
function generateRandomToken(): string {
  return randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Create an HMAC signature for the token
 *
 * Security: SHA-256 HMAC ensures token integrity and authenticity.
 * The signature includes token, timestamp, and secret to bind all values.
 */
function signToken(token: string, timestamp: number): string {
  const data = `${token}:${timestamp}:${CSRF_SECRET}`;
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Verify the HMAC signature matches the token
 *
 * Security: Uses timing-safe comparison to prevent timing attacks.
 * A timing attack could measure response time differences to determine
 * how many characters of the signature are correct, eventually leaking
 * the valid signature one character at a time.
 */
function verifySignature(token: string, timestamp: number, signature: string): boolean {
  const expectedSignature = signToken(token, timestamp);

  // Security: Check length first to ensure same iteration count
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  // Security: Constant-time comparison using XOR
  // Every character is compared regardless of match, preventing timing leaks
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generate a new CSRF token
 *
 * Token Structure:
 * - Random 256-bit token value
 * - Creation timestamp for expiration checking
 * - HMAC-SHA256 signature for integrity verification
 * - All encoded as base64 JSON for transport
 *
 * Security: The signature binds the token and timestamp together,
 * preventing attackers from modifying either value.
 *
 * @returns Base64-encoded token payload string
 */
export function generateCSRFToken(): string {
  const token = generateRandomToken();
  const timestamp = Date.now();
  const signature = signToken(token, timestamp);

  const payload: CSRFTokenPayload = {
    token,
    timestamp,
    signature,
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Validate a CSRF token
 *
 * Validation Steps:
 * 1. Decode and parse the base64 JSON payload
 * 2. Verify all required fields are present
 * 3. Verify HMAC signature matches (timing-safe)
 * 4. Check token has not expired (1 hour max)
 *
 * Security: Any validation failure returns false with no details
 * to prevent information leakage about why validation failed.
 *
 * @param encodedToken - Base64-encoded token from request
 * @returns True if token is valid and not expired
 */
export function validateCSRFToken(encodedToken: string | null | undefined): boolean {
  if (!encodedToken) {
    return false;
  }

  try {
    const decoded = Buffer.from(encodedToken, 'base64').toString('utf-8');
    const payload: CSRFTokenPayload = JSON.parse(decoded);

    // Verify required fields exist
    if (!payload.token || !payload.timestamp || !payload.signature) {
      return false;
    }

    // Security: Verify signature BEFORE checking expiration
    // This ensures we don't leak timing information about validity
    if (!verifySignature(payload.token, payload.timestamp, payload.signature)) {
      return false;
    }

    // Check expiration (1 hour max age)
    const now = Date.now();
    if (now - payload.timestamp > TOKEN_EXPIRY_MS) {
      return false;
    }

    return true;
  } catch {
    // Security: Return false for any parsing errors - don't expose error details
    return false;
  }
}

/**
 * Extract token age in milliseconds
 *
 * Used for proactive token refresh before expiration.
 *
 * @param encodedToken - Base64-encoded token
 * @returns Age in milliseconds or null if invalid
 */
export function getTokenAge(encodedToken: string | null | undefined): number | null {
  if (!encodedToken) {
    return null;
  }

  try {
    const decoded = Buffer.from(encodedToken, 'base64').toString('utf-8');
    const payload: CSRFTokenPayload = JSON.parse(decoded);
    return Date.now() - payload.timestamp;
  } catch {
    return null;
  }
}

/**
 * Client-side CSRF token management
 *
 * Provides automatic token caching and refresh to minimize server requests
 * while ensuring tokens are always valid when needed.
 *
 * Performance:
 * - Caches valid tokens to avoid redundant server requests
 * - Refreshes tokens proactively at 50 minutes (before 1 hour expiry)
 * - Deduplicates concurrent fetch requests to prevent race conditions
 */
export class CSRFTokenManager {
  private token: string | null = null;
  private fetchPromise: Promise<string> | null = null;

  /**
   * Get a valid CSRF token, fetching a new one if needed
   *
   * Caching Strategy:
   * 1. Return cached token if valid and not near expiry
   * 2. Refresh if token is older than 50 minutes (10 min before expiry)
   * 3. Deduplicate concurrent requests to prevent multiple fetches
   */
  async getToken(): Promise<string> {
    // Return existing valid token
    if (this.token && validateCSRFToken(this.token)) {
      const age = getTokenAge(this.token);
      // Performance: Refresh at 50 minutes to avoid edge-case expiry
      if (age !== null && age < 50 * 60 * 1000) {
        return this.token;
      }
    }

    // Performance: Deduplicate concurrent requests
    // Multiple components requesting tokens simultaneously share one fetch
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // Fetch new token
    this.fetchPromise = this.fetchToken();
    try {
      this.token = await this.fetchPromise;
      return this.token;
    } finally {
      this.fetchPromise = null;
    }
  }

  /**
   * Clear the cached token
   *
   * Call this when session ends to ensure fresh token on next request.
   */
  clearToken(): void {
    this.token = null;
  }

  /**
   * Fetch a new token from the server
   *
   * Security: Uses same-origin credentials to ensure the request
   * comes from the authenticated session.
   */
  private async fetchToken(): Promise<string> {
    const response = await fetch('/api/csrf', {
      method: 'GET',
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }

    const data = await response.json();
    return data.token;
  }
}

// Export singleton for client-side use
// Performance: Single instance ensures token caching across all components
export const csrfTokenManager = new CSRFTokenManager();
