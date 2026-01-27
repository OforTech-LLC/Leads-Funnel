/**
 * OAuth Callback Route
 *
 * Handles the Cognito redirect after successful login.
 * Exchanges the authorization code for tokens and sets the auth cookie.
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/auth';
import { AUTH_COOKIE_NAME } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Handle Cognito errors
  if (error) {
    const errorDescription = searchParams.get('error_description') || 'Login failed';
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=No+authorization+code+received', request.url)
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const token = tokens.id_token || tokens.access_token;

    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in || 3600,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Token exchange failed:', err);
    return NextResponse.redirect(new URL('/login?error=Authentication+failed', request.url));
  }
}
