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

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { handler as leadHandler } from './handler.js';
import { handler as healthHandler } from './health/handler.js';
import { handler as adminHandler } from './handlers/admin.js';
import { handler as portalHandler } from './handlers/portal.js';
import { handler as authHandler } from './handlers/auth.js';
import { checkFeatureEnabled, getCorsOrigin } from './lib/response.js';
import { createLogger } from './lib/logging.js';
import { HTTP_STATUS, HTTP_HEADERS, CONTENT_TYPES } from './lib/constants.js';

const log = createLogger('router');

// =============================================================================
// Response Builders
// =============================================================================

function buildCorsHeaders(requestOrigin?: string): Record<string, string> {
  return {
    [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_ORIGIN]: getCorsOrigin(requestOrigin),
    [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_HEADERS]: 'content-type,authorization',
    [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_METHODS]: 'GET,POST,PUT,DELETE,OPTIONS',
    [HTTP_HEADERS.CONTENT_TYPE]: CONTENT_TYPES.JSON,
  };
}

function notFound(requestOrigin?: string): APIGatewayProxyResultV2 {
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

function preflight(requestOrigin?: string): APIGatewayProxyResultV2 {
  return {
    statusCode: HTTP_STATUS.NO_CONTENT,
    headers: buildCorsHeaders(requestOrigin),
    body: '',
  };
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
export async function router(
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResultV2> {
  const path = event.requestContext.http.path;
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
    return healthHandler(event, context);
  }

  if (path === '/lead' || path.startsWith('/lead/')) {
    return leadHandler(event, context);
  }

  // Auth routes (for admin and portal OAuth token management)
  if (path.startsWith('/auth/')) {
    return authHandler(event);
  }

  // Admin console routes (feature-flagged)
  if (path.startsWith('/admin')) {
    const gated = await checkFeatureEnabled('enable_admin_console');
    if (gated) return gated;
    return adminHandler(event);
  }

  // Agent portal routes (feature-flagged)
  if (path.startsWith('/portal')) {
    const gated = await checkFeatureEnabled('enable_agent_portal');
    if (gated) return gated;
    return portalHandler(event);
  }

  // Fallback to lead handler for root path (backwards compatibility)
  if (path === '/' && method === 'POST') {
    return leadHandler(event, context);
  }

  // Not found
  log.warn('router.notFound', { path, method });
  return notFound(requestOrigin);
}

// Export router as the default handler
export { router as handler };
