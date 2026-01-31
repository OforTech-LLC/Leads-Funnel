/**
 * Admin Authentication
 *
 * Handles Cognito authentication flow and token management for the admin console.
 * Tokens are stored in httpOnly cookies for security (not accessible via JavaScript).
 *
 * This module implements the OAuth2 authorization code flow with:
 * - CSRF protection via state parameter with timestamp and expiration
 * - Secure token storage in httpOnly cookies
 * - Automatic token refresh
 * - Server-side token validation
 *
 * Security Note: The parseIdToken function does NOT verify JWT signatures because
 * it is only used for client-side display purposes. All authorization decisions
 * are made server-side where tokens are properly verified with Cognito's JWKS.
 */

import { getAdminConfig, buildLoginUrl, buildLogoutUrl, buildTokenUrl } from './config';
import { csrfTokenManager } from '../csrf';
import { getApiBaseUrl } from '../runtime-config';

/**
 * Represents an authenticated admin user with their profile and permissions.
 */
export interface AdminUser {
  /** Unique user identifier from Cognito */
  sub: string;
  /** User's email address */
  email: string;
  /** Cognito groups the user belongs to */
  groups: string[];
  /** Computed role based on group membership */
  role: 'Admin' | 'Viewer';
}

/**
 * OAuth2 tokens received from Cognito token endpoint.
 */
export interface AuthTokens {
  /** Short-lived token for API authorization */
  accessToken: string;
  /** Token containing user claims and profile info */
  idToken: string;
  /** Long-lived token for obtaining new access tokens */
  refreshToken: string;
  /** Unix timestamp (ms) when the access token expires */
  expiresAt: number;
}

// Session storage key for CSRF state (safe - not sensitive)
const AUTH_STATE_KEY = 'auth_state';
const PKCE_VERIFIER_KEY = 'pkce_code_verifier';

// State expiration time (5 minutes)
// Security: Short window limits replay attack opportunity
const STATE_EXPIRY_MS = 5 * 60 * 1000;

/**
 * State parameter structure with timestamp for expiration checking
 */
interface AuthState {
  /** Random nonce for CSRF protection */
  nonce: string;
  /** Timestamp when state was created */
  timestamp: number;
}

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
 * Initiates the Cognito login flow by redirecting to the hosted UI.
 *
 * OAuth2 Flow Step 1: Authorization Request
 * - Generates cryptographically secure state parameter for CSRF protection
 * - State includes timestamp for expiration validation
 * - Stores state in sessionStorage (cleared on tab close)
 *
 * Security: State parameter prevents CSRF attacks where an attacker
 * tricks a user into completing an OAuth flow initiated by the attacker.
 */
export async function redirectToLogin(): Promise<void> {
  const config = getAdminConfig();
  const state = generateState();
  sessionStorage.setItem(AUTH_STATE_KEY, state);

  // PKCE setup
  const codeVerifier = generateCodeVerifier();
  sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  window.location.href = buildLoginUrl(config, state, {
    codeChallenge,
    codeChallengeMethod: 'S256',
  });
}

/**
 * Logs out the user by clearing auth state and redirecting to Cognito logout.
 *
 * Security: Clears both local state and Cognito session to ensure complete logout.
 * This prevents session fixation attacks where old sessions remain valid.
 */
export async function redirectToLogout(): Promise<void> {
  await clearAuth();
  const config = getAdminConfig();
  window.location.href = buildLogoutUrl(config);
}

/**
 * Exchanges an authorization code for access and refresh tokens.
 *
 * OAuth2 Flow Step 2: Token Exchange
 * - Called after Cognito redirects back with authorization code
 * - Exchanges code for tokens via Cognito token endpoint
 * - Stores tokens in httpOnly cookie via server API route
 *
 * Security Measures:
 * - CSRF token required for the cookie storage API call
 * - Tokens stored in httpOnly cookies (not accessible to JavaScript)
 * - Code can only be used once (enforced by Cognito)
 *
 * @param code - The authorization code from the callback URL
 * @returns The complete auth tokens including access, ID, and refresh tokens
 * @throws Error if the token exchange fails
 */
export async function exchangeCodeForTokens(code: string): Promise<AuthTokens> {
  const config = getAdminConfig();
  const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.cognitoClientId,
    code,
    redirect_uri: config.redirectUri,
  });

  if (codeVerifier) {
    params.append('code_verifier', codeVerifier);
  }

  // Exchange code with Cognito using standard OAuth2 token endpoint
  const response = await fetch(buildTokenUrl(config), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  // Clean up PKCE verifier
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();

  const tokens: AuthTokens = {
    accessToken: data.access_token,
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  // Security: CSRF token prevents cross-site request to store tokens
  const csrfToken = await csrfTokenManager.getToken();

  // Store tokens in httpOnly cookie via backend API
  // Security: httpOnly prevents XSS attacks from stealing tokens
  // Security: credentials: 'include' ensures cookies are sent/received
  const apiUrl = getApiBaseUrl();
  const cookieResponse = await fetch(`${apiUrl}/auth/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    credentials: 'include',
    body: JSON.stringify({
      accessToken: tokens.accessToken,
      idToken: tokens.idToken,
      refreshToken: tokens.refreshToken,
      expiresIn: data.expires_in,
    }),
  });

  if (!cookieResponse.ok) {
    throw new Error('Failed to store authentication tokens');
  }

  return tokens;
}

/**
 * Refreshes the access token using the stored refresh token.
 *
 * Token Refresh Flow:
 * 1. Check current auth status from server
 * 2. If tokens need refresh, call refresh endpoint
 * 3. Server reads refresh token from httpOnly cookie
 * 4. Server exchanges refresh token with Cognito for new tokens
 * 5. Server updates httpOnly cookie with new tokens
 *
 * Security: Refresh tokens are long-lived and stored securely server-side.
 * If refresh fails (token revoked/expired), user must re-authenticate.
 *
 * @returns New auth tokens if successful, null if refresh failed
 */
export async function refreshTokens(): Promise<AuthTokens | null> {
  try {
    // Check current auth status from server
    const apiUrl = getApiBaseUrl();
    const statusResponse = await fetch(`${apiUrl}/auth/admin`, {
      method: 'GET',
      credentials: 'include',
    });

    const status = await statusResponse.json();

    if (!status.authenticated && !status.needsRefresh) {
      return null;
    }

    // Request token refresh - server reads refresh token from httpOnly cookie
    const tokenResponse = await fetch(`${apiUrl}/auth/admin/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!tokenResponse.ok) {
      console.warn('[Auth] Token refresh failed with status:', tokenResponse.status);
      await clearAuth();
      return null;
    }

    const data = await tokenResponse.json();
    if (!data.success) {
      console.warn('[Auth] Token refresh unsuccessful:', data.error || 'Unknown error');
      await clearAuth();
      return null;
    }

    return {
      accessToken: data.accessToken,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
    };
  } catch (error) {
    console.error(
      '[Auth] Token refresh error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    await clearAuth();
    return null;
  }
}

/**
 * Checks authentication status from the server.
 *
 * This makes a server request to verify the httpOnly cookie contains valid tokens.
 *
 * @returns Object containing authentication status and token expiration info
 */
export async function checkAuthStatus(): Promise<{
  authenticated: boolean;
  expiresAt?: number;
  needsRefresh?: boolean;
}> {
  if (typeof window === 'undefined') {
    return { authenticated: false };
  }

  try {
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/auth/admin`, {
      method: 'GET',
      credentials: 'include',
    });

    return await response.json();
  } catch (error) {
    console.warn(
      '[Auth] Failed to check auth status:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return { authenticated: false };
  }
}

/**
 * Checks if the user is currently authenticated.
 *
 * This is an async check that verifies tokens server-side.
 * For performance-critical code, consider caching the result.
 *
 * @returns True if the user has valid authentication tokens
 */
export async function isAuthenticated(): Promise<boolean> {
  const status = await checkAuthStatus();
  return status.authenticated;
}

/**
 * Gets a valid access token for API calls.
 *
 * Security: Since tokens are stored in httpOnly cookies, JavaScript cannot
 * directly access them. This function fetches the token from a server endpoint
 * that reads the httpOnly cookie and returns the access token.
 *
 * Note: The returned token should only be used for immediate API calls and
 * not stored in client-side state.
 *
 * @returns A valid access token or null if unavailable
 */
export async function getAccessToken(): Promise<string | null> {
  try {
  const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/auth/admin/token`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      console.warn('[Auth] Failed to get access token, status:', response.status);
      return null;
    }

    const data = await response.json();
    return data.accessToken || null;
  } catch (error) {
    console.error(
      '[Auth] Error fetching access token:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return null;
  }
}

/**
 * Gets the current user information from the server.
 *
 * The server parses the ID token from the httpOnly cookie and returns
 * the user profile with verified claims.
 *
 * @returns The authenticated user profile or null if not authenticated
 */
export async function getCurrentUser(): Promise<AdminUser | null> {
  try {
  const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/auth/admin/user`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      console.warn('[Auth] Failed to get current user, status:', response.status);
      return null;
    }

    const data = await response.json();
    return data.user || null;
  } catch (error) {
    console.error(
      '[Auth] Error fetching user info:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return null;
  }
}

/**
 * Clears all authentication state (logs out the user).
 *
 * Security: Performs cleanup in both locations:
 * 1. Server-side: Clears httpOnly cookie
 * 2. Client-side: Clears sessionStorage state
 *
 * Best-effort cleanup that does not throw to ensure partial cleanup
 * still occurs even if one step fails.
 */
export async function clearAuth(): Promise<void> {
  // Clear server-side cookie
  try {
    // Security: CSRF token required even for logout to prevent CSRF logout attacks
    const csrfToken = await csrfTokenManager.getToken();
  const apiUrl = getApiBaseUrl();

    await fetch(`${apiUrl}/auth/admin`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'X-CSRF-Token': csrfToken,
      },
    });

    // Clear the CSRF token cache since session is ending
    csrfTokenManager.clearToken();
  } catch (error) {
    // Log but don't throw - cleanup should be best effort
    console.warn(
      '[Auth] Failed to clear server-side auth:',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }

  // Clear client-side state
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(AUTH_STATE_KEY);
  }
}

/**
 * Generates a cryptographically secure random state string with timestamp
 * for CSRF protection and expiration checking.
 *
 * Security:
 * - Uses crypto.getRandomValues() for cryptographic randomness (256 bits)
 * - Includes timestamp to enforce expiration window
 * - Base64 encoded for safe URL transport
 *
 * @returns A base64-encoded JSON string containing nonce and timestamp
 */
function generateState(): string {
  // 32 bytes = 256 bits of entropy - sufficient for CSRF protection
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const nonce = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');

  const state: AuthState = {
    nonce,
    timestamp: Date.now(),
  };

  // Base64 encode for URL-safe transport
  return btoa(JSON.stringify(state));
}

/**
 * Extracts user information from a JWT ID token.
 *
 * SECURITY WARNING: This function does NOT verify the JWT signature.
 * It is ONLY for client-side display purposes (e.g., showing user email in UI).
 *
 * All authorization decisions MUST be made server-side where tokens are
 * properly verified using Cognito's JWKS endpoint. The server-side auth
 * in `/apps/api/src/admin/lib/auth.ts` uses the `jose` library to properly
 * verify JWT signatures before trusting claims.
 *
 * @param idToken - The JWT ID token from Cognito
 * @returns The extracted user profile (unverified - display only)
 * @throws Error if the token format is invalid (not a valid JWT structure)
 */
export function parseIdToken(idToken: string): AdminUser {
  // JWT structure: header.payload.signature
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid ID token format');
  }

  // Decode payload (middle part) - base64 decode only, NO signature verification
  const payload = JSON.parse(atob(parts[1]));

  // Extract Cognito groups from custom claim
  const groups: string[] = payload['cognito:groups'] || [];
  // Determine role based on highest privilege group
  const role = groups.includes('Admin') ? 'Admin' : 'Viewer';

  return {
    sub: payload.sub,
    email: payload.email || '',
    groups,
    role,
  };
}

/**
 * Verifies the state parameter from the OAuth callback for CSRF protection.
 *
 * Security Validations:
 * 1. State matches the stored value (prevents CSRF)
 * 2. State has not expired (5 minute max window)
 * 3. Timestamp is not in the future (clock skew protection)
 * 4. State is immediately removed to prevent replay attacks
 *
 * The state is removed BEFORE validation completes to ensure it cannot
 * be reused even if this tab is duplicated or back button is pressed.
 *
 * @param state - The state parameter from the callback URL
 * @returns True if the state is valid and not expired
 */
export function verifyState(state: string): boolean {
  const storedState = sessionStorage.getItem(AUTH_STATE_KEY);

  // Security: Remove state IMMEDIATELY to prevent replay attacks
  // This happens regardless of whether verification succeeds
  sessionStorage.removeItem(AUTH_STATE_KEY);

  if (!storedState || storedState !== state) {
    console.warn('[Auth] State mismatch or missing stored state');
    return false;
  }

  try {
    // Decode and parse the state
    const decoded = JSON.parse(atob(state)) as AuthState;

    // Check required fields
    if (!decoded.nonce || !decoded.timestamp) {
      console.warn('[Auth] Invalid state format - missing required fields');
      return false;
    }

    // Check expiration (5 minute max)
    const now = Date.now();
    const age = now - decoded.timestamp;

    if (age > STATE_EXPIRY_MS) {
      console.warn('[Auth] State expired:', {
        ageMs: age,
        maxAgeMs: STATE_EXPIRY_MS,
      });
      return false;
    }

    // Security: Reject future timestamps (with 1 minute tolerance for clock skew)
    // Prevents manipulation of timestamp to extend state validity
    if (decoded.timestamp > now + 60000) {
      console.warn('[Auth] State timestamp is in the future');
      return false;
    }

    return true;
  } catch (error) {
    console.warn(
      '[Auth] Failed to parse state:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return false;
  }
}
