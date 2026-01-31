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
import { type FeatureFlags } from './config.js';
export declare function getCorsOrigin(requestOrigin?: string): string;
export declare function success<T>(data: T, statusCode?: number, requestOrigin?: string, requestId?: string): APIGatewayProxyResultV2;
export declare function created<T>(data: T, requestOrigin?: string, requestId?: string): APIGatewayProxyResultV2;
export declare function noContent(requestOrigin?: string, requestId?: string): APIGatewayProxyResultV2;
export interface PaginationMeta {
    nextCursor?: string;
    hasMore: boolean;
}
export declare function paginated<T>(items: T[], pagination: PaginationMeta, requestOrigin?: string, requestId?: string): APIGatewayProxyResultV2;
export declare function error(code: string, message: string, statusCode: number, details?: Record<string, unknown>, requestOrigin?: string, requestId?: string): APIGatewayProxyResultV2;
export declare function badRequest(message: string, detailsOrOrigin?: Record<string, unknown> | string, requestOriginOrId?: string, requestIdMaybe?: string): APIGatewayProxyResultV2;
export declare function unauthorized(message?: string, requestOriginOrId?: string, requestIdMaybe?: string): APIGatewayProxyResultV2;
export declare function forbidden(message?: string, requestOriginOrId?: string, requestIdMaybe?: string): APIGatewayProxyResultV2;
export declare function notFound(message?: string, requestOriginOrId?: string, requestIdMaybe?: string): APIGatewayProxyResultV2;
export declare function conflict(message: string, requestOriginOrId?: string, requestIdMaybe?: string): APIGatewayProxyResultV2;
export declare function payloadTooLarge(requestOriginOrId?: string, requestIdMaybe?: string): APIGatewayProxyResultV2;
export declare function rateLimited(retryAfter?: number, requestOriginOrId?: string, requestIdMaybe?: string): APIGatewayProxyResultV2;
export declare function internalError(requestOriginOrId?: string, requestIdMaybe?: string): APIGatewayProxyResultV2;
/**
 * Returns a 404 response if the feature flag is disabled,
 * or null if the feature is enabled (caller proceeds).
 */
export declare function checkFeatureEnabled(flag: keyof FeatureFlags, requestOriginOrId?: string, requestIdMaybe?: string): Promise<APIGatewayProxyResultV2 | null>;
