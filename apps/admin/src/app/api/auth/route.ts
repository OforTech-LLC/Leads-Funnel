/**
 * Auth API Route
 *
 * POST   - Set auth cookie from token (after OAuth callback)
 * DELETE - Clear auth cookie (logout)
 * GET    - Check auth status
 */

import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/constants';

// ---------------------------------------------------------------------------
// GET - Check auth status
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Decode the JWT payload (without verification - that happens server-side
  // on the API). This is purely for displaying user info in the UI.
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      const response = NextResponse.json({ authenticated: false }, { status: 401 });
      response.cookies.delete(AUTH_COOKIE_NAME);
      return response;
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        sub: payload.sub,
        email: payload.email || payload['cognito:username'] || 'admin',
        groups: payload['cognito:groups'] || [],
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

// ---------------------------------------------------------------------------
// POST - Set auth cookie
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { access_token, id_token, expires_in } = body;

    if (!access_token) {
      return NextResponse.json({ error: 'access_token is required' }, { status: 400 });
    }

    const token = id_token || access_token;
    const maxAge = expires_in || 3600;

    const response = NextResponse.json({ success: true });
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// ---------------------------------------------------------------------------
// DELETE - Clear auth cookie
// ---------------------------------------------------------------------------

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}
