/**
 * Admin HTTP Response Helpers
 */

import type { APIGatewayProxyResultV2 } from 'aws-lambda';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

/**
 * 200 OK response
 */
export function ok<T>(data: T): APIGatewayProxyResultV2 {
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: true, data }),
  };
}

/**
 * 201 Created response
 */
export function created<T>(data: T): APIGatewayProxyResultV2 {
  return {
    statusCode: 201,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: true, data }),
  };
}

/**
 * 204 No Content response (for OPTIONS)
 */
export function noContent(): APIGatewayProxyResultV2 {
  return {
    statusCode: 204,
    headers: CORS_HEADERS,
    body: '',
  };
}

/**
 * 400 Bad Request response
 */
export function badRequest(message: string, code?: string): APIGatewayProxyResultV2 {
  return {
    statusCode: 400,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: false,
      error: {
        code: code || 'BAD_REQUEST',
        message,
      },
    }),
  };
}

/**
 * 401 Unauthorized response
 */
export function unauthorized(message: string, code?: string): APIGatewayProxyResultV2 {
  return {
    statusCode: 401,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: false,
      error: {
        code: code || 'UNAUTHORIZED',
        message,
      },
    }),
  };
}

/**
 * 403 Forbidden response
 */
export function forbidden(message: string, code?: string): APIGatewayProxyResultV2 {
  return {
    statusCode: 403,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: false,
      error: {
        code: code || 'FORBIDDEN',
        message,
      },
    }),
  };
}

/**
 * 404 Not Found response
 */
export function notFound(message: string): APIGatewayProxyResultV2 {
  return {
    statusCode: 404,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message,
      },
    }),
  };
}

/**
 * 405 Method Not Allowed response
 */
export function methodNotAllowed(): APIGatewayProxyResultV2 {
  return {
    statusCode: 405,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed',
      },
    }),
  };
}

/**
 * 500 Internal Server Error response
 */
export function internalError(): APIGatewayProxyResultV2 {
  return {
    statusCode: 500,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    }),
  };
}
