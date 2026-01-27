/**
 * Content Security Policy Utilities
 *
 * Provides nonce generation and CSP directive management
 * for enhanced security against XSS attacks.
 */

import { headers } from 'next/headers';

/**
 * Generate a cryptographically secure nonce
 * Used for inline scripts and styles that need to bypass CSP
 */
export function generateNonce(): string {
  // In Node.js environment, use crypto
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    // Use randomUUID and encode as base64-like string
    const uuid = crypto.randomUUID();
    return Buffer.from(uuid).toString('base64').slice(0, 24);
  }

  // Fallback for edge runtime - use Array.from for compatibility
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const chars = Array.from(array, (byte) => String.fromCharCode(byte));
  return btoa(chars.join('')).slice(0, 24);
}

/**
 * Get the CSP nonce from request headers (set by middleware)
 * Returns empty string if not available (for static pages)
 */
export async function getNonce(): Promise<string> {
  try {
    const headersList = await headers();
    return headersList.get('x-nonce') || '';
  } catch {
    // Headers not available in static context
    return '';
  }
}

/**
 * CSP Directive Builder
 * Constructs Content-Security-Policy header value
 */
export interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'frame-src'?: string[];
  'frame-ancestors'?: string[];
  'base-uri'?: string[];
  'form-action'?: string[];
  'object-src'?: string[];
  'media-src'?: string[];
  'worker-src'?: string[];
  'manifest-src'?: string[];
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
}

/**
 * Build CSP header value from directives
 */
export function buildCSP(directives: CSPDirectives, nonce?: string): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(directives)) {
    if (value === true) {
      // Boolean directives like upgrade-insecure-requests
      parts.push(key);
    } else if (Array.isArray(value) && value.length > 0) {
      // Array directives
      const sources = [...value];

      // Add nonce to script-src and style-src if provided
      if (nonce && (key === 'script-src' || key === 'style-src')) {
        sources.push(`'nonce-${nonce}'`);
      }

      parts.push(`${key} ${sources.join(' ')}`);
    }
  }

  return parts.join('; ');
}

/**
 * Default CSP directives for the application
 * These can be customized per-page if needed
 */
export const defaultCSPDirectives: CSPDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'strict-dynamic'",
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for CSS-in-JS (inline styles via React)
    'https://fonts.googleapis.com',
  ],
  'img-src': ["'self'", 'data:', 'https:', 'blob:'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'connect-src': [
    "'self'",
    'https://api.kanjona.com',
    'https://*.amazonaws.com',
    'https://www.google-analytics.com',
  ],
  'frame-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'object-src': ["'none'"],
  'media-src': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
  'manifest-src': ["'self'"],
  'upgrade-insecure-requests': true,
};

/**
 * Strict CSP directives (more restrictive)
 * Use this when you don't need inline styles
 */
export const strictCSPDirectives: CSPDirectives = {
  ...defaultCSPDirectives,
  'style-src': [
    "'self'",
    'https://fonts.googleapis.com',
    // Nonce will be added dynamically
  ],
};

/**
 * CSP for pages with animations (GSAP)
 * Modern GSAP (3.x+) doesn't require unsafe-eval for most features
 */
export const animationCSPDirectives: CSPDirectives = {
  ...defaultCSPDirectives,
  // GSAP 3.12+ works without unsafe-eval for basic animations
  // Only add if you use GSAP's Expression plugin or MotionPath with complex expressions
  'script-src': [
    "'self'",
    "'strict-dynamic'",
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
  ],
};

/**
 * Generate CSP header with nonce for a request
 */
export function generateCSPHeader(
  nonce: string,
  directives: CSPDirectives = defaultCSPDirectives
): string {
  return buildCSP(directives, nonce);
}

/**
 * Security headers configuration
 * Used by middleware to add headers to responses
 */
export const securityHeaders = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // XSS protection (legacy, but still useful)
  'X-XSS-Protection': '1; mode=block',

  // Permissions Policy (restrict browser features)
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), bluetooth=(), serial=()',

  // HSTS - force HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Cross-Origin policies for isolation
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless', // Use 'credentialless' instead of 'require-corp' for broader compatibility

  // Prevent DNS prefetching to external domains
  'X-DNS-Prefetch-Control': 'off',

  // Download options for IE
  'X-Download-Options': 'noopen',
};

/**
 * Get all security headers including dynamic CSP
 */
export function getSecurityHeaders(nonce: string): Record<string, string> {
  return {
    ...securityHeaders,
    'Content-Security-Policy': generateCSPHeader(nonce),
  };
}
