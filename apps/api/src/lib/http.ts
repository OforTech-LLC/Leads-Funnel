/**
 * HTTP response utilities for API Gateway Lambda
 */

import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import type { FieldErrors } from '@kanjona/shared';

// =============================================================================
// Security Headers
// =============================================================================

/** Security headers to include in all responses */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  Pragma: 'no-cache',
} as const;

// =============================================================================
// CORS Configuration with Origin Allowlist
// =============================================================================

// Load allowed origins from environment variable (comma-separated)
// Example: ALLOWED_ORIGINS=https://example.com,https://www.example.com
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [];

// Default origins for development (only used if ALLOWED_ORIGINS is empty)
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
];

/**
 * Get the allowed origin for CORS headers
 * Returns the origin if it's in the allowlist, or null if not allowed
 */
function getAllowedOrigin(requestOrigin: string | undefined): string | null {
  if (!requestOrigin) {
    return null;
  }

  // Use configured origins if available, otherwise use dev defaults in development
  const allowedList =
    ALLOWED_ORIGINS.length > 0
      ? ALLOWED_ORIGINS
      : process.env.NODE_ENV !== 'production'
        ? DEFAULT_DEV_ORIGINS
        : [];

  // Check if the request origin is in the allowlist
  if (allowedList.includes(requestOrigin)) {
    return requestOrigin;
  }

  return null;
}

/**
 * Build CORS headers with origin validation
 */
function buildCorsHeaders(requestOrigin?: string): Record<string, string> {
  const allowedOrigin = getAllowedOrigin(requestOrigin);

  // If origin is not allowed, don't include CORS headers
  // This will cause the browser to block the response
  if (!allowedOrigin) {
    return {
      ...SECURITY_HEADERS,
      'Content-Type': 'application/json',
    };
  }

  return {
    ...SECURITY_HEADERS,
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'content-type,authorization,x-csrf-token',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
    // Prevent caching of CORS responses
    Vary: 'Origin',
  };
}

// Default headers for responses without origin context
const DEFAULT_CORS_HEADERS = {
  ...SECURITY_HEADERS,
  'Access-Control-Allow-Headers': 'content-type,authorization,x-csrf-token',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json',
} as const;

// =============================================================================
// Response Types
// =============================================================================

interface SuccessResponse {
  ok: true;
  leadId: string;
  status: 'accepted' | 'quarantined';
}

interface ErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    fieldErrors?: FieldErrors;
  };
}

// =============================================================================
// Response Builders
// =============================================================================

/**
 * Build a JSON response with CORS and security headers
 */
function buildResponse(
  statusCode: number,
  body: SuccessResponse | ErrorResponse,
  requestOrigin?: string
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: requestOrigin ? buildCorsHeaders(requestOrigin) : DEFAULT_CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

/**
 * 201 Created - Lead successfully created
 */
export function created(
  leadId: string,
  status: 'accepted' | 'quarantined',
  requestOrigin?: string
): APIGatewayProxyResultV2 {
  return buildResponse(
    201,
    {
      ok: true,
      leadId,
      status,
    },
    requestOrigin
  );
}

/**
 * 200 OK - For OPTIONS preflight and idempotent duplicate requests
 */
export function ok(
  leadId: string,
  status: 'accepted' | 'quarantined',
  requestOrigin?: string
): APIGatewayProxyResultV2 {
  return buildResponse(
    200,
    {
      ok: true,
      leadId,
      status,
    },
    requestOrigin
  );
}

/**
 * 204 No Content - For OPTIONS preflight
 */
export function noContent(requestOrigin?: string): APIGatewayProxyResultV2 {
  return {
    statusCode: 204,
    headers: requestOrigin ? buildCorsHeaders(requestOrigin) : DEFAULT_CORS_HEADERS,
    body: '',
  };
}

/**
 * 400 Bad Request - Validation error
 */
export function validationError(
  fieldErrors: FieldErrors,
  requestOrigin?: string
): APIGatewayProxyResultV2 {
  return buildResponse(
    400,
    {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        fieldErrors,
      },
    },
    requestOrigin
  );
}

/**
 * 400 Bad Request - Invalid JSON
 */
export function invalidJson(message: string, requestOrigin?: string): APIGatewayProxyResultV2 {
  return buildResponse(
    400,
    {
      ok: false,
      error: {
        code: 'INVALID_JSON',
        message,
      },
    },
    requestOrigin
  );
}

/**
 * 405 Method Not Allowed
 */
export function methodNotAllowed(requestOrigin?: string): APIGatewayProxyResultV2 {
  return buildResponse(
    405,
    {
      ok: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST method is allowed',
      },
    },
    requestOrigin
  );
}

/**
 * 413 Payload Too Large
 */
export function payloadTooLarge(maxSize: number, requestOrigin?: string): APIGatewayProxyResultV2 {
  return buildResponse(
    413,
    {
      ok: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: `Request body exceeds maximum size of ${Math.round(maxSize / 1024)}KB`,
      },
    },
    requestOrigin
  );
}

/**
 * 429 Too Many Requests - Rate limited
 */
export function rateLimited(requestOrigin?: string): APIGatewayProxyResultV2 {
  return buildResponse(
    429,
    {
      ok: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Try again later.',
      },
    },
    requestOrigin
  );
}

/**
 * 500 Internal Server Error
 * Never expose stack traces or internal details
 */
export function internalError(requestOrigin?: string): APIGatewayProxyResultV2 {
  return buildResponse(
    500,
    {
      ok: false,
      error: {
        code: 'INTERNAL',
        message: 'Something went wrong.',
      },
    },
    requestOrigin
  );
}
