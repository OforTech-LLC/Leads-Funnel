/**
 * Shared Handler Utilities
 *
 * Common request-parsing helpers used by both the admin and portal API
 * handlers.  Extracted here to eliminate duplication.
 *
 * Usage:
 *   import { parseBody, pathParam, queryParam, getIpHash } from '../lib/handler-utils.js';
 */
import { sha256 } from './hash.js';
// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------
/**
 * Safely parse the JSON body of an API Gateway event.
 * Returns an empty object if the body is missing.
 * Returns null if the body is present but malformed JSON,
 * so callers can return a 400 response.
 */
export function parseBody(event) {
    if (!event.body)
        return {};
    try {
        return JSON.parse(event.body);
    }
    catch {
        return null;
    }
}
// ---------------------------------------------------------------------------
// Path / Query parameters
// ---------------------------------------------------------------------------
/**
 * Extract a positional segment from the request path.
 *
 * Example: for path "/admin/orgs/abc123", `pathParam(event, 2)` returns "abc123".
 *
 * @param event    API Gateway event
 * @param position Zero-based index into the non-empty path segments
 */
export function pathParam(event, position) {
    const parts = (event.requestContext.http.path || '').split('/').filter(Boolean);
    return parts[position] || '';
}
/**
 * Shorthand to read a single query-string parameter.
 */
export function queryParam(event, key) {
    return event.queryStringParameters?.[key];
}
/**
 * Parse standard pagination query parameters.
 *
 * @param event       API Gateway event
 * @param defaultLimit Default page size when the caller does not provide one
 * @param maxLimit     Upper cap for the page size
 */
export function parsePagination(event, defaultLimit = 25, maxLimit = 100) {
    const rawLimit = Number(queryParam(event, 'limit'));
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, maxLimit) : defaultLimit;
    return {
        cursor: queryParam(event, 'cursor'),
        limit,
    };
}
// ---------------------------------------------------------------------------
// IP hashing
// ---------------------------------------------------------------------------
/**
 * SHA-256 hash of the request source IP.
 * Used for audit logging without storing raw IP addresses.
 */
export function getIpHash(event) {
    const ip = event.requestContext?.http?.sourceIp || '';
    return sha256(ip);
}
// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------
/**
 * Read a cookie value from the incoming request headers.
 *
 * @param event API Gateway event
 * @param name  Cookie name to retrieve
 */
export function getCookie(event, name) {
    const cookieHeader = event.headers?.cookie || event.headers?.Cookie;
    if (!cookieHeader)
        return null;
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
        const [cookieName, cookieValue] = cookie.split('=');
        if (cookieName === name) {
            return cookieValue || null;
        }
    }
    return null;
}
//# sourceMappingURL=handler-utils.js.map