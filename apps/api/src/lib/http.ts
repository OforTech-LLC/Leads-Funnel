/**
 * HTTP response utilities for API Gateway Lambda
 */

import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import type { FieldErrors } from '@kanjona/shared';
import { HTTP_STATUS, HTTP_HEADERS, CONTENT_TYPES } from './constants.js';
import { BASE_SECURITY_HEADERS } from './security-headers.js';
import type { CaptureStatus } from './constants.js';

// =============================================================================
// Security Headers
// =============================================================================

/** Security headers to include in all responses */
const SECURITY_HEADERS = {
  ...BASE_SECURITY_HEADERS,
  [HTTP_HEADERS.X_XSS_PROTECTION]: '1; mode=block',
  [HTTP_HEADERS.PRAGMA]: 'no-cache',
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
      [HTTP_HEADERS.CONTENT_TYPE]: CONTENT_TYPES.JSON,
    };
  }

  return {
    ...SECURITY_HEADERS,
    [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_ORIGIN]: allowedOrigin,
    [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_HEADERS]: 'content-type,authorization,x-csrf-token',
    [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_METHODS]: 'POST,OPTIONS',
    [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_CREDENTIALS]: 'true',
    [HTTP_HEADERS.CONTENT_TYPE]: CONTENT_TYPES.JSON,
    // Prevent caching of CORS responses
    [HTTP_HEADERS.VARY]: 'Origin',
  };
}

// Default headers for responses without origin context
const DEFAULT_CORS_HEADERS = {
  ...SECURITY_HEADERS,
  [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_HEADERS]: 'content-type,authorization,x-csrf-token',
  [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_METHODS]: 'POST,OPTIONS',
  [HTTP_HEADERS.CONTENT_TYPE]: CONTENT_TYPES.JSON,
} as const;

// =============================================================================
// Response Types
// =============================================================================

interface SuccessResponse {
  // New canonical shape (matches shared LeadSubmitResponse)
  success: true;
  data: {
    id: string;
    status: CaptureStatus;
  };
  // Backward compatibility for older clients
  ok: true;
  leadId: string;
  status: CaptureStatus;
}

interface ErrorResponse {
  // New canonical shape (matches shared ApiError)
  success: false;
  error: {
    code: string;
    message: string;
    fieldErrors?: FieldErrors;
  };
  // Backward compatibility
  ok: false;
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
  status: CaptureStatus,
  requestOrigin?: string
): APIGatewayProxyResultV2 {
  return buildResponse(
    HTTP_STATUS.CREATED,
    {
      success: true,
      data: {
        id: leadId,
        status,
      },
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
  status: CaptureStatus,
  requestOrigin?: string
): APIGatewayProxyResultV2 {
  return buildResponse(
    HTTP_STATUS.OK,
    {
      success: true,
      data: {
        id: leadId,
        status,
      },
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
    statusCode: HTTP_STATUS.NO_CONTENT,
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
    HTTP_STATUS.BAD_REQUEST,
    {
      success: false,
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
    HTTP_STATUS.BAD_REQUEST,
    {
      success: false,
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
    HTTP_STATUS.METHOD_NOT_ALLOWED,
    {
      success: false,
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
    HTTP_STATUS.PAYLOAD_TOO_LARGE,
    {
      success: false,
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
    HTTP_STATUS.RATE_LIMITED,
    {
      success: false,
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
    HTTP_STATUS.INTERNAL_ERROR,
    {
      success: false,
      ok: false,
      error: {
        code: 'INTERNAL',
        message: 'Something went wrong.',
      },
    },
    requestOrigin
  );
}
