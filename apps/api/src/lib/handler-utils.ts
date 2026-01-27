/**
 * Shared Handler Utilities
 *
 * Common request-parsing helpers used by both the admin and portal API
 * handlers.  Extracted here to eliminate duplication.
 *
 * Usage:
 *   import { parseBody, pathParam, queryParam, getIpHash } from '../lib/handler-utils.js';
 */

import type { APIGatewayProxyEventV2 } from 'aws-lambda';
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
export function parseBody(event: APIGatewayProxyEventV2): Record<string, unknown> | null {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
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
export function pathParam(event: APIGatewayProxyEventV2, position: number): string {
  const parts = (event.requestContext.http.path || '').split('/').filter(Boolean);
  return parts[position] || '';
}

/**
 * Shorthand to read a single query-string parameter.
 */
export function queryParam(event: APIGatewayProxyEventV2, key: string): string | undefined {
  return event.queryStringParameters?.[key];
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginationInput {
  cursor?: string;
  limit: number;
}

/**
 * Parse standard pagination query parameters.
 *
 * @param event       API Gateway event
 * @param defaultLimit Default page size when the caller does not provide one
 * @param maxLimit     Upper cap for the page size
 */
export function parsePagination(
  event: APIGatewayProxyEventV2,
  defaultLimit = 25,
  maxLimit = 100
): PaginationInput {
  const rawLimit = Number(queryParam(event, 'limit'));
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, maxLimit) : defaultLimit;
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
export function getIpHash(event: APIGatewayProxyEventV2): string {
  const ip = event.requestContext?.http?.sourceIp || '';
  return sha256(ip);
}
