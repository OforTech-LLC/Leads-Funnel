/**
 * Input Sanitization Utilities
 *
 * Provides functions to sanitize user input before display
 * to prevent XSS attacks and other injection vulnerabilities.
 */

/**
 * HTML entities that need escaping
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML special characters to prevent XSS
 * Use this when displaying user-generated content in HTML context
 *
 * @param input - The string to escape
 * @returns Escaped string safe for HTML display
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export function escapeHtml(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize a string for use in JavaScript context
 * Escapes characters that could break out of string literals
 *
 * @param input - The string to sanitize
 * @returns Sanitized string safe for JS string context
 */
export function escapeJsString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Sanitize a string for use in URL context
 * Encodes special characters for safe URL usage
 *
 * @param input - The string to sanitize
 * @returns URL-encoded string
 */
export function escapeUrl(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return encodeURIComponent(input);
}

/**
 * Sanitize a string for use as an HTML attribute value
 *
 * @param input - The string to sanitize
 * @returns Sanitized string safe for attribute context
 */
export function escapeAttribute(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Escape HTML entities and additional attribute-specific characters
  return escapeHtml(input).replace(/[\n\r]/g, '');
}

/**
 * Strip all HTML tags from a string
 * Use when you need plain text only
 *
 * @param input - The string to strip
 * @returns String with all HTML tags removed
 */
export function stripHtml(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize user input for display
 * Applies multiple sanitization steps for comprehensive protection
 *
 * @param input - Raw user input
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export interface SanitizeOptions {
  /** Trim whitespace */
  trim?: boolean;
  /** Maximum length (truncate if exceeded) */
  maxLength?: number;
  /** Allow newlines */
  allowNewlines?: boolean;
  /** Strip all HTML (otherwise escape) */
  stripHtml?: boolean;
  /** Convert newlines to <br> tags (after escaping) */
  convertNewlines?: boolean;
}

export function sanitizeInput(input: string, options: SanitizeOptions = {}): string {
  if (typeof input !== 'string') {
    return '';
  }

  const {
    trim = true,
    maxLength,
    allowNewlines = true,
    stripHtml: shouldStripHtml = false,
    convertNewlines = false,
  } = options;

  let result = input;

  // Trim whitespace
  if (trim) {
    result = result.trim();
  }

  // Truncate if needed
  if (maxLength && result.length > maxLength) {
    result = result.slice(0, maxLength);
  }

  // Strip or escape HTML
  if (shouldStripHtml) {
    result = stripHtml(result);
  } else {
    result = escapeHtml(result);
  }

  // Handle newlines
  if (!allowNewlines) {
    result = result.replace(/[\n\r]/g, ' ');
  } else if (convertNewlines) {
    // Convert newlines to <br> after escaping
    result = result.replace(/\n/g, '<br>');
  }

  return result;
}

/**
 * Sanitize an email address
 * Validates format and removes potentially dangerous characters
 *
 * @param email - Raw email input
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }

  const trimmed = email.trim().toLowerCase();

  // Basic email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return '';
  }

  // Remove any characters that shouldn't be in an email
  return trimmed.replace(/[<>"'`&]/g, '');
}

/**
 * Sanitize a phone number
 * Keeps only digits and common formatting characters
 *
 * @param phone - Raw phone input
 * @returns Sanitized phone number
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') {
    return '';
  }

  // Keep only digits, spaces, hyphens, parentheses, and plus sign
  return phone.replace(/[^\d\s\-\(\)\+\.]/g, '').trim();
}

/**
 * Sanitize a name field
 * Allows letters, spaces, hyphens, and apostrophes (for names like O'Brien)
 *
 * @param name - Raw name input
 * @returns Sanitized name
 */
export function sanitizeName(name: string): string {
  if (typeof name !== 'string') {
    return '';
  }

  // Allow Unicode letters, spaces, hyphens, apostrophes, and periods
  // Remove potentially dangerous characters while preserving international names
  return name
    .trim()
    .replace(/[<>"&`=\/\\]/g, '')
    .slice(0, 200); // Reasonable max length for a name
}

/**
 * Sanitize a URL
 * Validates and sanitizes URLs, preventing javascript: and data: schemes
 *
 * @param url - Raw URL input
 * @returns Sanitized URL or empty string if invalid/dangerous
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();

  // Block dangerous schemes
  const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = trimmed.toLowerCase();

  for (const scheme of dangerousSchemes) {
    if (lowerUrl.startsWith(scheme)) {
      return '';
    }
  }

  // Only allow http, https, mailto, and tel schemes
  const allowedSchemes = ['http://', 'https://', 'mailto:', 'tel:', '/'];
  const hasAllowedScheme = allowedSchemes.some((scheme) => lowerUrl.startsWith(scheme));

  if (!hasAllowedScheme && trimmed.includes(':')) {
    // Unknown scheme, reject
    return '';
  }

  return trimmed;
}

/**
 * Sanitize form data object
 * Applies appropriate sanitization to each field based on type
 *
 * @param data - Form data object
 * @returns Sanitized form data
 */
export function sanitizeFormData<T extends Record<string, string>>(
  data: T,
  fieldTypes: Partial<Record<keyof T, 'text' | 'email' | 'phone' | 'name' | 'url' | 'message'>> = {}
): T {
  const result = { ...data };

  for (const [key, value] of Object.entries(data)) {
    const fieldType = fieldTypes[key as keyof T] || 'text';

    switch (fieldType) {
      case 'email':
        result[key as keyof T] = sanitizeEmail(value) as T[keyof T];
        break;
      case 'phone':
        result[key as keyof T] = sanitizePhone(value) as T[keyof T];
        break;
      case 'name':
        result[key as keyof T] = sanitizeName(value) as T[keyof T];
        break;
      case 'url':
        result[key as keyof T] = sanitizeUrl(value) as T[keyof T];
        break;
      case 'message':
        result[key as keyof T] = sanitizeInput(value, {
          maxLength: 5000,
          allowNewlines: true,
        }) as T[keyof T];
        break;
      default:
        result[key as keyof T] = sanitizeInput(value, { maxLength: 1000 }) as T[keyof T];
    }
  }

  return result;
}

/**
 * Check if a string contains potentially dangerous content
 * Use for logging/alerting purposes
 *
 * @param input - String to check
 * @returns True if suspicious patterns found
 */
export function containsSuspiciousContent(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /data:/i,
    /vbscript:/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<form/i,
    /expression\s*\(/i,
    /url\s*\(/i,
    /@import/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(input));
}
