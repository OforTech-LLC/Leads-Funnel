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

// ---------------------------------------------------------------------------
// CORS / Security headers (mirrors lib/response.ts)
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type,authorization',
  'Content-Type': 'application/json',
};

// ---------------------------------------------------------------------------
// Base class
// ---------------------------------------------------------------------------

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  /** Convert to a Lambda-compatible API Gateway response. */
  toResponse(): APIGatewayProxyResultV2 {
    return {
      statusCode: this.statusCode,
      headers: { ...CORS_HEADERS },
      body: JSON.stringify({
        ok: false,
        error: {
          code: this.code,
          message: this.message,
          ...(this.details ? { details: this.details } : {}),
        },
      }),
    };
  }
}

// ---------------------------------------------------------------------------
// Concrete error types
// ---------------------------------------------------------------------------

/** 400 - Bad or missing input */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

/** 401 - Authentication required or failed */
export class AuthError extends AppError {
  constructor(message = 'Authentication required') {
    super('AUTH_ERROR', message, 401);
    this.name = 'AuthError';
  }
}

/** 403 - Authenticated but not authorized */
export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
  }
}

/** 404 - Resource does not exist */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super('NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
  }
}

/** 409 - Conflict (e.g. conditional write failure) */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}

/** 429 - Rate limited */
export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter = 60) {
    super('RATE_LIMITED', 'Too many requests. Try again later.', 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }

  override toResponse(): APIGatewayProxyResultV2 {
    return {
      statusCode: this.statusCode,
      headers: {
        ...CORS_HEADERS,
        'Retry-After': String(this.retryAfter),
      },
      body: JSON.stringify({
        ok: false,
        error: {
          code: this.code,
          message: this.message,
        },
      }),
    };
  }
}

/** 500 - Internal server error (never expose details) */
export class InternalError extends AppError {
  constructor() {
    super('INTERNAL_ERROR', 'An unexpected error occurred', 500);
    this.name = 'InternalError';
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Convert any caught error into an API Gateway response.
 *
 * - AppError subclasses get their natural status code and body.
 * - All other errors return a generic 500 to avoid leaking internals.
 */
export function toHttpResponse(err: unknown): APIGatewayProxyResultV2 {
  if (err instanceof AppError) {
    return err.toResponse();
  }
  return new InternalError().toResponse();
}
