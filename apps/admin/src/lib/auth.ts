/**
 * Admin Authentication Library
 *
 * Implements Cognito Hosted UI OAuth2 authorization code flow.
 * Tokens are stored in httpOnly cookies via API route for security.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const COGNITO_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '';
const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '';
const COGNITO_REDIRECT_URI =
  process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI || 'http://localhost:3001/api/auth/callback';
const COGNITO_LOGOUT_URI =
  process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI || 'http://localhost:3001/login';

// ---------------------------------------------------------------------------
// Login / Logout URLs
// ---------------------------------------------------------------------------

/**
 * Build the Cognito Hosted UI login URL.
 * Uses authorization code flow (response_type=code) for security.
 */
export function getLoginUrl(): string {
  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: COGNITO_REDIRECT_URI,
  });
  return `${COGNITO_DOMAIN}/login?${params.toString()}`;
}

/**
 * Build the Cognito Hosted UI logout URL.
 */
export function getLogoutUrl(): string {
  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    logout_uri: COGNITO_LOGOUT_URI,
  });
  return `${COGNITO_DOMAIN}/logout?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Token Exchange
// ---------------------------------------------------------------------------

export interface TokenResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

/**
 * Exchange authorization code for tokens via Cognito token endpoint.
 */
export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: COGNITO_CLIENT_ID,
    code,
    redirect_uri: COGNITO_REDIRECT_URI,
  });

  const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Session Helpers (client-side)
// ---------------------------------------------------------------------------

/**
 * Check whether the current session is authenticated by calling
 * the auth API route.
 */
export async function checkAuth(): Promise<{
  authenticated: boolean;
  user?: { email: string; sub: string; groups: string[] };
}> {
  try {
    const response = await fetch('/api/auth', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return { authenticated: false };
    }

    const data = await response.json();
    return { authenticated: true, user: data.user };
  } catch {
    return { authenticated: false };
  }
}

/**
 * Log out by clearing the auth cookie and redirecting to Cognito logout.
 */
export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth', {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    // Ignore errors - we redirect regardless
  }
  window.location.href = getLogoutUrl();
}
