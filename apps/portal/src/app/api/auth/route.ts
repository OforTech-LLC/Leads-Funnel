import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

const COGNITO_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '';
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '';
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET || '';
const COOKIE_NAME = 'portal_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// ── POST: Exchange authorization code for tokens, set cookie ──

export async function POST(request: NextRequest) {
  try {
    const { code, redirectUri } = await request.json();

    if (!code || !redirectUri) {
      return NextResponse.json({ error: 'Missing code or redirectUri' }, { status: 400 });
    }

    // Exchange code for tokens with Cognito
    const tokenUrl = `${COGNITO_DOMAIN}/oauth2/token`;
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      redirect_uri: redirectUri,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    // If client secret is set, use basic auth
    if (CLIENT_SECRET) {
      headers['Authorization'] =
        'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    }

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers,
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error('Token exchange failed:', errorBody);
      return NextResponse.json({ error: 'Token exchange failed' }, { status: 401 });
    }

    const tokens = await tokenResponse.json();
    const idToken = tokens.id_token as string;

    if (!idToken) {
      return NextResponse.json({ error: 'No id_token received' }, { status: 401 });
    }

    // Validate we can parse the token
    const user = getUserFromToken(idToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Set httpOnly cookie with the id_token
    const response = NextResponse.json({ success: true, user });
    response.cookies.set(COOKIE_NAME, idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    // Also store access_token if provided (for API calls)
    if (tokens.access_token) {
      response.cookies.set('portal_access_token', tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE,
      });
    }

    return response;
  } catch (error) {
    console.error('Auth POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── GET: Check auth status, return user info ──

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = getUserFromToken(token);
    if (!user) {
      // Token expired or invalid
      const response = NextResponse.json(
        { authenticated: false, reason: 'expired' },
        { status: 401 }
      );
      response.cookies.delete(COOKIE_NAME);
      return response;
    }

    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

// ── DELETE: Clear auth cookies (logout) ──

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(COOKIE_NAME);
  response.cookies.delete('portal_access_token');
  return response;
}
