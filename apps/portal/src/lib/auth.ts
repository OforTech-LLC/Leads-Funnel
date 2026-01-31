// ──────────────────────────────────────────────
// Cognito Hosted UI auth for Portal users
//
// Consistent auth patterns with apps/admin:
// - OAuth2 authorization code flow
// - httpOnly cookie token storage
// - Server-side token exchange
// - GET/POST/DELETE on /api/auth
// ──────────────────────────────────────────────

import { getAuthEndpoint, STORAGE_KEYS } from './constants';

interface CognitoConfig {
  domain: string;
  clientId: string;
}

const FALLBACK_DEV_COGNITO_CONFIG: CognitoConfig = {
  domain: 'https://kanjona-portal-dev.auth.us-east-1.amazoncognito.com',
  clientId: 'e5s3m88q4j2qobapqsfuhbhr4',
};

const FALLBACK_PROD_COGNITO_CONFIG: CognitoConfig = {
  domain: 'https://kanjona-platform-portal.auth.us-east-1.amazoncognito.com',
  clientId: '1vpb1g035mcnu57v0oa83d6q43',
};

const DEFAULT_PORTAL_URL = 'http://localhost:3002';

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

  if (host === 'portal.kanjona.com') {
    return {
      domain: prodDomain || envDomain || FALLBACK_PROD_COGNITO_CONFIG.domain,
      clientId: prodClientId || envClientId || FALLBACK_PROD_COGNITO_CONFIG.clientId,
    };
  }

  if (host === 'portal-dev.kanjona.com' || host === 'localhost' || host === '127.0.0.1') {
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

export function getCognitoConfig(): CognitoConfig {
  return resolveCognitoConfig();
}

function getPortalBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  if (process.env.NEXT_PUBLIC_PORTAL_URL) {
    return process.env.NEXT_PUBLIC_PORTAL_URL;
  }
  return DEFAULT_PORTAL_URL;
}

function getRedirectUri(): string {
  return `${getPortalBaseUrl()}/callback`;
}

export interface TokenPayload {
  sub: string;
  email: string;
  given_name: string;
  family_name: string;
  'custom:userId'?: string;
  'custom:orgIds'?: string;
  'custom:primaryOrgId'?: string;
  'custom:org_ids'?: string;
  'custom:primary_org_id'?: string;
  'custom:role'?: string;
  exp: number;
  iat: number;
}

export interface CurrentUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  orgIds: string[];
  primaryOrgId: string;
  role: string;
}

// Session storage key for OAuth state (CSRF protection)
const OAUTH_STATE_KEY = STORAGE_KEYS.OAUTH_STATE;

// State expiration time (5 minutes)
const STATE_EXPIRY_MS = 5 * 60 * 1000;

interface OAuthState {
  nonce: string;
  timestamp: number;
}

/**
 * Generate a cryptographically secure state parameter for OAuth CSRF protection.
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

export function isAuthConfigured(): boolean {
  const config = resolveCognitoConfig();
  return Boolean(config.domain && config.clientId);
}

/**
 * Build the Cognito Hosted UI login URL with state parameter
 */
export function getLoginUrl(): string {
  const { domain, clientId } = resolveCognitoConfig();
  if (!domain || !clientId) {
    return '';
  }
  const state = generateState();
  const redirectUri = getRedirectUri();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    state,
  });
  return `${domain}/login?${params.toString()}`;
}

/**
 * Build the Cognito logout URL
 */
export function getLogoutUrl(): string {
  const { domain, clientId } = resolveCognitoConfig();
  if (!domain || !clientId) {
    return '';
  }
  const portalUrl = getPortalBaseUrl();
  const params = new URLSearchParams({
    client_id: clientId,
    logout_uri: `${portalUrl}/login`,
  });
  return `${domain}/logout?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens via Cognito token endpoint,
 * then store tokens in httpOnly cookie via backend API.
 * Returns true on success, false on failure.
 */
export async function exchangeCodeForTokens(code: string): Promise<boolean> {
  try {
    const { domain, clientId } = resolveCognitoConfig();
    if (!domain || !clientId) {
      console.error('Portal auth not configured: missing Cognito domain/clientId');
      return false;
    }
    // Step 1: Exchange code for tokens with Cognito
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: getRedirectUri(),
    });

    const tokenResponse = await fetch(`${domain}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text());
      return false;
    }

    const tokens = await tokenResponse.json();

    // Step 2: Store tokens in httpOnly cookie via backend API
    const storeResponse = await fetch(getAuthEndpoint(), {
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

/**
 * Parse JWT payload without verification (client-side only).
 * Verification happens server-side in middleware.
 *
 * SECURITY WARNING: This function does NOT verify the JWT signature.
 * It is ONLY for client-side display purposes (e.g., showing user name in UI).
 * All authorization decisions MUST be made server-side.
 */
function parseJwt(token: string): TokenPayload | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Get the current authenticated user from the auth check endpoint
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const response = await fetch(getAuthEndpoint(), {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.user ?? null;
  } catch {
    return null;
  }
}

/**
 * Extract current user from a JWT token string (client-side utility)
 */
export function getUserFromToken(token: string): CurrentUser | null {
  const payload = parseJwt(token);
  if (!payload) return null;

  // Check expiration
  if (payload.exp * 1000 < Date.now()) return null;

  const orgIdsRaw = payload['custom:orgIds'] || payload['custom:org_ids'] || '';
  const primaryOrgId = payload['custom:primaryOrgId'] || payload['custom:primary_org_id'] || '';

  return {
    userId: payload['custom:userId'] || payload.sub,
    email: payload.email,
    firstName: payload.given_name || '',
    lastName: payload.family_name || '',
    orgIds: orgIdsRaw.split(',').filter(Boolean),
    primaryOrgId: primaryOrgId,
    role: payload['custom:role'] || 'agent',
  };
}

/**
 * Logout - clear httpOnly cookies via API route and redirect to Cognito logout.
 * Consistent with admin app logout pattern.
 */
export async function logout(): Promise<void> {
  try {
    await fetch(getAuthEndpoint(), {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    // Ignore errors - we redirect regardless
  }
  window.location.href = getLogoutUrl();
}
