/**
 * Admin Authentication Library
 *
 * Implements Cognito Hosted UI OAuth2 authorization code flow.
 * Tokens are stored in httpOnly cookies via API route for security.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_REDIRECT_URI = 'http://localhost:3001/callback';
const DEFAULT_LOGOUT_URI = 'http://localhost:3001/login';

import { API_ENDPOINTS, STORAGE_KEYS } from './constants';

// Session storage key for OAuth state (CSRF protection)
const OAUTH_STATE_KEY = STORAGE_KEYS.OAUTH_STATE;
const PKCE_VERIFIER_KEY = 'pkce_code_verifier';

// State expiration time (5 minutes)
const STATE_EXPIRY_MS = 5 * 60 * 1000;

interface OAuthState {
  nonce: string;
  timestamp: number;
}

interface CognitoConfig {
  domain: string;
  clientId: string;
}

const FALLBACK_DEV_COGNITO_CONFIG: CognitoConfig = {
  domain: 'https://kanjona-admin-dev.auth.us-east-1.amazoncognito.com',
  clientId: 'jt92k3a0go8o1b50nup1c5f8e',
};

const FALLBACK_PROD_COGNITO_CONFIG: CognitoConfig = {
  domain: 'https://kanjona-platform-admin.auth.us-east-1.amazoncognito.com',
  clientId: '71fvarr8d96ln8k4futiegnd7r',
};

function getAppOrigin(): string | null {
  if (typeof window === 'undefined') return null;
  return window.location.origin;
}

function resolveCognitoConfig(): CognitoConfig {
  const envDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '';
  const envClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '';

  const devDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN_DEV || '';
  const devClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID_DEV || '';
  const prodDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN_PROD || '';
  const prodClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID_PROD || '';

  if (typeof window === 'undefined') {
    return {
      domain: envDomain || prodDomain || devDomain,
      clientId: envClientId || prodClientId || devClientId,
    };
  }

  const host = window.location.hostname.toLowerCase();

  if (host === 'admin.kanjona.com') {
    return {
      domain: prodDomain || envDomain || FALLBACK_PROD_COGNITO_CONFIG.domain,
      clientId: prodClientId || envClientId || FALLBACK_PROD_COGNITO_CONFIG.clientId,
    };
  }

  if (host === 'admin.dev.kanjona.com' || host === 'localhost' || host === '127.0.0.1') {
    return {
      domain: devDomain || envDomain || FALLBACK_DEV_COGNITO_CONFIG.domain,
      clientId: devClientId || envClientId || FALLBACK_DEV_COGNITO_CONFIG.clientId,
    };
  }

  if (host.includes('.dev.')) {
    return {
      domain: devDomain || envDomain || FALLBACK_DEV_COGNITO_CONFIG.domain,
      clientId: devClientId || envClientId || FALLBACK_DEV_COGNITO_CONFIG.clientId,
    };
  }

  if (envDomain && envClientId) {
    return { domain: envDomain, clientId: envClientId };
  }

  return {
    domain: prodDomain || FALLBACK_PROD_COGNITO_CONFIG.domain,
    clientId: prodClientId || FALLBACK_PROD_COGNITO_CONFIG.clientId,
  };
}

function getRedirectUri(): string {
  const origin = getAppOrigin();
  if (origin) {
    // Use trailing slash to match Next.js trailingSlash: true config
    return `${origin}/callback/`;
  }
  return process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI || DEFAULT_REDIRECT_URI;
}

function getLogoutUri(): string {
  const origin = getAppOrigin();
  if (origin) {
    // Use trailing slash to match Next.js trailingSlash: true config
    return `${origin}/login/`;
  }
  return process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI || DEFAULT_LOGOUT_URI;
}

export function isAuthConfigured(): boolean {
  const config = resolveCognitoConfig();
  return Boolean(config.domain && config.clientId);
}

// ---------------------------------------------------------------------------
// OAuth State Parameter (CSRF Protection) & PKCE
// ---------------------------------------------------------------------------

/**
 * Generate a random string for PKCE code verifier
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate PKCE code challenge from verifier (S256)
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return base64;
}

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
 * Uses PKCE for public client security.
 */
export async function getLoginUrl(): Promise<string> {
  const { domain, clientId } = resolveCognitoConfig();
  const state = generateState();
  const redirectUri = getRedirectUri();
  
  // PKCE setup
  const codeVerifier = generateCodeVerifier();
  sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${domain}/login?${params.toString()}`;
}

/**
 * Build the Cognito Hosted UI logout URL.
 */
export function getLogoutUrl(): string {
  const { domain, clientId } = resolveCognitoConfig();
  const logoutUri = getLogoutUri();
  const params = new URLSearchParams({
    client_id: clientId,
    logout_uri: logoutUri,
  });
  return `${domain}/logout?${params.toString()}`;
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
 * Exchange authorization code for tokens via backend API (server-side).
 * This avoids CORS issues by having the backend call Cognito directly.
 * Returns success status and optional error message.
 */
export async function exchangeCodeForTokens(code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const redirectUri = getRedirectUri();
    const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);

    console.log('[Auth] Config:', { redirectUri, hasCodeVerifier: !!codeVerifier });

    // Clean up PKCE verifier before the request (in case of redirect/reload)
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);

    // Exchange code for tokens via backend API (server-side token exchange)
    // This avoids CORS issues since the backend calls Cognito directly
    const callbackEndpoint = `${API_ENDPOINTS.AUTH}/callback`;
    console.log('[Auth] Exchanging code via backend:', callbackEndpoint);

    const response = await fetch(callbackEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        code,
        redirectUri,
        codeVerifier: codeVerifier || undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Auth] Token exchange failed:', response.status, errorText);
      try {
        const errorJson = JSON.parse(errorText);
        return { success: false, error: errorJson.error || errorText };
      } catch {
        return { success: false, error: errorText };
      }
    }

    const result = await response.json();
    if (!result.success) {
      return { success: false, error: result.error || 'Token exchange failed' };
    }

    console.log('[Auth] Token exchange success');
    return { success: true };
  } catch (error) {
    console.error('[Auth] Token exchange error:', error);
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown network error' };
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
  sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  window.location.href = getLogoutUrl();
}
