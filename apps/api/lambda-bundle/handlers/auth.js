/**
 * Auth Handler
 *
 * Handles /auth/admin and /auth/portal endpoints for:
 * - POST: Store tokens in httpOnly cookie after OAuth code exchange
 * - GET: Check authentication status and return user info
 * - DELETE: Clear auth cookie (logout)
 */
import { verifyJwt } from '../lib/auth/jwt.js';
import { buildCorsHeaders as buildCors } from '../lib/cors.js';
import { createLogger } from '../lib/logging.js';
import { HTTP_STATUS, CONTENT_TYPES } from '../lib/constants.js';
const log = createLogger('auth-handler');
// Cookie names
const ADMIN_COOKIE_NAME = 'admin_token';
const PORTAL_COOKIE_NAME = 'portal_token';
// Cookie settings
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds
// =============================================================================
// Response Helpers
// =============================================================================
function buildCorsHeaders(requestOrigin) {
    return buildCors(requestOrigin, {
        allowMethods: 'GET,POST,DELETE,OPTIONS',
        allowHeaders: 'content-type,authorization,x-csrf-token,x-request-id',
        contentType: CONTENT_TYPES.JSON,
        allowFallbackOrigin: true,
    });
}
function jsonResponse(statusCode, body, headers = {}) {
    return {
        statusCode,
        headers,
        body: JSON.stringify(body),
    };
}
function setCookieHeader(name, value, maxAge, isProduction) {
    const parts = [`${name}=${value}`, `Path=/`, `Max-Age=${maxAge}`, `HttpOnly`, `SameSite=Lax`];
    if (isProduction) {
        parts.push('Secure');
    }
    return parts.join('; ');
}
function clearCookieHeader(name, isProduction) {
    const parts = [`${name}=`, `Path=/`, `Max-Age=0`, `HttpOnly`, `SameSite=Lax`];
    if (isProduction) {
        parts.push('Secure');
    }
    return parts.join('; ');
}
function getCookie(event, name) {
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
// =============================================================================
// Token Verification
// =============================================================================
async function verifyToken(token, type) {
    const envPrefix = type === 'admin' ? 'ADMIN_' : 'PORTAL_';
    const issuer = process.env[`${envPrefix}COGNITO_ISSUER`] || process.env.COGNITO_ISSUER || '';
    const audience = process.env[`${envPrefix}COGNITO_CLIENT_ID`] || process.env.COGNITO_CLIENT_ID || '';
    if (!issuer) {
        return { valid: false, error: 'Authentication not configured' };
    }
    try {
        const claims = await verifyJwt(token, issuer, audience || undefined);
        return { valid: true, claims };
    }
    catch (err) {
        log.warn('auth.verifyToken.failed', { type, error: err });
        return { valid: false, error: 'Invalid or expired token' };
    }
}
// =============================================================================
// Route Handlers
// =============================================================================
async function handlePost(event, type) {
    const requestOrigin = event.headers?.origin || event.headers?.Origin;
    const headers = buildCorsHeaders(requestOrigin);
    const isProduction = event.headers?.host?.includes('kanjona.com') || false;
    const cookieName = type === 'admin' ? ADMIN_COOKIE_NAME : PORTAL_COOKIE_NAME;
    try {
        const body = event.body ? JSON.parse(event.body) : null;
        if (!body || !body.accessToken) {
            return jsonResponse(HTTP_STATUS.BAD_REQUEST, { message: 'Missing accessToken' }, headers);
        }
        const payload = body;
        // Verify the token before storing
        const result = await verifyToken(payload.accessToken, type);
        if (!result.valid) {
            return jsonResponse(HTTP_STATUS.UNAUTHORIZED, { message: result.error }, headers);
        }
        // Set the cookie with the access token
        const cookieValue = payload.accessToken;
        const maxAge = payload.expiresIn || COOKIE_MAX_AGE;
        log.info('auth.storeToken', { type, email: result.claims.email });
        return {
            statusCode: HTTP_STATUS.OK,
            headers: {
                ...headers,
                'Set-Cookie': setCookieHeader(cookieName, cookieValue, maxAge, isProduction),
            },
            body: JSON.stringify({
                ok: true,
                user: {
                    email: result.claims.email || result.claims['cognito:username'],
                    sub: result.claims.sub,
                    groups: result.claims['cognito:groups'] || [],
                },
            }),
        };
    }
    catch (err) {
        log.error('auth.storeToken.error', { type, error: err });
        return jsonResponse(HTTP_STATUS.BAD_REQUEST, { message: 'Invalid request body' }, headers);
    }
}
async function handleGet(event, type) {
    const requestOrigin = event.headers?.origin || event.headers?.Origin;
    const headers = buildCorsHeaders(requestOrigin);
    const cookieName = type === 'admin' ? ADMIN_COOKIE_NAME : PORTAL_COOKIE_NAME;
    const token = getCookie(event, cookieName);
    if (!token) {
        return jsonResponse(HTTP_STATUS.UNAUTHORIZED, { authenticated: false }, headers);
    }
    const result = await verifyToken(token, type);
    if (!result.valid) {
        return jsonResponse(HTTP_STATUS.UNAUTHORIZED, { authenticated: false, error: result.error }, headers);
    }
    return jsonResponse(HTTP_STATUS.OK, {
        authenticated: true,
        user: {
            email: result.claims.email || result.claims['cognito:username'],
            sub: result.claims.sub,
            groups: result.claims['cognito:groups'] || [],
        },
    }, headers);
}
async function handleDelete(event, type) {
    const requestOrigin = event.headers?.origin || event.headers?.Origin;
    const headers = buildCorsHeaders(requestOrigin);
    const isProduction = event.headers?.host?.includes('kanjona.com') || false;
    const cookieName = type === 'admin' ? ADMIN_COOKIE_NAME : PORTAL_COOKIE_NAME;
    log.info('auth.logout', { type });
    return {
        statusCode: HTTP_STATUS.OK,
        headers: {
            ...headers,
            'Set-Cookie': clearCookieHeader(cookieName, isProduction),
        },
        body: JSON.stringify({ ok: true }),
    };
}
// =============================================================================
// Main Handler
// =============================================================================
export async function handler(event) {
    const path = event.requestContext.http.path;
    const method = event.requestContext.http.method;
    const requestOrigin = event.headers?.origin || event.headers?.Origin;
    log.info('auth.request', { method, path });
    // Determine auth type from path
    let type;
    if (path === '/auth/admin' || path.startsWith('/auth/admin/')) {
        type = 'admin';
    }
    else if (path === '/auth/portal' || path.startsWith('/auth/portal/')) {
        type = 'portal';
    }
    else {
        return jsonResponse(HTTP_STATUS.NOT_FOUND, { message: 'Not found' }, buildCorsHeaders(requestOrigin));
    }
    // Handle preflight
    if (method === 'OPTIONS') {
        return {
            statusCode: HTTP_STATUS.NO_CONTENT,
            headers: buildCorsHeaders(requestOrigin),
            body: '',
        };
    }
    // Route to handler
    switch (method) {
        case 'POST':
            return handlePost(event, type);
        case 'GET':
            return handleGet(event, type);
        case 'DELETE':
            return handleDelete(event, type);
        default:
            return jsonResponse(HTTP_STATUS.METHOD_NOT_ALLOWED, { message: 'Method not allowed' }, buildCorsHeaders(requestOrigin));
    }
}
//# sourceMappingURL=auth.js.map