/**
 * HTTP response utilities for API Gateway Lambda
 */
import { HTTP_STATUS, HTTP_HEADERS } from './constants.js';
import { buildCorsHeaders } from './cors.js';
import { BASE_SECURITY_HEADERS } from './security-headers.js';
// =============================================================================
// Security Headers
// =============================================================================
/** Security headers to include in all responses */
const SECURITY_HEADERS = {
    ...BASE_SECURITY_HEADERS,
    [HTTP_HEADERS.X_XSS_PROTECTION]: '1; mode=block',
    [HTTP_HEADERS.PRAGMA]: 'no-cache',
};
// =============================================================================
// CORS Configuration with Origin Allowlist
// =============================================================================
const DEFAULT_CORS_HEADERS = buildCorsHeaders(undefined, {
    allowMethods: 'POST,OPTIONS',
    allowHeaders: 'content-type,authorization,x-csrf-token',
    extraHeaders: SECURITY_HEADERS,
});
// =============================================================================
// Response Builders
// =============================================================================
/**
 * Build a JSON response with CORS and security headers
 */
function buildResponse(statusCode, body, requestOrigin) {
    return {
        statusCode,
        headers: requestOrigin
            ? buildCorsHeaders(requestOrigin, {
                allowMethods: 'POST,OPTIONS',
                allowHeaders: 'content-type,authorization,x-csrf-token',
                extraHeaders: SECURITY_HEADERS,
            })
            : DEFAULT_CORS_HEADERS,
        body: JSON.stringify(body),
    };
}
/**
 * 201 Created - Lead successfully created
 */
export function created(leadId, status, requestOrigin) {
    return buildResponse(HTTP_STATUS.CREATED, {
        success: true,
        data: {
            id: leadId,
            status,
        },
        ok: true,
        leadId,
        status,
    }, requestOrigin);
}
/**
 * 200 OK - For OPTIONS preflight and idempotent duplicate requests
 */
export function ok(leadId, status, requestOrigin) {
    return buildResponse(HTTP_STATUS.OK, {
        success: true,
        data: {
            id: leadId,
            status,
        },
        ok: true,
        leadId,
        status,
    }, requestOrigin);
}
/**
 * 204 No Content - For OPTIONS preflight
 */
export function noContent(requestOrigin) {
    return {
        statusCode: HTTP_STATUS.NO_CONTENT,
        headers: requestOrigin
            ? buildCorsHeaders(requestOrigin, {
                allowMethods: 'POST,OPTIONS',
                allowHeaders: 'content-type,authorization,x-csrf-token',
                extraHeaders: SECURITY_HEADERS,
            })
            : DEFAULT_CORS_HEADERS,
        body: '',
    };
}
/**
 * 400 Bad Request - Validation error
 */
export function validationError(fieldErrors, requestOrigin) {
    return buildResponse(HTTP_STATUS.BAD_REQUEST, {
        success: false,
        ok: false,
        error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request',
            fieldErrors,
        },
    }, requestOrigin);
}
/**
 * 400 Bad Request - Invalid JSON
 */
export function invalidJson(message, requestOrigin) {
    return buildResponse(HTTP_STATUS.BAD_REQUEST, {
        success: false,
        ok: false,
        error: {
            code: 'INVALID_JSON',
            message,
        },
    }, requestOrigin);
}
/**
 * 405 Method Not Allowed
 */
export function methodNotAllowed(requestOrigin) {
    return buildResponse(HTTP_STATUS.METHOD_NOT_ALLOWED, {
        success: false,
        ok: false,
        error: {
            code: 'METHOD_NOT_ALLOWED',
            message: 'Only POST method is allowed',
        },
    }, requestOrigin);
}
/**
 * 413 Payload Too Large
 */
export function payloadTooLarge(maxSize, requestOrigin) {
    return buildResponse(HTTP_STATUS.PAYLOAD_TOO_LARGE, {
        success: false,
        ok: false,
        error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: `Request body exceeds maximum size of ${Math.round(maxSize / 1024)}KB`,
        },
    }, requestOrigin);
}
/**
 * 429 Too Many Requests - Rate limited
 */
export function rateLimited(requestOrigin) {
    return buildResponse(HTTP_STATUS.RATE_LIMITED, {
        success: false,
        ok: false,
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Try again later.',
        },
    }, requestOrigin);
}
/**
 * 500 Internal Server Error
 * Never expose stack traces or internal details
 */
export function internalError(requestOrigin) {
    return buildResponse(HTTP_STATUS.INTERNAL_ERROR, {
        success: false,
        ok: false,
        error: {
            code: 'INTERNAL',
            message: 'Something went wrong.',
        },
    }, requestOrigin);
}
//# sourceMappingURL=http.js.map