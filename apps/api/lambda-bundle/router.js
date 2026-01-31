/**
 * API Router
 *
 * Routes incoming requests to appropriate handlers based on path.
 * Provides a unified entry point for all API endpoints.
 *
 * Routes:
 *   /health       -> Health check handler
 *   /lead         -> Public lead capture handler
 *   /admin/*      -> Admin console handler (feature-flagged)
 *   /portal/*     -> Agent portal handler (feature-flagged)
 */
import { handler as leadHandler } from './handler.js';
import { handler as healthHandler } from './health/handler.js';
import { handler as adminHandler } from './handlers/admin.js';
import { handler as portalHandler } from './handlers/portal.js';
import { handler as authHandler } from './handlers/auth.js';
import { buildCorsHeaders as buildCors } from './lib/cors.js';
import { checkFeatureEnabled } from './lib/response.js';
import { createLogger } from './lib/logging.js';
import { HTTP_STATUS, CONTENT_TYPES } from './lib/constants.js';
const log = createLogger('router');
// =============================================================================
// Response Builders
// =============================================================================
function buildCorsHeaders(requestOrigin) {
    return buildCors(requestOrigin, {
        allowMethods: 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
        allowHeaders: 'content-type,authorization,x-csrf-token,x-request-id,x-idempotency-key,x-funnel-id',
        contentType: CONTENT_TYPES.JSON,
        allowFallbackOrigin: true,
    });
}
function notFound(requestOrigin) {
    return {
        statusCode: HTTP_STATUS.NOT_FOUND,
        headers: buildCorsHeaders(requestOrigin),
        body: JSON.stringify({
            ok: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Endpoint not found',
            },
        }),
    };
}
function preflight(requestOrigin) {
    return {
        statusCode: HTTP_STATUS.NO_CONTENT,
        headers: buildCorsHeaders(requestOrigin),
        body: '',
    };
}
// =============================================================================
// Path Normalization
// =============================================================================
function rewritePath(event, newPath) {
    return {
        ...event,
        rawPath: newPath,
        requestContext: {
            ...event.requestContext,
            http: {
                ...event.requestContext.http,
                path: newPath,
            },
        },
    };
}
function normalizePath(event) {
    const rawPath = event.requestContext.http.path;
    if (rawPath.startsWith('/api/admin')) {
        const normalized = rawPath.replace(/^\/api/, '');
        return { event: rewritePath(event, normalized), path: normalized };
    }
    if (rawPath.startsWith('/api/v1/portal')) {
        const normalized = rawPath.replace(/^\/api\/v1/, '');
        return { event: rewritePath(event, normalized), path: normalized };
    }
    return { event, path: rawPath };
}
// =============================================================================
// Router Handler
// =============================================================================
/**
 * Main router that dispatches requests to appropriate handlers.
 *
 * Feature-flagged routes return 404 when their flag is disabled,
 * making the endpoints invisible to external scanners.
 */
export async function router(event, context) {
    const normalized = normalizePath(event);
    const path = normalized.path;
    const method = event.requestContext.http.method;
    const requestOrigin = event.headers?.['origin'] || event.headers?.['Origin'];
    log.info('router.request', {
        method,
        path,
        requestId: context.awsRequestId,
    });
    // Global OPTIONS preflight
    if (method === 'OPTIONS') {
        return preflight(requestOrigin);
    }
    // Route based on path
    if (path === '/health' || path.startsWith('/health/')) {
        return healthHandler(normalized.event, context);
    }
    if (path === '/lead' ||
        path === '/leads' ||
        path.startsWith('/lead/') ||
        path.startsWith('/leads/') ||
        path.startsWith('/funnel/')) {
        return leadHandler(normalized.event, context);
    }
    // Auth routes (for admin and portal OAuth token management)
    if (path.startsWith('/auth/')) {
        return authHandler(normalized.event);
    }
    // Admin console routes (feature-flagged)
    if (path.startsWith('/admin')) {
        const gated = await checkFeatureEnabled('enable_admin_console', requestOrigin);
        if (gated)
            return gated;
        return adminHandler(normalized.event);
    }
    // Agent portal routes (feature-flagged)
    if (path.startsWith('/portal')) {
        const gated = await checkFeatureEnabled('enable_portal', requestOrigin);
        if (gated)
            return gated;
        return portalHandler(normalized.event);
    }
    // Fallback to lead handler for root path (backwards compatibility)
    if (path === '/' && method === 'POST') {
        return leadHandler(normalized.event, context);
    }
    // Not found
    log.warn('router.notFound', { path, method });
    return notFound(requestOrigin);
}
// Export router as the default handler
export { router as handler };
//# sourceMappingURL=router.js.map