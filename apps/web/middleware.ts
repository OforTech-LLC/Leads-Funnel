/**
 * Next.js Middleware for i18n + CSP + Admin Route Protection
 *
 * - Enforces strict CSP with per-request nonce
 * - Handles locale routing via next-intl
 * - Protects admin routes with cookie-based auth
 */

import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

const PUBLIC_ADMIN_ROUTES = ['/admin/login', '/admin/callback'];

const intlMiddleware = createIntlMiddleware(routing);

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function buildCspHeader(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.kanjona.com https://api-dev.kanjona.com https://*.amazonaws.com https://*.amazoncognito.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

const securityHeaders: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), bluetooth=(), serial=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-DNS-Prefetch-Control': 'off',
  'X-Download-Options': 'noopen',
  'X-Permitted-Cross-Domain-Policies': 'none',
};

function decodeJwtPayload(token: string): { exp?: number } | null {
  const payload = token.split('.')[1];
  if (!payload) return null;

  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

  try {
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
}

/**
 * Check if the path is an admin route that requires protection
 *
 * Security: Normalizes the path by stripping locale prefix first to ensure
 * consistent matching regardless of which locale the user accesses.
 * This prevents bypass attempts like /xx/admin where xx is unexpected.
 */
function isProtectedAdminRoute(pathname: string): boolean {
  // Remove locale prefix if present
  // Security: Iterate through known locales only to prevent manipulation
  let normalizedPath = pathname;

  for (const locale of routing.locales) {
    if (pathname.startsWith(`/${locale}/`)) {
      normalizedPath = pathname.slice(locale.length + 1);
      break;
    }
  }

  // Check if it's an admin route
  if (!normalizedPath.startsWith('/admin')) {
    return false;
  }

  // Check if it's a public admin route (login/callback for OAuth flow)
  for (const publicRoute of PUBLIC_ADMIN_ROUTES) {
    if (normalizedPath === publicRoute || normalizedPath.startsWith(`${publicRoute}/`)) {
      return false;
    }
  }

  return true;
}

/**
 * Extract locale from pathname
 */
function getLocaleFromPath(pathname: string): string | null {
  for (const locale of routing.locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return locale;
    }
  }
  return null;
}

/**
 * Build the login redirect URL with proper locale
 *
 * Security: Preserves the original URL as redirect parameter so users
 * return to their intended destination after authentication.
 * The redirect param is validated server-side to prevent open redirects.
 */
function buildLoginUrl(request: NextRequest, locale: string | null): string {
  const baseUrl = request.nextUrl.clone();
  const localePrefix = locale ? `/${locale}` : `/${routing.defaultLocale}`;

  baseUrl.pathname = `${localePrefix}/admin/login`;

  // Preserve the original URL as a redirect parameter
  const originalUrl = request.nextUrl.pathname + request.nextUrl.search;
  baseUrl.searchParams.set('redirect', originalUrl);

  return baseUrl.toString();
}

/**
 * Main middleware function - executes on every matching request
 *
 * Authentication Flow:
 * 1. Skip static files and API routes (handled separately)
 * 2. Check if route requires protection
 * 3. Verify admin_token cookie exists and is structurally valid
 * 4. Redirect to login if no token present or token is invalid/expired
 *
 * Security Note: This middleware checks cookie presence and basic JWT validity
 * (structure + expiry). Full JWT signature verification happens in API routes
 * to avoid JWKS calls on every request.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  // Performance: Early return for non-protected resources avoids unnecessary processing
  // Security: API routes have their own auth middleware with full JWT verification
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // Static files (images, fonts, etc.)
  ) {
    return NextResponse.next();
  }

  const nonce = generateNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  const abBucketCookie = request.cookies.get('ab-bucket')?.value;

  // Check if this is a protected admin route
  if (!isProtectedAdminRoute(pathname)) {
    const intlResponse = intlMiddleware(request);
    const response = applySecurityHeaders(intlResponse, requestHeaders, nonce, abBucketCookie);
    return response;
  }

  // Check for admin authentication token
  // Security: httpOnly cookie prevents XSS from stealing the token
  const adminToken = request.cookies.get('admin_token');

  if (!adminToken?.value) {
    const locale = getLocaleFromPath(pathname);
    const loginUrl = buildLoginUrl(request, locale);
    return NextResponse.redirect(loginUrl);
  }

  const payload = decodeJwtPayload(adminToken.value);
  if (!payload) {
    const locale = getLocaleFromPath(pathname);
    const loginPath = `/${locale || routing.defaultLocale}/admin/login`;
    const response = NextResponse.redirect(new URL(loginPath, request.url));
    response.cookies.delete('admin_token');
    return response;
  }

  if (payload.exp && payload.exp * 1000 < Date.now()) {
    const locale = getLocaleFromPath(pathname);
    const loginPath = `/${locale || routing.defaultLocale}/admin/login`;
    const response = NextResponse.redirect(new URL(loginPath, request.url));
    response.cookies.delete('admin_token');
    return response;
  }

  const intlResponse = intlMiddleware(request);
  return applySecurityHeaders(intlResponse, requestHeaders, nonce, abBucketCookie);
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    // Performance: Excludes paths that never need auth checks
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

function applySecurityHeaders(
  intlResponse: NextResponse,
  requestHeaders: Headers,
  nonce: string,
  abBucketCookie?: string
): NextResponse {
  // If next-intl already decided to redirect, preserve it.
  if (intlResponse.headers.get('location')) {
    for (const [key, value] of Object.entries(securityHeaders)) {
      intlResponse.headers.set(key, value);
    }
    intlResponse.headers.set('Content-Security-Policy', buildCspHeader(nonce));
    intlResponse.headers.set('x-nonce', nonce);
    return intlResponse;
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Merge headers from next-intl (e.g., locale cookies, rewrites)
  for (const [key, value] of intlResponse.headers.entries()) {
    if (key.toLowerCase() === 'set-cookie') {
      response.headers.append(key, value);
    } else {
      response.headers.set(key, value);
    }
  }

  // A/B Testing: Assign bucket if not present
  if (!abBucketCookie) {
    const bucket = Math.random() < 0.5 ? 'A' : 'B';
    response.cookies.set('ab-bucket', bucket, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: false,
      sameSite: 'lax',
    });
    response.headers.set('x-ab-bucket', bucket);
  } else {
    response.headers.set('x-ab-bucket', abBucketCookie);
  }

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  response.headers.set('Content-Security-Policy', buildCspHeader(nonce));
  response.headers.set('x-nonce', nonce);
  return response;
}
