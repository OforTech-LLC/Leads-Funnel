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
/**
 * Safely parse the JSON body of an API Gateway event.
 * Returns an empty object if the body is missing.
 * Returns null if the body is present but malformed JSON,
 * so callers can return a 400 response.
 */
export declare function parseBody(event: APIGatewayProxyEventV2): Record<string, unknown> | null;
/**
 * Extract a positional segment from the request path.
 *
 * Example: for path "/admin/orgs/abc123", `pathParam(event, 2)` returns "abc123".
 *
 * @param event    API Gateway event
 * @param position Zero-based index into the non-empty path segments
 */
export declare function pathParam(event: APIGatewayProxyEventV2, position: number): string;
/**
 * Shorthand to read a single query-string parameter.
 */
export declare function queryParam(event: APIGatewayProxyEventV2, key: string): string | undefined;
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
export declare function parsePagination(event: APIGatewayProxyEventV2, defaultLimit?: number, maxLimit?: number): PaginationInput;
/**
 * SHA-256 hash of the request source IP.
 * Used for audit logging without storing raw IP addresses.
 */
export declare function getIpHash(event: APIGatewayProxyEventV2): string;
/**
 * Read a cookie value from the incoming request headers.
 *
 * @param event API Gateway event
 * @param name  Cookie name to retrieve
 */
export declare function getCookie(event: APIGatewayProxyEventV2, name: string): string | null;
