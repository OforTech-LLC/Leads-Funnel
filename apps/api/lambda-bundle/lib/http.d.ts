/**
 * HTTP response utilities for API Gateway Lambda
 */
import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import type { FieldErrors } from '@kanjona/shared';
import type { CaptureStatus } from './constants.js';
/**
 * 201 Created - Lead successfully created
 */
export declare function created(leadId: string, status: CaptureStatus, requestOrigin?: string): APIGatewayProxyResultV2;
/**
 * 200 OK - For OPTIONS preflight and idempotent duplicate requests
 */
export declare function ok(leadId: string, status: CaptureStatus, requestOrigin?: string): APIGatewayProxyResultV2;
/**
 * 204 No Content - For OPTIONS preflight
 */
export declare function noContent(requestOrigin?: string): APIGatewayProxyResultV2;
/**
 * 400 Bad Request - Validation error
 */
export declare function validationError(fieldErrors: FieldErrors, requestOrigin?: string): APIGatewayProxyResultV2;
/**
 * 400 Bad Request - Invalid JSON
 */
export declare function invalidJson(message: string, requestOrigin?: string): APIGatewayProxyResultV2;
/**
 * 405 Method Not Allowed
 */
export declare function methodNotAllowed(requestOrigin?: string): APIGatewayProxyResultV2;
/**
 * 413 Payload Too Large
 */
export declare function payloadTooLarge(maxSize: number, requestOrigin?: string): APIGatewayProxyResultV2;
/**
 * 429 Too Many Requests - Rate limited
 */
export declare function rateLimited(requestOrigin?: string): APIGatewayProxyResultV2;
/**
 * 500 Internal Server Error
 * Never expose stack traces or internal details
 */
export declare function internalError(requestOrigin?: string): APIGatewayProxyResultV2;
