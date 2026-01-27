/**
 * Next.js Middleware for Server-Side Authentication
 *
 * Protects admin routes by checking for valid admin_token cookie.
 * Supports locale prefixes (e.g., /en/admin, /es/admin).
 */

import { NextRequest, NextResponse } from 'next/server';

// Locales supported by the application
const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'pt'];

// Routes that don't require authentication
// Security: Login/callback must be public to allow the OAuth flow to complete
const PUBLIC_ADMIN_ROUTES = ['/admin/login', '/admin/callback'];

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

  for (const locale of SUPPORTED_LOCALES) {
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
  for (const locale of SUPPORTED_LOCALES) {
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
  const localePrefix = locale ? `/${locale}` : '';

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

  // Check if this is a protected admin route
  if (!isProtectedAdminRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for admin authentication token
  // Security: httpOnly cookie prevents XSS from stealing the token
  const adminToken = request.cookies.get('admin_token');

  if (!adminToken?.value) {
    // No token - redirect to login
    const locale = getLocaleFromPath(pathname);
    const loginUrl = buildLoginUrl(request, locale);

    return NextResponse.redirect(loginUrl);
  }

  // Security: Validate JWT structure and expiry
  // Full JWT signature verification happens in admin components/API routes
  // using Cognito JWKS. Middleware provides defense-in-depth by catching
  // malformed or expired tokens early.
  if (adminToken?.value) {
    try {
      const parts = adminToken.value.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      if (payload.exp && payload.exp * 1000 < Date.now()) throw new Error('Token expired');
    } catch {
      const locale = getLocaleFromPath(pathname);
      const loginPath = `/${locale || 'en'}/admin/login`;
      const response = NextResponse.redirect(new URL(loginPath, request.url));
      response.cookies.delete('admin_token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    // Performance: Excludes paths that never need auth checks
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
