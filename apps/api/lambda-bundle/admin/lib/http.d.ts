/**
 * Admin HTTP Response Helpers
 */
import type { APIGatewayProxyResultV2 } from 'aws-lambda';
/**
 * 200 OK response
 */
export declare function ok<T>(data: T, requestOrigin?: string): APIGatewayProxyResultV2;
/**
 * 201 Created response
 */
export declare function created<T>(data: T, requestOrigin?: string): APIGatewayProxyResultV2;
/**
 * 204 No Content response (for OPTIONS)
 */
export declare function noContent(requestOrigin?: string): APIGatewayProxyResultV2;
/**
 * 400 Bad Request response
 */
export declare function badRequest(message: string, code?: string, requestOrigin?: string): APIGatewayProxyResultV2;
/**
 * 401 Unauthorized response
 */
export declare function unauthorized(message: string, code?: string, requestOrigin?: string): APIGatewayProxyResultV2;
/**
 * 403 Forbidden response
 */
export declare function forbidden(message: string, code?: string, requestOrigin?: string): APIGatewayProxyResultV2;
/**
 * 404 Not Found response
 */
export declare function notFound(message: string, requestOrigin?: string): APIGatewayProxyResultV2;
/**
 * 405 Method Not Allowed response
 */
export declare function methodNotAllowed(requestOrigin?: string): APIGatewayProxyResultV2;
/**
 * 500 Internal Server Error response
 */
export declare function internalError(requestOrigin?: string): APIGatewayProxyResultV2;
