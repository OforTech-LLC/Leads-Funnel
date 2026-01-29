/**
 * Admin authentication middleware.
 *
 * Verifies admin JWT and checks email allowlist stored in SSM.
 */

import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { verifyJwt, type JwtClaims } from './jwt.js';
import type { AdminRole } from './permissions.js';
import { loadConfig } from '../config.js';
import { sha256 } from '../hash.js';
import { ADMIN_ROLES, HTTP_HEADERS } from '../constants.js';
import { getCookie } from '../handler-utils.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminIdentity {
  email: string;
  emailHash: string;
  role: AdminRole;
  sub: string;
  groups: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractBearer(event: APIGatewayProxyEventV2): string | null {
  const header =
    event.headers?.[HTTP_HEADERS.AUTHORIZATION_LOWER] ||
    event.headers?.[HTTP_HEADERS.AUTHORIZATION];
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

function extractCookieToken(event: APIGatewayProxyEventV2): string | null {
  return getCookie(event, 'admin_token');
}

function extractToken(event: APIGatewayProxyEventV2): string | null {
  return extractBearer(event) || extractCookieToken(event);
}

function determineAdminRole(groups: string[]): AdminRole {
  // Map Cognito groups to our internal roles
  if (groups.includes('Admin') || groups.includes(ADMIN_ROLES.ADMIN)) return ADMIN_ROLES.ADMIN;
  return ADMIN_ROLES.VIEWER;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Authenticate an admin user from the incoming API Gateway event.
 *
 * Flow:
 * 1. Extract Bearer token
 * 2. Verify JWT against Cognito JWKS
 * 3. Check email allowlist (from SSM, cached)
 * 4. Determine role from Cognito groups
 *
 * @returns AdminIdentity on success
 * @throws Error with message suitable for 401/403 responses
 */
export async function authenticateAdmin(event: APIGatewayProxyEventV2): Promise<AdminIdentity> {
  const token = extractToken(event);
  if (!token) {
    throw new AuthError('Missing or invalid Authorization header', 401);
  }

  const issuer = process.env.COGNITO_ISSUER || '';
  const audience = process.env.COGNITO_CLIENT_ID || '';

  if (!issuer) {
    throw new AuthError('Authentication not configured', 500);
  }

  let claims: JwtClaims;
  try {
    claims = await verifyJwt(token, issuer, audience || undefined);
  } catch {
    throw new AuthError('Invalid or expired token', 401);
  }

  const email = (claims.email || claims['cognito:username'] || '').toLowerCase().trim();
  if (!email) {
    throw new AuthError('Token missing email claim', 401);
  }

  // Check email allowlist (fail-closed: empty allowlist denies all access)
  const allowlist = await loadAdminAllowlist();
  if (allowlist.length === 0) {
    throw new AuthError('Admin access not configured - allowlist is empty', 500);
  }
  if (!allowlist.includes(email)) {
    throw new AuthError('Access denied', 403);
  }

  const groups = (claims['cognito:groups'] || []) as string[];
  const role = determineAdminRole(groups);

  return {
    email,
    emailHash: sha256(email),
    role,
    sub: claims.sub,
    groups,
  };
}

// ---------------------------------------------------------------------------
// SSM allowlist (cached)
// ---------------------------------------------------------------------------

let _allowlistCache: { emails: string[]; expiresAt: number } | null = null;
const ALLOWLIST_CACHE_MS = 5 * 60 * 1000; // 5 minutes

async function loadAdminAllowlist(): Promise<string[]> {
  if (_allowlistCache && _allowlistCache.expiresAt > Date.now()) {
    return _allowlistCache.emails;
  }

  const path = process.env.ALLOWED_EMAILS_SSM_PATH;
  if (!path) {
    throw new AuthError('ALLOWED_EMAILS_SSM_PATH not configured', 500);
  }

  try {
    const config = await loadConfig(path);
    const emails = config
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    _allowlistCache = { emails, expiresAt: Date.now() + ALLOWLIST_CACHE_MS };
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'Admin allowlist loaded successfully',
        emailCount: emails.length,
      })
    );
    return emails;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.log(
      JSON.stringify({
        level: 'error',
        message: 'Failed to load admin email allowlist from SSM',
        error: message,
      })
    );
    throw new AuthError('Failed to load admin allowlist', 500);
  }
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class AuthError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}
