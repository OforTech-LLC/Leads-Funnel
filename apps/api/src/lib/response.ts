/**
 * Unified HTTP response helpers for the platform API.
 *
 * Consistent response shape:
 *   { ok: true,  data: ..., pagination?: ... }
 *   { ok: false, error: { code, message, details? } }
 *
 * Performance headers:
 *   - X-Request-Id:          Correlation ID for distributed tracing
 *   - Cache-Control:         Prevents caching of API responses (security)
 *   - X-Content-Type-Options: nosniff (security)
 *   - X-Frame-Options:       DENY (security)
 *
 * All response helpers accept an optional `requestId` parameter.
 * When provided, it is included as an X-Request-Id header for end-to-end
 * tracing through CloudFront -> API Gateway -> Lambda -> DynamoDB.
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

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

/**
 * Determine the CORS origin to return based on an origin allowlist.
 *
 * - If ALLOWED_ORIGINS is configured, only allows listed origins.
 * - In production, falls back to a safe default when ALLOWED_ORIGINS is empty.
 * - In non-production, falls back to '*' for development convenience.
 */
export function getCorsOrigin(requestOrigin?: string): string {
  if (ALLOWED_ORIGINS.length === 0) {
    // Fix 6: Fail closed in production when no origins are configured
    const nodeEnv = process.env.NODE_ENV || '';
    if (nodeEnv === 'production') {
      return 'https://kanjona.com'; // safe default
    }
    return '*'; // fallback for dev
  }
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) return requestOrigin;
  return ALLOWED_ORIGINS[0];
}

function buildCorsHeaders(requestOrigin?: string): Record<string, string> {
  return {
    ...SECURITY_HEADERS,
    'Access-Control-Allow-Origin': getCorsOrigin(requestOrigin),
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type,authorization',
    'Content-Type': 'application/json',
    ...(ALLOWED_ORIGINS.length > 0 ? { Vary: 'Origin' } : {}),
  };
}

// Default headers for responses without a known request origin
const DEFAULT_CORS_HEADERS = buildCorsHeaders();

// ---------------------------------------------------------------------------
// Request ID injection
// ---------------------------------------------------------------------------

/**
 * Build the final headers map, injecting X-Request-Id when provided.
 */
function withRequestId(base: Record<string, string>, requestId?: string): Record<string, string> {
  if (!requestId) return base;
  return { ...base, 'X-Request-Id': requestId };
}

// ---------------------------------------------------------------------------
// Success responses
// ---------------------------------------------------------------------------

export function success<T>(
  data: T,
  statusCode = 200,
  requestOrigin?: string,
  requestId?: string
): APIGatewayProxyResultV2 {
  const headers = requestOrigin ? buildCorsHeaders(requestOrigin) : DEFAULT_CORS_HEADERS;
  return {
    statusCode,
    headers: withRequestId(headers, requestId),
    body: JSON.stringify({ ok: true, data }),
  };
}

export function created<T>(
  data: T,
  requestOrigin?: string,
  requestId?: string
): APIGatewayProxyResultV2 {
  return success(data, 201, requestOrigin, requestId);
}

export function noContent(requestOrigin?: string, requestId?: string): APIGatewayProxyResultV2 {
  const headers = requestOrigin ? buildCorsHeaders(requestOrigin) : DEFAULT_CORS_HEADERS;
  return {
    statusCode: 204,
    headers: withRequestId(headers, requestId),
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

export function paginated<T>(
  items: T[],
  pagination: PaginationMeta,
  requestOrigin?: string,
  requestId?: string
): APIGatewayProxyResultV2 {
  const headers = requestOrigin ? buildCorsHeaders(requestOrigin) : DEFAULT_CORS_HEADERS;
  return {
    statusCode: 200,
    headers: withRequestId(headers, requestId),
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
  details?: Record<string, unknown>,
  requestOrigin?: string,
  requestId?: string
): APIGatewayProxyResultV2 {
  const headers = requestOrigin ? buildCorsHeaders(requestOrigin) : DEFAULT_CORS_HEADERS;
  return {
    statusCode,
    headers: withRequestId(headers, requestId),
    body: JSON.stringify({
      ok: false,
      error: { code, message, ...(details ? { details } : {}) },
    }),
  };
}

export function badRequest(
  message: string,
  details?: Record<string, unknown>,
  requestId?: string
): APIGatewayProxyResultV2 {
  return error('BAD_REQUEST', message, 400, details, undefined, requestId);
}

export function unauthorized(
  message = 'Authentication required',
  requestId?: string
): APIGatewayProxyResultV2 {
  return error('UNAUTHORIZED', message, 401, undefined, undefined, requestId);
}

export function forbidden(
  message = 'Insufficient permissions',
  requestId?: string
): APIGatewayProxyResultV2 {
  return error('FORBIDDEN', message, 403, undefined, undefined, requestId);
}

export function notFound(
  message = 'Resource not found',
  requestId?: string
): APIGatewayProxyResultV2 {
  return error('NOT_FOUND', message, 404, undefined, undefined, requestId);
}

export function conflict(message: string, requestId?: string): APIGatewayProxyResultV2 {
  return error('CONFLICT', message, 409, undefined, undefined, requestId);
}

export function rateLimited(retryAfter = 60, requestId?: string): APIGatewayProxyResultV2 {
  return {
    statusCode: 429,
    headers: withRequestId(
      {
        ...DEFAULT_CORS_HEADERS,
        'Retry-After': String(retryAfter),
      },
      requestId
    ),
    body: JSON.stringify({
      ok: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
    }),
  };
}

export function internalError(requestId?: string): APIGatewayProxyResultV2 {
  return error(
    'INTERNAL_ERROR',
    'An unexpected error occurred',
    500,
    undefined,
    undefined,
    requestId
  );
}

// ---------------------------------------------------------------------------
// Feature flag gate
// ---------------------------------------------------------------------------

/**
 * Returns a 404 response if the feature flag is disabled,
 * or null if the feature is enabled (caller proceeds).
 */
export async function checkFeatureEnabled(
  flag: keyof FeatureFlags,
  requestId?: string
): Promise<APIGatewayProxyResultV2 | null> {
  const enabled = await isFeatureEnabled(flag);
  if (!enabled) {
    return notFound('Endpoint not found', requestId);
  }
  return null;
}
