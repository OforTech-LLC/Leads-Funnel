/**
 * Lead Capture API Route
 *
 * Handles lead form submissions from landing pages.
 * In production, forwards to AWS API Gateway.
 * In development, stores leads locally for testing.
 */

import { NextRequest, NextResponse } from 'next/server';

// Types matching the shared package
interface LeadUtm {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

interface LeadSubmission {
  serviceId: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  message?: string;
  notes?: string;
  pageUrl?: string;
  referrer?: string;
  utm?: LeadUtm;
  // Custom fields from different service forms
  [key: string]: unknown;
}

interface ApiResponse {
  success: boolean;
  data?: {
    id: string;
    message: string;
  };
  error?: {
    code: string;
    message: string;
    requestId?: string;
  };
}

// =============================================================================
// Security Headers
// =============================================================================

/** Security headers to include in all responses */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
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
function getAllowedOrigin(requestOrigin: string | null): string | null {
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
 * Build CORS and security headers with origin validation
 */
function buildResponseHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigin = getAllowedOrigin(requestOrigin);

  // Base headers including security headers
  const baseHeaders: Record<string, string> = {
    ...SECURITY_HEADERS,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };

  // Only add Access-Control-Allow-Origin if origin is allowed
  if (allowedOrigin) {
    baseHeaders['Access-Control-Allow-Origin'] = allowedOrigin;
  }

  return baseHeaders;
}

// =============================================================================
// Security Constants
// =============================================================================

// Maximum payload size (10KB) - prevents DoS via large payloads
const MAX_PAYLOAD_SIZE = 10 * 1024; // 10KB in bytes

// Maximum custom fields allowed
const MAX_CUSTOM_FIELDS = 20;
const MAX_CUSTOM_FIELD_KEY_LENGTH = 64;
const MAX_CUSTOM_FIELD_VALUE_LENGTH = 500;

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (flexible international format)
const PHONE_REGEX = /^[\d\s\-\(\)\+]{10,20}$/;

// Valid custom field key pattern
const CUSTOM_FIELD_KEY_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

// Rate limiting - simple in-memory store for development
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

function sanitizeString(input: string): string {
  // Remove dangerous patterns
  let sanitized = input
    .replace(/<script\b[^>]*>/gi, '')
    .replace(/<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<iframe\b[^>]*>/gi, '')
    .replace(/<object\b[^>]*>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '');

  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  return sanitized.trim().slice(0, 1000);
}

function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

function validatePhone(phone: string): boolean {
  return !phone || PHONE_REGEX.test(phone);
}

/**
 * Check payload size before processing
 */
function checkPayloadSize(body: string): boolean {
  // Calculate byte size (handles UTF-8 characters correctly)
  const encoder = new TextEncoder();
  const size = encoder.encode(body).length;
  return size <= MAX_PAYLOAD_SIZE;
}

/**
 * Validate and sanitize custom fields
 */
function validateAndSanitizeCustomFields(body: LeadSubmission): {
  valid: boolean;
  fields: Record<string, string>;
  error?: string;
} {
  const standardFields = new Set([
    'serviceId',
    'name',
    'fullName',
    'firstName',
    'lastName',
    'email',
    'phone',
    'message',
    'notes',
    'pageUrl',
    'referrer',
    'utm',
  ]);

  const customFields: Record<string, string> = {};
  let fieldCount = 0;

  for (const [key, value] of Object.entries(body)) {
    if (standardFields.has(key)) continue;
    if (typeof value !== 'string') continue;

    fieldCount++;

    // Check max custom fields
    if (fieldCount > MAX_CUSTOM_FIELDS) {
      return {
        valid: false,
        fields: {},
        error: `Maximum ${MAX_CUSTOM_FIELDS} custom fields allowed`,
      };
    }

    // Validate key format
    if (!CUSTOM_FIELD_KEY_REGEX.test(key)) {
      return {
        valid: false,
        fields: {},
        error: `Invalid custom field key: "${key}"`,
      };
    }

    // Validate key length
    if (key.length > MAX_CUSTOM_FIELD_KEY_LENGTH) {
      return {
        valid: false,
        fields: {},
        error: `Custom field key "${key}" exceeds maximum length`,
      };
    }

    // Validate value length
    if (value.length > MAX_CUSTOM_FIELD_VALUE_LENGTH) {
      return {
        valid: false,
        fields: {},
        error: `Custom field value for "${key}" exceeds maximum length`,
      };
    }

    // Sanitize and store
    customFields[key] = sanitizeString(value);
  }

  return { valid: true, fields: customFields };
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  // Get request origin for CORS
  const origin = request.headers.get('origin');
  const responseHeaders = buildResponseHeaders(origin);

  try {
    // Get client IP for rate limiting
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0].trim() || 'unknown';

    // Rate limit check
    if (!checkRateLimit(ip)) {
      console.warn(`[Lead API] Rate limited request from IP hash: ${ip.slice(0, 8)}...`);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
            requestId,
          },
        },
        { status: 429, headers: responseHeaders }
      );
    }

    // Get raw body text for size check
    const bodyText = await request.text();

    // Check payload size before parsing (DoS protection)
    if (!checkPayloadSize(bodyText)) {
      console.warn(`[Lead API] Payload too large for request ${requestId}`);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: `Request body exceeds maximum size of ${Math.round(MAX_PAYLOAD_SIZE / 1024)}KB`,
            requestId,
          },
        },
        { status: 413, headers: responseHeaders }
      );
    }

    // Parse body
    let body: LeadSubmission;
    try {
      body = JSON.parse(bodyText);
    } catch {
      console.warn(`[Lead API] Invalid JSON for request ${requestId}`);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON in request body',
            requestId,
          },
        },
        { status: 400, headers: responseHeaders }
      );
    }

    // Extract and normalize name
    let name = body.name || body.fullName || '';
    if (!name && (body.firstName || body.lastName)) {
      name = `${body.firstName || ''} ${body.lastName || ''}`.trim();
    }
    name = sanitizeString(name);

    // Extract email
    const email = sanitizeString(body.email?.toLowerCase() || '');

    // Extract phone
    const phone = body.phone ? sanitizeString(body.phone) : undefined;

    // Extract message/notes
    const message = sanitizeString(body.message || body.notes || '');

    // Validate required fields
    const errors: string[] = [];

    if (!name) {
      errors.push('Name is required');
    }

    if (!email) {
      errors.push('Email is required');
    } else if (!validateEmail(email)) {
      errors.push('Please enter a valid email address');
    }

    if (phone && !validatePhone(phone)) {
      errors.push('Please enter a valid phone number');
    }

    if (!body.serviceId) {
      errors.push('Service ID is required');
    }

    // Validate custom fields
    const customFieldsResult = validateAndSanitizeCustomFields(body);
    if (!customFieldsResult.valid) {
      errors.push(customFieldsResult.error || 'Invalid custom fields');
    }

    if (errors.length > 0) {
      console.warn(`[Lead API] Validation error for request ${requestId}:`, errors);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: errors.join('. '),
            requestId,
          },
        },
        { status: 400, headers: responseHeaders }
      );
    }

    // Build the lead payload
    const leadPayload = {
      funnelId: body.serviceId,
      name,
      email,
      phone,
      notes: message,
      utm: body.utm || extractUtmFromUrl(body.pageUrl),
      metadata: {
        pageUrl: body.pageUrl,
        referrer: body.referrer,
        timestamp: new Date().toISOString(),
      },
      customFields: customFieldsResult.fields,
    };

    // In production, forward to AWS API Gateway
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    if (apiUrl && process.env.NODE_ENV === 'production') {
      const response = await fetch(`${apiUrl}/lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': ip,
          'X-Request-Id': requestId,
        },
        body: JSON.stringify(leadPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[Lead API] Backend error for request ${requestId}:`, {
          status: response.status,
          error: errorData,
        });
        throw new Error(errorData.message || 'Failed to submit lead');
      }

      const data = await response.json();
      return NextResponse.json<ApiResponse>(data, { headers: responseHeaders });
    }

    // Development mode: Log and return mock response
    console.log('==== Lead Submission (Development) ====');
    console.log('Request ID:', requestId);
    console.log('Service:', body.serviceId);
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Phone:', phone);
    console.log('Message:', message);
    console.log('Page URL:', body.pageUrl);
    console.log('Custom Fields:', customFieldsResult.fields);
    console.log('======================================');

    // Generate a mock lead ID
    const mockLeadId = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          id: mockLeadId,
          message: 'Lead submitted successfully',
        },
      },
      { headers: responseHeaders }
    );
  } catch (error) {
    // Log the error with request ID for tracing
    console.error(
      `[Lead API] Error processing request ${requestId}:`,
      error instanceof Error ? error.message : 'Unknown error'
    );

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred. Please try again.',
          requestId,
        },
      },
      { status: 500, headers: responseHeaders }
    );
  }
}

// Extract UTM parameters from URL
function extractUtmFromUrl(url?: string): LeadUtm {
  if (!url) return {};

  try {
    const urlObj = new URL(url);
    return {
      utm_source: urlObj.searchParams.get('utm_source') || undefined,
      utm_medium: urlObj.searchParams.get('utm_medium') || undefined,
      utm_campaign: urlObj.searchParams.get('utm_campaign') || undefined,
      utm_term: urlObj.searchParams.get('utm_term') || undefined,
      utm_content: urlObj.searchParams.get('utm_content') || undefined,
    };
  } catch (error) {
    // Log URL parsing errors but don't fail the request
    console.warn(
      '[Lead API] Failed to parse URL for UTM extraction:',
      error instanceof Error ? error.message : 'Invalid URL'
    );
    return {};
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const responseHeaders = buildResponseHeaders(origin);

  return new NextResponse(null, {
    status: 204,
    headers: responseHeaders,
  });
}
