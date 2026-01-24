import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * next-intl middleware for locale detection and routing
 * Handles:
 * - Redirecting `/` to `/en` (or detected locale)
 * - Locale detection from Accept-Language header
 * - Locale prefix enforcement
 */
export default createMiddleware(routing);

/**
 * Matcher configuration
 * Apply middleware to all routes except:
 * - API routes
 * - Static files
 * - Next.js internals
 */
export const config = {
  matcher: [
    // Match all pathnames except for
    // - API routes
    // - Static files (with extensions)
    // - Next.js internals
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
