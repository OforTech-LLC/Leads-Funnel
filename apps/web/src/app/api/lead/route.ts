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
  };
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (flexible international format)
const PHONE_REGEX = /^[\d\s\-\(\)\+]{10,20}$/;

// Rate limiting - simple in-memory store for development
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

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
  return input.trim().replace(/[<>]/g, '').slice(0, 1000);
}

function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

function validatePhone(phone: string): boolean {
  return !phone || PHONE_REGEX.test(phone);
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0].trim() || 'unknown';

    // Rate limit check
    if (!checkRateLimit(ip)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
          },
        },
        { status: 429 }
      );
    }

    // Parse body
    const body: LeadSubmission = await request.json();

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

    if (errors.length > 0) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: errors.join('. '),
          },
        },
        { status: 400 }
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
      customFields: extractCustomFields(body),
    };

    // In production, forward to AWS API Gateway
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    if (apiUrl && process.env.NODE_ENV === 'production') {
      const response = await fetch(`${apiUrl}/lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': ip,
        },
        body: JSON.stringify(leadPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to submit lead');
      }

      const data = await response.json();
      return NextResponse.json<ApiResponse>(data);
    }

    // Development mode: Log and return mock response
    console.log('==== Lead Submission (Development) ====');
    console.log('Service:', body.serviceId);
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Phone:', phone);
    console.log('Message:', message);
    console.log('Page URL:', body.pageUrl);
    console.log('Custom Fields:', extractCustomFields(body));
    console.log('======================================');

    // Generate a mock lead ID
    const mockLeadId = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: mockLeadId,
        message: 'Lead submitted successfully',
      },
    });
  } catch (error) {
    console.error('Lead submission error:', error);

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred. Please try again.',
        },
      },
      { status: 500 }
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
  } catch {
    return {};
  }
}

// Extract custom fields (anything not in the standard fields)
function extractCustomFields(body: LeadSubmission): Record<string, string> {
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

  for (const [key, value] of Object.entries(body)) {
    if (!standardFields.has(key) && typeof value === 'string') {
      customFields[key] = sanitizeString(value);
    }
  }

  return customFields;
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
