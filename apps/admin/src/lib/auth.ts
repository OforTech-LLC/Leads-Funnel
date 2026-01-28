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
  process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI || 'http://localhost:3001/callback';
const COGNITO_LOGOUT_URI =
  process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI || 'http://localhost:3001/login';

import { API_ENDPOINTS, STORAGE_KEYS } from './constants';

// Session storage key for OAuth state (CSRF protection)
const OAUTH_STATE_KEY = STORAGE_KEYS.OAUTH_STATE;

// State expiration time (5 minutes)
const STATE_EXPIRY_MS = 5 * 60 * 1000;

interface OAuthState {
  nonce: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// OAuth State Parameter (CSRF Protection)
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically secure state parameter for OAuth CSRF protection.
 * Also stores the state in a cookie for server-side verification in the callback route.
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const nonce = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');

  const state: OAuthState = {
    nonce,
    timestamp: Date.now(),
  };

  const encoded = btoa(JSON.stringify(state));
  sessionStorage.setItem(OAUTH_STATE_KEY, encoded);

  // Also set as a cookie for server-side callback verification
  document.cookie = `oauth_state=${encoded}; path=/; max-age=300; SameSite=Lax${
    window.location.protocol === 'https:' ? '; Secure' : ''
  }`;

  return encoded;
}

/**
 * Verify the state parameter from the OAuth callback.
 * Returns true if the state matches stored value and is not expired.
 */
export function verifyState(state: string): boolean {
  const stored = sessionStorage.getItem(OAUTH_STATE_KEY);

  // Security: Remove state immediately to prevent replay attacks
  sessionStorage.removeItem(OAUTH_STATE_KEY);

  // Also clear the cookie
  document.cookie = 'oauth_state=; path=/; max-age=0';

  if (!stored || stored !== state) {
    return false;
  }

  try {
    const decoded = JSON.parse(atob(state)) as OAuthState;

    if (!decoded.nonce || !decoded.timestamp) {
      return false;
    }

    const now = Date.now();
    const age = now - decoded.timestamp;

    // Check expiration (5 minute max)
    if (age > STATE_EXPIRY_MS) {
      return false;
    }

    // Reject future timestamps (with 1 minute tolerance for clock skew)
    if (decoded.timestamp > now + 60000) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Login / Logout URLs
// ---------------------------------------------------------------------------

/**
 * Build the Cognito Hosted UI login URL.
 * Uses authorization code flow (response_type=code) for security.
 * Includes state parameter for CSRF protection.
 */
export function getLoginUrl(): string {
  const state = generateState();
  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: COGNITO_REDIRECT_URI,
    state,
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
 * Exchange authorization code for tokens via Cognito token endpoint,
 * then store tokens in httpOnly cookie via backend API.
 * Returns true on success, false on failure.
 */
export async function exchangeCodeForTokens(code: string): Promise<boolean> {
  try {
    // Step 1: Exchange code for tokens with Cognito
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: COGNITO_CLIENT_ID,
      code,
      redirect_uri: COGNITO_REDIRECT_URI,
    });

    const tokenResponse = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text());
      return false;
    }

    const tokens: TokenResponse = await tokenResponse.json();

    // Step 2: Store tokens in httpOnly cookie via backend API
    const storeResponse = await fetch(API_ENDPOINTS.AUTH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        accessToken: tokens.access_token,
        idToken: tokens.id_token,
        refreshToken: tokens.refresh_token || '',
        expiresIn: tokens.expires_in,
      }),
    });

    return storeResponse.ok;
  } catch (error) {
    console.error('Token exchange error:', error);
    return false;
  }
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
    const response = await fetch(API_ENDPOINTS.AUTH, {
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
    await fetch(API_ENDPOINTS.AUTH, {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    // Ignore errors - we redirect regardless
  }
  window.location.href = getLogoutUrl();
}
