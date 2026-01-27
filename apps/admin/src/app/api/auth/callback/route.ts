/**
 * OAuth Callback Route
 *
 * Handles the Cognito redirect after successful login.
 * Exchanges the authorization code for tokens and sets the auth cookie.
 * Verifies OAuth state parameter for CSRF protection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/auth';
import { AUTH_COOKIE_NAME } from '@/lib/constants';

/**
 * Timing-safe string comparison to prevent timing attacks on state parameter.
 * Uses XOR-based comparison which works in all runtimes (including Edge).
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle Cognito errors - redirect with safe error key, not raw description
  if (error) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  // Security: Verify OAuth state parameter from cookie for CSRF protection
  const storedState = request.cookies.get('oauth_state')?.value;
  if (!state || !storedState || !timingSafeCompare(state, storedState)) {
    const response = NextResponse.redirect(new URL('/login?error=invalid_state', request.url));
    // Clear the state cookie
    response.cookies.set('oauth_state', '', { maxAge: 0, path: '/' });
    return response;
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const token = tokens.id_token || tokens.access_token;

    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: tokens.expires_in || 3600,
      path: '/',
    });

    // Clear the state cookie after successful verification
    response.cookies.set('oauth_state', '', { maxAge: 0, path: '/' });

    return response;
  } catch (err) {
    console.error('Token exchange failed:', err);
    return NextResponse.redirect(new URL('/login?error=token_exchange_failed', request.url));
  }
}
