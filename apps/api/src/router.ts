/**
 * API Router
 *
 * Routes incoming requests to appropriate handlers based on path.
 * Provides a unified entry point for all API endpoints.
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { handler as leadHandler } from './handler.js';
import { handler as healthHandler } from './health/handler.js';

// =============================================================================
// CORS Headers
// =============================================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
} as const;

// =============================================================================
// Response Builders
// =============================================================================

function notFound(): APIGatewayProxyResultV2 {
  return {
    statusCode: 404,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    }),
  };
}

// =============================================================================
// Router Handler
// =============================================================================

/**
 * Main router that dispatches requests to appropriate handlers
 */
export async function router(
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResultV2> {
  const path = event.requestContext.http.path;
  const method = event.requestContext.http.method;

  console.log(`[Router] ${method} ${path}`);

  // Route based on path
  if (path === '/health' || path.startsWith('/health/')) {
    return healthHandler(event, context);
  }

  if (path === '/lead' || path.startsWith('/lead/')) {
    return leadHandler(event, context);
  }

  // Fallback to lead handler for root path (backwards compatibility)
  if (path === '/' && method === 'POST') {
    return leadHandler(event, context);
  }

  // Not found
  console.warn(`[Router] Unknown path: ${path}`);
  return notFound();
}

// Export router as the default handler
export { router as handler };
