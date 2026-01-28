import { type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * Generate a cryptographically secure nonce for CSP
 * Uses Array.from for TypeScript compatibility
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const chars = Array.from(array, (byte) => String.fromCharCode(byte));
  return btoa(chars.join('')).slice(0, 24);
}

/**
 * Build Content-Security-Policy header with nonce
 */
function buildCSPHeader(nonce: string): string {
  const directives = [
    "default-src 'self'",
    // script-src: use nonce and strict-dynamic for modern browsers
    // strict-dynamic ignores 'self' and 'unsafe-inline' in supporting browsers
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com https://www.google-analytics.com`,
    // style-src: unsafe-inline needed for CSS-in-JS (React inline styles, framer-motion)
    // TODO: Consider using CSS modules or external stylesheets to remove unsafe-inline
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.kanjona.com https://*.amazonaws.com https://www.google-analytics.com",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    'upgrade-insecure-requests',
  ];

  return directives.join('; ');
}

/**
 * Security headers applied to all responses
 */
const securityHeaders: Record<string, string> = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // XSS protection (legacy, but still useful for older browsers)
  'X-XSS-Protection': '1; mode=block',

  // Permissions Policy - restrict browser features
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), bluetooth=(), serial=()',

  // HSTS - force HTTPS (1 year, include subdomains, allow preload list)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Cross-Origin policies for enhanced isolation
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',

  // Prevent DNS prefetching to external domains (privacy)
  'X-DNS-Prefetch-Control': 'off',

  // Prevent IE from executing downloads in site context
  'X-Download-Options': 'noopen',

  // Disable content type sniffing
  'X-Permitted-Cross-Domain-Policies': 'none',
};

// Create next-intl middleware
const intlMiddleware = createIntlMiddleware(routing);

/**
 * Combined middleware for i18n and security headers
 * Handles:
 * - Locale detection and routing (next-intl)
 * - CSP nonce generation
 * - Security headers injection
 */
export default async function middleware(request: NextRequest) {
  // Run next-intl middleware first
  const response = intlMiddleware(request);

  // Generate a unique nonce for this request
  const nonce = generateNonce();

  // Add CSP header with nonce
  response.headers.set('Content-Security-Policy', buildCSPHeader(nonce));

  // Add nonce header for server components to access
  response.headers.set('x-nonce', nonce);

  // A/B Testing: Assign bucket if not present
  if (!request.cookies.get('ab-bucket')) {
    const bucket = Math.random() < 0.5 ? 'A' : 'B';
    response.cookies.set('ab-bucket', bucket, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: false, // Accessible to client-side JS for analytics
      sameSite: 'lax',
    });
    // Add header for server components to access immediately
    response.headers.set('x-ab-bucket', bucket);
  } else {
    // Pass existing bucket to header for consistency
    response.headers.set('x-ab-bucket', request.cookies.get('ab-bucket')?.value || 'A');
  }

  // Add all security headers
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

/**
 * Matcher configuration
 * Apply middleware to all routes except:
 * - API routes
 * - Static files
 * - Next.js internals
 */
export const config = {
  matcher: [
    // Match all pathnames except for:
    // - API routes
    // - Static files (with extensions)
    // - Next.js internals (_next)
    // - Vercel internals (_vercel)
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
