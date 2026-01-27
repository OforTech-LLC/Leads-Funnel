/**
 * CSRF Token API Route
 *
 * Provides CSRF tokens for form submissions to protect against
 * Cross-Site Request Forgery attacks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/csrf';

// Security headers for all responses
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  Pragma: 'no-cache',
};

/**
 * GET /api/csrf
 *
 * Generate and return a new CSRF token.
 * Tokens are valid for 1 hour and should be included in form submissions.
 */
export async function GET(request: NextRequest) {
  try {
    // Generate new token
    const token = generateCSRFToken();

    // Create response with token
    const response = NextResponse.json(
      { token },
      {
        status: 200,
        headers: SECURITY_HEADERS,
      }
    );

    // Also set token as a cookie for double-submit pattern
    response.cookies.set({
      name: 'csrf_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    });

    return response;
  } catch (error) {
    console.error('[CSRF API] Error generating token:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
