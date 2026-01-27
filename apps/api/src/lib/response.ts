/**
 * Unified HTTP response helpers for the platform API.
 *
 * Consistent response shape:
 *   { ok: true,  data: ..., pagination?: ... }
 *   { ok: false, error: { code, message, details? } }
 */

import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { isFeatureEnabled, type FeatureFlags } from './config.js';

// ---------------------------------------------------------------------------
// CORS + Security headers
// ---------------------------------------------------------------------------

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
} as const;

const CORS_HEADERS = {
  ...SECURITY_HEADERS,
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type,authorization',
  'Content-Type': 'application/json',
} as const;

// ---------------------------------------------------------------------------
// Success responses
// ---------------------------------------------------------------------------

export function success<T>(data: T, statusCode = 200): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({ ok: true, data }),
  };
}

export function created<T>(data: T): APIGatewayProxyResultV2 {
  return success(data, 201);
}

export function noContent(): APIGatewayProxyResultV2 {
  return {
    statusCode: 204,
    headers: CORS_HEADERS,
    body: '',
  };
}

// ---------------------------------------------------------------------------
// Paginated response
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  nextCursor?: string;
  hasMore: boolean;
}

export function paginated<T>(items: T[], pagination: PaginationMeta): APIGatewayProxyResultV2 {
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      ok: true,
      data: items,
      pagination,
    }),
  };
}

// ---------------------------------------------------------------------------
// Error responses
// ---------------------------------------------------------------------------

export function error(
  code: string,
  message: string,
  statusCode: number,
  details?: Record<string, unknown>
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      ok: false,
      error: { code, message, ...(details ? { details } : {}) },
    }),
  };
}

export function badRequest(
  message: string,
  details?: Record<string, unknown>
): APIGatewayProxyResultV2 {
  return error('BAD_REQUEST', message, 400, details);
}

export function unauthorized(message = 'Authentication required'): APIGatewayProxyResultV2 {
  return error('UNAUTHORIZED', message, 401);
}

export function forbidden(message = 'Insufficient permissions'): APIGatewayProxyResultV2 {
  return error('FORBIDDEN', message, 403);
}

export function notFound(message = 'Resource not found'): APIGatewayProxyResultV2 {
  return error('NOT_FOUND', message, 404);
}

export function conflict(message: string): APIGatewayProxyResultV2 {
  return error('CONFLICT', message, 409);
}

export function rateLimited(retryAfter = 60): APIGatewayProxyResultV2 {
  return {
    statusCode: 429,
    headers: {
      ...CORS_HEADERS,
      'Retry-After': String(retryAfter),
    },
    body: JSON.stringify({
      ok: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
    }),
  };
}

export function internalError(): APIGatewayProxyResultV2 {
  return error('INTERNAL_ERROR', 'An unexpected error occurred', 500);
}

// ---------------------------------------------------------------------------
// Feature flag gate
// ---------------------------------------------------------------------------

/**
 * Returns a 404 response if the feature flag is disabled,
 * or null if the feature is enabled (caller proceeds).
 */
export async function checkFeatureEnabled(
  flag: keyof FeatureFlags
): Promise<APIGatewayProxyResultV2 | null> {
  const enabled = await isFeatureEnabled(flag);
  if (!enabled) {
    return notFound('Endpoint not found');
  }
  return null;
}
