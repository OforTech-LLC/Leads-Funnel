/**
 * Typed Error Classes
 *
 * Application-level errors that map cleanly to HTTP status codes and the
 * standard `{ ok: false, error: { code, message, details? } }` response
 * shape returned by lib/response.ts.
 *
 * Usage:
 *   import { ValidationError, NotFoundError } from '../lib/errors.js';
 *   throw new ValidationError('email is required');
 *
 * Handler catch blocks can use `toHttpError()` or check `instanceof` to
 * determine the response status code.
 */
import type { APIGatewayProxyResultV2 } from 'aws-lambda';
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly details?: Record<string, unknown>;
    constructor(code: string, message: string, statusCode: number, details?: Record<string, unknown>);
    /** Convert to a Lambda-compatible API Gateway response. */
    toResponse(): APIGatewayProxyResultV2;
}
/** 400 - Bad or missing input */
export declare class ValidationError extends AppError {
    constructor(message: string, details?: Record<string, unknown>);
}
/** 401 - Authentication required or failed */
export declare class AuthError extends AppError {
    constructor(message?: string);
}
/** 403 - Authenticated but not authorized */
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
/** 404 - Resource does not exist */
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
/** 409 - Conflict (e.g. conditional write failure) */
export declare class ConflictError extends AppError {
    constructor(message?: string);
}
/** 429 - Rate limited */
export declare class RateLimitError extends AppError {
    readonly retryAfter: number;
    constructor(retryAfter?: number);
    toResponse(): APIGatewayProxyResultV2;
}
/** 500 - Internal server error (never expose details) */
export declare class InternalError extends AppError {
    constructor();
}
/**
 * Convert any caught error into an API Gateway response.
 *
 * - AppError subclasses get their natural status code and body.
 * - All other errors return a generic 500 to avoid leaking internals.
 */
export declare function toHttpResponse(err: unknown): APIGatewayProxyResultV2;
