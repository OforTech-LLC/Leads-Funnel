/**
 * Admin HTTP Response Helpers
 */

import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { HTTP_STATUS, HTTP_HEADERS, CONTENT_TYPES } from '../../lib/constants.js';

const CORS_HEADERS = {
  [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_ORIGIN]: '*',
  [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_METHODS]: 'GET, POST, OPTIONS',
  [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_HEADERS]: 'Content-Type, Authorization',
  [HTTP_HEADERS.CONTENT_TYPE]: CONTENT_TYPES.JSON,
};

/**
 * 200 OK response
 */
export function ok<T>(data: T): APIGatewayProxyResultV2 {
  return {
    statusCode: HTTP_STATUS.OK,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: true, data }),
  };
}

/**
 * 201 Created response
 */
export function created<T>(data: T): APIGatewayProxyResultV2 {
  return {
    statusCode: HTTP_STATUS.CREATED,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: true, data }),
  };
}

/**
 * 204 No Content response (for OPTIONS)
 */
export function noContent(): APIGatewayProxyResultV2 {
  return {
    statusCode: HTTP_STATUS.NO_CONTENT,
    headers: CORS_HEADERS,
    body: '',
  };
}

/**
 * 400 Bad Request response
 */
export function badRequest(message: string, code?: string): APIGatewayProxyResultV2 {
  return {
    statusCode: HTTP_STATUS.BAD_REQUEST,
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
    statusCode: HTTP_STATUS.UNAUTHORIZED,
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
    statusCode: HTTP_STATUS.FORBIDDEN,
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
    statusCode: HTTP_STATUS.NOT_FOUND,
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
    statusCode: HTTP_STATUS.METHOD_NOT_ALLOWED,
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
    statusCode: HTTP_STATUS.INTERNAL_ERROR,
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
