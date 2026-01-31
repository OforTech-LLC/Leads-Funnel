import { CONTENT_TYPES, HTTP_HEADERS } from './constants.js';
import { BASE_SECURITY_HEADERS } from './security-headers.js';
const DEFAULT_DEV_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
];
function readAllowedOrigins() {
    return (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
}
function resolveAllowedOrigins() {
    const configured = readAllowedOrigins();
    if (configured.length > 0)
        return configured;
    if ((process.env.NODE_ENV || '').toLowerCase() !== 'production') {
        return DEFAULT_DEV_ORIGINS;
    }
    return [];
}
function getFallbackOrigin() {
    const allowed = resolveAllowedOrigins();
    if (allowed.length > 0)
        return allowed[0];
    if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
        return process.env.DEFAULT_CORS_ORIGIN?.trim() || 'https://kanjona.com';
    }
    return DEFAULT_DEV_ORIGINS[0] ?? null;
}
export function getCorsOrigin(requestOrigin) {
    if (!requestOrigin)
        return null;
    const allowed = resolveAllowedOrigins();
    if (allowed.includes(requestOrigin))
        return requestOrigin;
    return null;
}
export function buildCorsHeaders(requestOrigin, options = {}) {
    const { allowMethods = 'GET,POST,PUT,DELETE,OPTIONS,PATCH', allowHeaders = 'content-type,authorization,x-csrf-token,x-request-id', allowCredentials = true, allowFallbackOrigin = false, contentType = CONTENT_TYPES.JSON, extraHeaders = {}, } = options;
    const origin = getCorsOrigin(requestOrigin) ?? (allowFallbackOrigin ? getFallbackOrigin() : null);
    const headers = {
        ...BASE_SECURITY_HEADERS,
        ...extraHeaders,
        [HTTP_HEADERS.CONTENT_TYPE]: contentType,
    };
    if (!origin) {
        return headers;
    }
    const configuredOrigins = readAllowedOrigins();
    return {
        ...headers,
        [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_ORIGIN]: origin,
        [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_METHODS]: allowMethods,
        [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_HEADERS]: allowHeaders,
        [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_CREDENTIALS]: allowCredentials ? 'true' : 'false',
        ...(configuredOrigins.length > 0 ? { [HTTP_HEADERS.VARY]: 'Origin' } : {}),
    };
}
//# sourceMappingURL=cors.js.map