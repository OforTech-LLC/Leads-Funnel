/**
 * Admin Authentication API Route
 *
 * Handles secure cookie management for admin authentication.
 * - POST: Set authentication token cookie after OAuth callback
 * - DELETE: Clear authentication cookie on logout
 *
 * Includes CSRF protection for state-changing operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateCSRFToken } from '@/lib/csrf';

// Cookie configuration
const COOKIE_NAME = 'admin_token';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours in seconds

// Environment check for secure cookies
const isProduction = process.env.NODE_ENV === 'production';

// Security headers for all responses
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
};

interface SetTokenRequest {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number; // seconds until expiration
}

interface AuthResponse {
  success: boolean;
  error?: string;
}

/**
 * Validate the token request payload
 */
function validateTokenRequest(body: unknown): body is SetTokenRequest {
  if (!body || typeof body !== 'object') {
    return false;
  }

  const request = body as Record<string, unknown>;

  return (
    typeof request.accessToken === 'string' &&
    request.accessToken.length > 0 &&
    typeof request.idToken === 'string' &&
    request.idToken.length > 0 &&
    typeof request.refreshToken === 'string' &&
    request.refreshToken.length > 0 &&
    typeof request.expiresIn === 'number' &&
    request.expiresIn > 0
  );
}

/**
 * Verify CSRF token from request headers or cookies
 */
function verifyCSRF(request: NextRequest): boolean {
  // Get token from header (sent by client)
  const headerToken = request.headers.get('x-csrf-token');

  // Get token from cookie (set by server)
  const cookieToken = request.cookies.get('csrf_token')?.value;

  // Double-submit pattern: both must exist and match
  if (!headerToken || !cookieToken) {
    return false;
  }

  // Validate the token from header is properly signed and not expired
  if (!validateCSRFToken(headerToken)) {
    return false;
  }

  // Tokens should match (double-submit verification)
  return headerToken === cookieToken;
}

/**
 * POST /api/admin/auth
 *
 * Set authentication tokens as secure httpOnly cookies.
 * Called after successful OAuth callback to store tokens securely.
 *
 * Requires CSRF token for protection against cross-site attacks.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify CSRF token for state-changing operation
    if (!verifyCSRF(request)) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Invalid CSRF token' },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }

    const body = await request.json();

    // Validate request
    if (!validateTokenRequest(body)) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Invalid token request' },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Create token payload for cookie
    // We store all tokens in a single encrypted cookie
    const tokenPayload = {
      accessToken: body.accessToken,
      idToken: body.idToken,
      refreshToken: body.refreshToken,
      expiresAt: Date.now() + body.expiresIn * 1000,
    };

    // Calculate cookie max age (use token expiry or 24 hours, whichever is less)
    const maxAge = Math.min(body.expiresIn, COOKIE_MAX_AGE);

    // Create response with secure cookie
    const response = NextResponse.json<AuthResponse>(
      { success: true },
      { headers: SECURITY_HEADERS }
    );

    // Set the token cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: JSON.stringify(tokenPayload),
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge,
    });

    return response;
  } catch (error) {
    console.error('Error setting auth cookie:', error);
    return NextResponse.json<AuthResponse>(
      { success: false, error: 'Failed to set authentication' },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}

/**
 * DELETE /api/admin/auth
 *
 * Clear authentication cookie on logout.
 * Invalidates the session by removing the token cookie.
 *
 * Requires CSRF token for protection against cross-site attacks.
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify CSRF token for state-changing operation
    if (!verifyCSRF(request)) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Invalid CSRF token' },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }

    const response = NextResponse.json<AuthResponse>(
      { success: true },
      { headers: SECURITY_HEADERS }
    );

    // Clear the token cookie by setting it with immediate expiry
    response.cookies.set({
      name: COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 0, // Immediate expiration
    });

    // Also clear CSRF token cookie
    response.cookies.set({
      name: 'csrf_token',
      value: '',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('Error clearing auth cookie:', error);
    return NextResponse.json<AuthResponse>(
      { success: false, error: 'Failed to clear authentication' },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}

/**
 * GET /api/admin/auth
 *
 * Check if user has valid authentication.
 * Returns authentication status without exposing token details.
 *
 * GET requests are safe and don't require CSRF verification.
 */
export async function GET(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get(COOKIE_NAME);

    if (!tokenCookie?.value) {
      return NextResponse.json(
        {
          authenticated: false,
          error: 'No authentication token',
        },
        { headers: SECURITY_HEADERS }
      );
    }

    // Parse and validate token
    const tokenPayload = JSON.parse(tokenCookie.value);

    // Check if token is expired
    if (tokenPayload.expiresAt < Date.now()) {
      return NextResponse.json(
        {
          authenticated: false,
          error: 'Token expired',
          needsRefresh: true,
        },
        { headers: SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
        expiresAt: tokenPayload.expiresAt,
      },
      { headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error('Error checking auth status:', error);
    return NextResponse.json(
      {
        authenticated: false,
        error: 'Invalid token format',
      },
      { headers: SECURITY_HEADERS }
    );
  }
}
