// ──────────────────────────────────────────────
// Cognito Hosted UI auth for Portal users
// ──────────────────────────────────────────────

const COGNITO_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '';
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '';
const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3002';
const REDIRECT_URI = `${PORTAL_URL}/callback`;

export interface TokenPayload {
  sub: string;
  email: string;
  given_name: string;
  family_name: string;
  'custom:org_ids': string;
  'custom:primary_org_id': string;
  'custom:role': string;
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

/**
 * Build the Cognito Hosted UI login URL
 */
export function getLoginUrl(): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile email',
  });
  return `${COGNITO_DOMAIN}/login?${params.toString()}`;
}

/**
 * Build the Cognito logout URL
 */
export function getLogoutUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    logout_uri: `${PORTAL_URL}/login`,
  });
  return `${COGNITO_DOMAIN}/logout?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens via our API route
 */
export async function exchangeCodeForTokens(code: string): Promise<boolean> {
  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri: REDIRECT_URI }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Parse JWT payload without verification (client-side only).
 * Verification happens server-side in middleware.
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
    const response = await fetch('/api/auth', { method: 'GET' });
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

  return {
    userId: payload.sub,
    email: payload.email,
    firstName: payload.given_name || '',
    lastName: payload.family_name || '',
    orgIds: (payload['custom:org_ids'] || '').split(',').filter(Boolean),
    primaryOrgId: payload['custom:primary_org_id'] || '',
    role: payload['custom:role'] || 'agent',
  };
}

/**
 * Logout - clear cookies and redirect
 */
export async function logout(): Promise<void> {
  await fetch('/api/auth', { method: 'DELETE' });
  window.location.href = getLogoutUrl();
}
