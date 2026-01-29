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
 *   - Content-Security-Policy: default-src 'none'; frame-ancestors 'none' (security)
 *
 * All response helpers accept an optional `requestId` parameter.
 * When provided, it is included as an X-Request-Id header for end-to-end
 * tracing through CloudFront -> API Gateway -> Lambda -> DynamoDB.
 */

import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { isFeatureEnabled, type FeatureFlags } from './config.js';
import { HTTP_STATUS, HTTP_HEADERS } from './constants.js';
import { buildCorsHeaders } from './cors.js';
import { BASE_SECURITY_HEADERS } from './security-headers.js';

// ---------------------------------------------------------------------------
// CORS + Security headers
// ---------------------------------------------------------------------------

const SECURITY_HEADERS = {
  ...BASE_SECURITY_HEADERS,
  [HTTP_HEADERS.CONTENT_SECURITY_POLICY]: "default-src 'none'; frame-ancestors 'none'",
} as const;

function resolveCorsHeaders(requestOrigin?: string): Record<string, string> {
  return buildCorsHeaders(requestOrigin, {
    allowFallbackOrigin: true,
    extraHeaders: SECURITY_HEADERS,
  });
}

const DEFAULT_CORS_HEADERS = resolveCorsHeaders();

export function getCorsOrigin(requestOrigin?: string): string {
  const headers = resolveCorsHeaders(requestOrigin);
  return headers[HTTP_HEADERS.ACCESS_CONTROL_ALLOW_ORIGIN] || '';
}

// ---------------------------------------------------------------------------
// Request ID injection
// ---------------------------------------------------------------------------

/**
 * Build the final headers map, injecting X-Request-Id when provided.
 */
function withRequestId(base: Record<string, string>, requestId?: string): Record<string, string> {
  if (!requestId) return base;
  return { ...base, [HTTP_HEADERS.X_REQUEST_ID]: requestId };
}

// ---------------------------------------------------------------------------
// Request context helpers
// ---------------------------------------------------------------------------

function resolveContext(
  requestOriginOrId?: string,
  requestIdMaybe?: string
): { requestOrigin?: string; requestId?: string } {
  if (requestIdMaybe !== undefined) {
    return { requestOrigin: requestOriginOrId, requestId: requestIdMaybe };
  }
  if (requestOriginOrId && requestOriginOrId.startsWith('http')) {
    return { requestOrigin: requestOriginOrId };
  }
  return { requestId: requestOriginOrId };
}

function resolveDetailsAndContext(
  detailsOrOrigin?: Record<string, unknown> | string,
  requestOriginOrId?: string,
  requestIdMaybe?: string
): { details?: Record<string, unknown>; requestOrigin?: string; requestId?: string } {
  if (typeof detailsOrOrigin === 'string') {
    const { requestOrigin, requestId } = resolveContext(detailsOrOrigin, requestOriginOrId);
    return { requestOrigin, requestId };
  }

  const { requestOrigin, requestId } = resolveContext(requestOriginOrId, requestIdMaybe);
  return { details: detailsOrOrigin, requestOrigin, requestId };
}

// ---------------------------------------------------------------------------
// Success responses
// ---------------------------------------------------------------------------

export function success<T>(
  data: T,
  statusCode: number = HTTP_STATUS.OK,
  requestOrigin?: string,
  requestId?: string
): APIGatewayProxyResultV2 {
  const headers = requestOrigin ? resolveCorsHeaders(requestOrigin) : DEFAULT_CORS_HEADERS;
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
  return success(data, HTTP_STATUS.CREATED, requestOrigin, requestId);
}

export function noContent(requestOrigin?: string, requestId?: string): APIGatewayProxyResultV2 {
  const headers = requestOrigin ? resolveCorsHeaders(requestOrigin) : DEFAULT_CORS_HEADERS;
  return {
    statusCode: HTTP_STATUS.NO_CONTENT,
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
  const headers = requestOrigin ? resolveCorsHeaders(requestOrigin) : DEFAULT_CORS_HEADERS;
  return {
    statusCode: HTTP_STATUS.OK,
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
  const headers = requestOrigin ? resolveCorsHeaders(requestOrigin) : DEFAULT_CORS_HEADERS;
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
  detailsOrOrigin?: Record<string, unknown> | string,
  requestOriginOrId?: string,
  requestIdMaybe?: string
): APIGatewayProxyResultV2 {
  const { details, requestOrigin, requestId } = resolveDetailsAndContext(
    detailsOrOrigin,
    requestOriginOrId,
    requestIdMaybe
  );
  return error('BAD_REQUEST', message, HTTP_STATUS.BAD_REQUEST, details, requestOrigin, requestId);
}

export function unauthorized(
  message = 'Authentication required',
  requestOriginOrId?: string,
  requestIdMaybe?: string
): APIGatewayProxyResultV2 {
  const { requestOrigin, requestId } = resolveContext(requestOriginOrId, requestIdMaybe);
  return error(
    'UNAUTHORIZED',
    message,
    HTTP_STATUS.UNAUTHORIZED,
    undefined,
    requestOrigin,
    requestId
  );
}

export function forbidden(
  message = 'Insufficient permissions',
  requestOriginOrId?: string,
  requestIdMaybe?: string
): APIGatewayProxyResultV2 {
  const { requestOrigin, requestId } = resolveContext(requestOriginOrId, requestIdMaybe);
  return error('FORBIDDEN', message, HTTP_STATUS.FORBIDDEN, undefined, requestOrigin, requestId);
}

export function notFound(
  message = 'Resource not found',
  requestOriginOrId?: string,
  requestIdMaybe?: string
): APIGatewayProxyResultV2 {
  const { requestOrigin, requestId } = resolveContext(requestOriginOrId, requestIdMaybe);
  return error('NOT_FOUND', message, HTTP_STATUS.NOT_FOUND, undefined, requestOrigin, requestId);
}

export function conflict(
  message: string,
  requestOriginOrId?: string,
  requestIdMaybe?: string
): APIGatewayProxyResultV2 {
  const { requestOrigin, requestId } = resolveContext(requestOriginOrId, requestIdMaybe);
  return error('CONFLICT', message, HTTP_STATUS.CONFLICT, undefined, requestOrigin, requestId);
}

export function payloadTooLarge(
  requestOriginOrId?: string,
  requestIdMaybe?: string
): APIGatewayProxyResultV2 {
  const { requestOrigin, requestId } = resolveContext(requestOriginOrId, requestIdMaybe);
  return error(
    'PAYLOAD_TOO_LARGE',
    'Request body exceeds the maximum allowed size',
    HTTP_STATUS.PAYLOAD_TOO_LARGE,
    undefined,
    requestOrigin,
    requestId
  );
}

export function rateLimited(
  retryAfter = 60,
  requestOriginOrId?: string,
  requestIdMaybe?: string
): APIGatewayProxyResultV2 {
  const { requestOrigin, requestId } = resolveContext(requestOriginOrId, requestIdMaybe);
  const headers = requestOrigin ? resolveCorsHeaders(requestOrigin) : DEFAULT_CORS_HEADERS;
  return {
    statusCode: HTTP_STATUS.RATE_LIMITED,
    headers: withRequestId(
      {
        ...headers,
        [HTTP_HEADERS.RETRY_AFTER]: String(retryAfter),
      },
      requestId
    ),
    body: JSON.stringify({
      ok: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
    }),
  };
}

export function internalError(
  requestOriginOrId?: string,
  requestIdMaybe?: string
): APIGatewayProxyResultV2 {
  const { requestOrigin, requestId } = resolveContext(requestOriginOrId, requestIdMaybe);
  return error(
    'INTERNAL_ERROR',
    'An unexpected error occurred',
    HTTP_STATUS.INTERNAL_ERROR,
    undefined,
    requestOrigin,
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
  requestOriginOrId?: string,
  requestIdMaybe?: string
): Promise<APIGatewayProxyResultV2 | null> {
  const enabled = await isFeatureEnabled(flag);
  if (!enabled) {
    return notFound('Endpoint not found', requestOriginOrId, requestIdMaybe);
  }
  return null;
}
