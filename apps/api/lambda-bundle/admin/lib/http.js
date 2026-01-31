/**
 * Admin HTTP Response Helpers
 */
import { HTTP_STATUS, HTTP_HEADERS, CONTENT_TYPES } from '../../lib/constants.js';
import { getCorsOrigin } from '../../lib/response.js';
function buildCorsHeaders(requestOrigin) {
    return {
        [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_ORIGIN]: getCorsOrigin(requestOrigin),
        [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_METHODS]: 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_HEADERS]: 'Content-Type, Authorization, X-CSRF-Token, X-Request-Id',
        [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_CREDENTIALS]: 'true',
        [HTTP_HEADERS.CONTENT_TYPE]: CONTENT_TYPES.JSON,
        ...(requestOrigin ? { [HTTP_HEADERS.VARY]: 'Origin' } : {}),
    };
}
function buildResponse(statusCode, body, requestOrigin) {
    return {
        statusCode,
        headers: buildCorsHeaders(requestOrigin),
        body: JSON.stringify(body),
    };
}
/**
 * 200 OK response
 */
export function ok(data, requestOrigin) {
    return buildResponse(HTTP_STATUS.OK, { success: true, data }, requestOrigin);
}
/**
 * 201 Created response
 */
export function created(data, requestOrigin) {
    return buildResponse(HTTP_STATUS.CREATED, { success: true, data }, requestOrigin);
}
/**
 * 204 No Content response (for OPTIONS)
 */
export function noContent(requestOrigin) {
    return {
        statusCode: HTTP_STATUS.NO_CONTENT,
        headers: buildCorsHeaders(requestOrigin),
        body: '',
    };
}
/**
 * 400 Bad Request response
 */
export function badRequest(message, code, requestOrigin) {
    return buildResponse(HTTP_STATUS.BAD_REQUEST, {
        success: false,
        error: {
            code: code || 'BAD_REQUEST',
            message,
        },
    }, requestOrigin);
}
/**
 * 401 Unauthorized response
 */
export function unauthorized(message, code, requestOrigin) {
    return buildResponse(HTTP_STATUS.UNAUTHORIZED, {
        success: false,
        error: {
            code: code || 'UNAUTHORIZED',
            message,
        },
    }, requestOrigin);
}
/**
 * 403 Forbidden response
 */
export function forbidden(message, code, requestOrigin) {
    return buildResponse(HTTP_STATUS.FORBIDDEN, {
        success: false,
        error: {
            code: code || 'FORBIDDEN',
            message,
        },
    }, requestOrigin);
}
/**
 * 404 Not Found response
 */
export function notFound(message, requestOrigin) {
    return buildResponse(HTTP_STATUS.NOT_FOUND, {
        success: false,
        error: {
            code: 'NOT_FOUND',
            message,
        },
    }, requestOrigin);
}
/**
 * 405 Method Not Allowed response
 */
export function methodNotAllowed(requestOrigin) {
    return buildResponse(HTTP_STATUS.METHOD_NOT_ALLOWED, {
        success: false,
        error: {
            code: 'METHOD_NOT_ALLOWED',
            message: 'Method not allowed',
        },
    }, requestOrigin);
}
/**
 * 500 Internal Server Error response
 */
export function internalError(requestOrigin) {
    return buildResponse(HTTP_STATUS.INTERNAL_ERROR, {
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
        },
    }, requestOrigin);
}
//# sourceMappingURL=http.js.map