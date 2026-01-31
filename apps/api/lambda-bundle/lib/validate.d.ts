/**
 * Validation utilities for lead submission
 *
 * Provides comprehensive validation for incoming lead form data, ensuring
 * data integrity and security before processing or storage.
 */
import type { FieldErrors } from '@kanjona/shared';
/**
 * Result of payload validation containing validity status and any field errors.
 */
export interface ValidationResult {
    /** Whether the payload passed all validation checks */
    valid: boolean;
    /** Map of field names to their error messages */
    errors: FieldErrors;
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
export declare function validateUrl(url: string | undefined): {
    valid: boolean;
    error?: string;
};
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
export declare function validateCustomFields(customFields: unknown): {
    valid: boolean;
    sanitizedFields?: Record<string, string>;
    errors?: string[];
};
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
export declare function validateLeadPayload(body: unknown): ValidationResult;
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
export declare function parseJsonBody(body: string | null | undefined): {
    data: unknown;
    error?: string;
};
