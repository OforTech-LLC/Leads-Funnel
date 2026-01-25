/**
 * HTTP response utilities for API Gateway Lambda
 */

import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import type { FieldErrors } from '@kanjona/shared';

// =============================================================================
// CORS Headers
// =============================================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
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
 * Build a JSON response with CORS headers
 */
function buildResponse(
  statusCode: number,
  body: SuccessResponse | ErrorResponse
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

/**
 * 201 Created - Lead successfully created
 */
export function created(leadId: string, status: 'accepted' | 'quarantined'): APIGatewayProxyResultV2 {
  return buildResponse(201, {
    ok: true,
    leadId,
    status,
  });
}

/**
 * 200 OK - For OPTIONS preflight and idempotent duplicate requests
 */
export function ok(leadId: string, status: 'accepted' | 'quarantined'): APIGatewayProxyResultV2 {
  return buildResponse(200, {
    ok: true,
    leadId,
    status,
  });
}

/**
 * 204 No Content - For OPTIONS preflight
 */
export function noContent(): APIGatewayProxyResultV2 {
  return {
    statusCode: 204,
    headers: CORS_HEADERS,
    body: '',
  };
}

/**
 * 400 Bad Request - Validation error
 */
export function validationError(fieldErrors: FieldErrors): APIGatewayProxyResultV2 {
  return buildResponse(400, {
    ok: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request',
      fieldErrors,
    },
  });
}

/**
 * 400 Bad Request - Invalid JSON
 */
export function invalidJson(message: string): APIGatewayProxyResultV2 {
  return buildResponse(400, {
    ok: false,
    error: {
      code: 'INVALID_JSON',
      message,
    },
  });
}

/**
 * 405 Method Not Allowed
 */
export function methodNotAllowed(): APIGatewayProxyResultV2 {
  return buildResponse(405, {
    ok: false,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'Only POST method is allowed',
    },
  });
}

/**
 * 429 Too Many Requests - Rate limited
 */
export function rateLimited(): APIGatewayProxyResultV2 {
  return buildResponse(429, {
    ok: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Try again later.',
    },
  });
}

/**
 * 500 Internal Server Error
 * Never expose stack traces or internal details
 */
export function internalError(): APIGatewayProxyResultV2 {
  return buildResponse(500, {
    ok: false,
    error: {
      code: 'INTERNAL',
      message: 'Something went wrong.',
    },
  });
}
