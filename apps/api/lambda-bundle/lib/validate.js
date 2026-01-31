/**
 * Validation utilities for lead submission
 *
 * Provides comprehensive validation for incoming lead form data, ensuring
 * data integrity and security before processing or storage.
 */
// =============================================================================
// Validation Constants
// =============================================================================
/** Maximum allowed lengths for each field type */
const MAX_LENGTHS = {
    name: 120,
    email: 254,
    phone: 40,
    message: 2000,
    utm: 120,
    consentVersion: 120,
    customFieldKey: 64,
    customFieldValue: 500,
    url: 2048,
};
/** Maximum number of custom fields allowed */
const MAX_CUSTOM_FIELDS = 20;
/** RFC-compliant email regex pattern */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Valid custom field key pattern (alphanumeric, underscore, hyphen) */
const CUSTOM_FIELD_KEY_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
/** Dangerous HTML/script patterns to sanitize from values */
const DANGEROUS_PATTERNS = [
    /<script\b[^>]*>/gi,
    /<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
];
// =============================================================================
// SSRF Protection - Private/Internal IP Ranges
// =============================================================================
/** IPv4 private and reserved ranges */
const PRIVATE_IPV4_RANGES = [
    // Loopback
    { start: '127.0.0.0', end: '127.255.255.255' },
    // Private Class A
    { start: '10.0.0.0', end: '10.255.255.255' },
    // Private Class B
    { start: '172.16.0.0', end: '172.31.255.255' },
    // Private Class C
    { start: '192.168.0.0', end: '192.168.255.255' },
    // Link-local
    { start: '169.254.0.0', end: '169.254.255.255' },
    // Localhost
    { start: '0.0.0.0', end: '0.255.255.255' },
];
/** IPv6 private and reserved prefixes */
const PRIVATE_IPV6_PREFIXES = [
    '::1', // Loopback
    'fe80:', // Link-local
    'fc00:', // Unique local
    'fd00:', // Unique local
    '::ffff:127.', // IPv4-mapped loopback
    '::ffff:10.', // IPv4-mapped private
    '::ffff:172.16.', // IPv4-mapped private
    '::ffff:192.168.', // IPv4-mapped private
];
/** Blocked hostnames */
const BLOCKED_HOSTNAMES = [
    'localhost',
    'localhost.localdomain',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '[::1]',
    'metadata.google.internal',
    '169.254.169.254', // AWS/GCP metadata service
    'metadata.google.internal',
];
// =============================================================================
// URL Validation Functions
// =============================================================================
/**
 * Convert IPv4 address to numeric value for range checking
 */
function ipv4ToNumber(ip) {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}
/**
 * Check if an IPv4 address is in a private range
 */
function isPrivateIPv4(ip) {
    const ipNum = ipv4ToNumber(ip);
    for (const range of PRIVATE_IPV4_RANGES) {
        const startNum = ipv4ToNumber(range.start);
        const endNum = ipv4ToNumber(range.end);
        if (ipNum >= startNum && ipNum <= endNum) {
            return true;
        }
    }
    return false;
}
/**
 * Check if an IPv6 address is private/reserved
 */
function isPrivateIPv6(ip) {
    const normalized = ip.toLowerCase();
    for (const prefix of PRIVATE_IPV6_PREFIXES) {
        if (normalized.startsWith(prefix.toLowerCase())) {
            return true;
        }
    }
    return false;
}
/**
 * Check if a hostname is blocked
 */
function isBlockedHostname(hostname) {
    const normalized = hostname.toLowerCase();
    // Check against blocked hostnames
    if (BLOCKED_HOSTNAMES.includes(normalized)) {
        return true;
    }
    // Check if hostname is an IP address
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^\[?([0-9a-f:]+)\]?$/i;
    if (ipv4Regex.test(normalized)) {
        return isPrivateIPv4(normalized);
    }
    const ipv6Match = normalized.match(ipv6Regex);
    if (ipv6Match) {
        return isPrivateIPv6(ipv6Match[1]);
    }
    return false;
}
/**
 * Validate a URL for SSRF protection
 *
 * Ensures the URL:
 * - Uses only http or https scheme
 * - Does not point to internal/private IP addresses
 * - Does not use blocked hostnames
 * - Is within length limits
 *
 * @param url - The URL to validate
 * @returns Object with valid flag and optional error message
 */
export function validateUrl(url) {
    if (!url) {
        return { valid: true }; // Empty URLs are allowed (field is optional)
    }
    // Check length
    if (url.length > MAX_LENGTHS.url) {
        return { valid: false, error: `URL must be ${MAX_LENGTHS.url} characters or less` };
    }
    try {
        const parsed = new URL(url);
        // Only allow http and https schemes
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return { valid: false, error: 'URL must use http or https protocol' };
        }
        // Check for blocked hostnames and private IPs
        if (isBlockedHostname(parsed.hostname)) {
            return { valid: false, error: 'URL points to a restricted address' };
        }
        return { valid: true };
    }
    catch {
        return { valid: false, error: 'Invalid URL format' };
    }
}
// =============================================================================
// Custom Fields Validation
// =============================================================================
/**
 * Sanitize a string value by removing dangerous patterns
 */
function sanitizeValue(value) {
    let sanitized = value;
    for (const pattern of DANGEROUS_PATTERNS) {
        sanitized = sanitized.replace(pattern, '');
    }
    // Remove null bytes and other control characters (except newlines and tabs)
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    return sanitized.trim();
}
/**
 * Validate custom fields object
 *
 * Checks:
 * - Maximum number of custom fields (20)
 * - Key format (alphanumeric, underscore, hyphen, starts with letter)
 * - Key length (max 64 characters)
 * - Value type (must be string)
 * - Value length (max 500 characters)
 * - Sanitizes values to remove dangerous content
 *
 * @param customFields - The custom fields object to validate
 * @returns Object with valid flag, sanitized fields, and optional errors
 */
export function validateCustomFields(customFields) {
    if (customFields === undefined || customFields === null) {
        return { valid: true, sanitizedFields: undefined };
    }
    if (typeof customFields !== 'object' || Array.isArray(customFields)) {
        return { valid: false, errors: ['customFields must be an object'] };
    }
    const fields = customFields;
    const keys = Object.keys(fields);
    const errors = [];
    const sanitizedFields = {};
    // Check maximum number of fields
    if (keys.length > MAX_CUSTOM_FIELDS) {
        return {
            valid: false,
            errors: [`customFields cannot have more than ${MAX_CUSTOM_FIELDS} fields`],
        };
    }
    for (const key of keys) {
        const value = fields[key];
        // Validate key format
        if (!CUSTOM_FIELD_KEY_REGEX.test(key)) {
            errors.push(`customFields key "${key}" must start with a letter and contain only alphanumeric characters, underscores, and hyphens`);
            continue;
        }
        // Validate key length
        if (key.length > MAX_LENGTHS.customFieldKey) {
            errors.push(`customFields key "${key}" must be ${MAX_LENGTHS.customFieldKey} characters or less`);
            continue;
        }
        // Validate value type
        if (typeof value !== 'string') {
            errors.push(`customFields value for "${key}" must be a string`);
            continue;
        }
        // Validate value length
        if (value.length > MAX_LENGTHS.customFieldValue) {
            errors.push(`customFields value for "${key}" must be ${MAX_LENGTHS.customFieldValue} characters or less`);
            continue;
        }
        // Sanitize and store the value
        sanitizedFields[key] = sanitizeValue(value);
    }
    if (errors.length > 0) {
        return { valid: false, errors };
    }
    return {
        valid: true,
        sanitizedFields: Object.keys(sanitizedFields).length > 0 ? sanitizedFields : undefined,
    };
}
// =============================================================================
// Validation Functions
// =============================================================================
/**
 * Validates the complete lead request payload.
 *
 * Performs comprehensive validation including:
 * - Type checking for all fields
 * - Required field validation (name, email)
 * - Length constraints enforcement
 * - Email format validation
 * - UTM parameter validation
 * - Custom fields validation
 * - URL/referrer SSRF protection
 *
 * @param body - The raw request body to validate (unknown type for safety)
 * @returns ValidationResult containing validity status and any field-specific errors
 *
 * @example
 * ```typescript
 * const result = validateLeadPayload(requestBody);
 * if (!result.valid) {
 *   return { statusCode: 400, errors: result.errors };
 * }
 * ```
 */
export function validateLeadPayload(body) {
    const errors = {};
    // Check if body is an object
    if (!body || typeof body !== 'object') {
        return {
            valid: false,
            errors: { _body: 'Request body must be a valid JSON object' },
        };
    }
    const payload = body;
    // Validate required fields
    if (!payload.name || typeof payload.name !== 'string') {
        errors.name = 'Name is required';
    }
    else if (payload.name.trim().length === 0) {
        errors.name = 'Name cannot be empty';
    }
    else if (payload.name.length > MAX_LENGTHS.name) {
        errors.name = `Name must be ${MAX_LENGTHS.name} characters or less`;
    }
    if (!payload.email || typeof payload.email !== 'string') {
        errors.email = 'Email is required';
    }
    else if (payload.email.trim().length === 0) {
        errors.email = 'Email cannot be empty';
    }
    else if (payload.email.length > MAX_LENGTHS.email) {
        errors.email = `Email must be ${MAX_LENGTHS.email} characters or less`;
    }
    else if (!EMAIL_REGEX.test(payload.email.trim())) {
        errors.email = 'Please enter a valid email address';
    }
    // Validate optional fields
    if (payload.phone !== undefined) {
        if (typeof payload.phone !== 'string') {
            errors.phone = 'Phone must be a string';
        }
        else if (payload.phone.length > MAX_LENGTHS.phone) {
            errors.phone = `Phone must be ${MAX_LENGTHS.phone} characters or less`;
        }
    }
    if (payload.notes !== undefined) {
        if (typeof payload.notes !== 'string') {
            errors.notes = 'Message must be a string';
        }
        else if (payload.notes.length > MAX_LENGTHS.message) {
            errors.notes = `Message must be ${MAX_LENGTHS.message} characters or less`;
        }
    }
    // Validate UTM fields
    if (payload.utm !== undefined) {
        if (typeof payload.utm !== 'object' || payload.utm === null) {
            errors.utm = 'UTM must be an object';
        }
        else {
            const utmFields = [
                'utm_source',
                'utm_medium',
                'utm_campaign',
                'utm_term',
                'utm_content',
            ];
            for (const field of utmFields) {
                const value = payload.utm[field];
                if (value !== undefined) {
                    if (typeof value !== 'string') {
                        errors[field] = `${field} must be a string`;
                    }
                    else if (value.length > MAX_LENGTHS.utm) {
                        errors[field] = `${field} must be ${MAX_LENGTHS.utm} characters or less`;
                    }
                }
            }
        }
    }
    // Validate custom fields
    if (payload.customFields !== undefined) {
        const customFieldsResult = validateCustomFields(payload.customFields);
        if (!customFieldsResult.valid && customFieldsResult.errors) {
            errors.customFields = customFieldsResult.errors.join('; ');
        }
    }
    // Validate metadata URLs for SSRF protection
    if (payload.metadata !== undefined) {
        if (typeof payload.metadata !== 'object' || payload.metadata === null) {
            errors.metadata = 'metadata must be an object';
        }
        else {
            // Validate pageUrl
            const pageUrlResult = validateUrl(payload.metadata.pageUrl);
            if (!pageUrlResult.valid) {
                errors.pageUrl = pageUrlResult.error || 'Invalid page URL';
            }
            // Validate referrer
            const referrerResult = validateUrl(payload.metadata.referrer);
            if (!referrerResult.valid) {
                errors.referrer = referrerResult.error || 'Invalid referrer URL';
            }
        }
    }
    // Validate consent payload
    if (payload.consent !== undefined) {
        if (typeof payload.consent !== 'object' || payload.consent === null) {
            errors.consent = 'consent must be an object';
        }
        else {
            if (typeof payload.consent.privacyAccepted !== 'boolean') {
                errors.consent = 'consent.privacyAccepted must be a boolean';
            }
            if (payload.consent.marketingConsent !== undefined &&
                typeof payload.consent.marketingConsent !== 'boolean') {
                errors.consent = 'consent.marketingConsent must be a boolean';
            }
            if (payload.consent.privacyPolicyVersion !== undefined &&
                typeof payload.consent.privacyPolicyVersion !== 'string') {
                errors.consent = 'consent.privacyPolicyVersion must be a string';
            }
            if (payload.consent.termsVersion !== undefined &&
                typeof payload.consent.termsVersion !== 'string') {
                errors.consent = 'consent.termsVersion must be a string';
            }
            if (payload.consent.privacyPolicyVersion &&
                payload.consent.privacyPolicyVersion.length > MAX_LENGTHS.consentVersion) {
                errors.consent = `consent.privacyPolicyVersion must be ${MAX_LENGTHS.consentVersion} characters or less`;
            }
            if (payload.consent.termsVersion &&
                payload.consent.termsVersion.length > MAX_LENGTHS.consentVersion) {
                errors.consent = `consent.termsVersion must be ${MAX_LENGTHS.consentVersion} characters or less`;
            }
        }
    }
    return {
        valid: Object.keys(errors).length === 0,
        errors,
    };
}
/**
 * Safely parses a JSON string body with error handling.
 *
 * Provides a safe way to parse incoming request bodies without throwing
 * exceptions, returning a descriptive error message on failure.
 *
 * @param body - The raw JSON string to parse, or null/undefined
 * @returns Object containing parsed data or error message
 *
 * @example
 * ```typescript
 * const { data, error } = parseJsonBody(event.body);
 * if (error) {
 *   return { statusCode: 400, body: JSON.stringify({ error }) };
 * }
 * // data is now safely parsed
 * ```
 */
export function parseJsonBody(body) {
    if (!body) {
        return { data: null, error: 'Request body is empty' };
    }
    try {
        const data = JSON.parse(body);
        return { data };
    }
    catch {
        return { data: null, error: 'Invalid JSON in request body' };
    }
}
//# sourceMappingURL=validate.js.map