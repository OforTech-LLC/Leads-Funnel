/**
 * Auth Handler
 *
 * Handles /auth/admin and /auth/portal endpoints for:
 * - POST /auth/{type}/callback: Exchange OAuth code for tokens (server-side)
 * - POST /auth/{type}: Store tokens in httpOnly cookie after OAuth code exchange
 * - GET /auth/{type}: Check authentication status and return user info
 * - DELETE /auth/{type}: Clear auth cookie (logout)
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { verifyJwt, type JwtClaims } from '../lib/auth/jwt.js';
import { buildCorsHeaders as buildCors } from '../lib/cors.js';
import { createLogger } from '../lib/logging.js';
import { HTTP_STATUS, CONTENT_TYPES } from '../lib/constants.js';

const log = createLogger('auth-handler');

// Cognito configuration (supports both naming conventions for backward compatibility)
const COGNITO_CONFIG = {
  admin: {
    domain:
      process.env.ADMIN_COGNITO_DOMAIN ||
      process.env.COGNITO_ADMIN_DOMAIN ||
      'https://kanjona-admin-dev.auth.us-east-1.amazoncognito.com',
    clientId:
      process.env.ADMIN_COGNITO_CLIENT_ID ||
      process.env.COGNITO_ADMIN_CLIENT_ID ||
      'jt92k3a0go8o1b50nup1c5f8e',
  },
  portal: {
    domain:
      process.env.PORTAL_COGNITO_DOMAIN ||
      process.env.COGNITO_PORTAL_DOMAIN ||
      'https://kanjona-portal-dev.auth.us-east-1.amazoncognito.com',
    clientId:
      process.env.PORTAL_COGNITO_CLIENT_ID ||
      process.env.COGNITO_PORTAL_CLIENT_ID ||
      '',
  },
};

// Cookie names
const ADMIN_COOKIE_NAME = 'admin_token';
const PORTAL_COOKIE_NAME = 'portal_token';

// Cookie settings
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

interface TokenPayload {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresIn: number;
}

// =============================================================================
// Response Helpers
// =============================================================================

function buildCorsHeaders(requestOrigin?: string): Record<string, string> {
  return buildCors(requestOrigin, {
    allowMethods: 'GET,POST,DELETE,OPTIONS',
    allowHeaders: 'content-type,authorization,x-csrf-token,x-request-id',
    contentType: CONTENT_TYPES.JSON,
    allowFallbackOrigin: true,
  });
}

function jsonResponse(
  statusCode: number,
  body: object,
  headers: Record<string, string> = {}
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

function setCookieHeader(
  name: string,
  value: string,
  maxAge: number,
  _isProduction: boolean
): string {
  // SameSite=None is required for cross-origin requests (admin.kanjona.com -> api.kanjona.com)
  // Secure is required when using SameSite=None
  const parts = [`${name}=${value}`, `Path=/`, `Max-Age=${maxAge}`, `HttpOnly`, `SameSite=None`, `Secure`];
  return parts.join('; ');
}

function clearCookieHeader(name: string, _isProduction: boolean): string {
  // SameSite=None is required for cross-origin requests
  // Secure is required when using SameSite=None
  const parts = [`${name}=`, `Path=/`, `Max-Age=0`, `HttpOnly`, `SameSite=None`, `Secure`];
  return parts.join('; ');
}

function getCookie(event: APIGatewayProxyEventV2, name: string): string | null {
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split('=');
    if (cookieName === name) {
      return cookieValue || null;
    }
  }
  return null;
}

// =============================================================================
// Token Verification
// =============================================================================

async function verifyToken(
  token: string,
  type: 'admin' | 'portal'
): Promise<{ valid: true; claims: JwtClaims } | { valid: false; error: string }> {
  const envPrefix = type === 'admin' ? 'ADMIN_' : 'PORTAL_';
  const issuer = process.env[`${envPrefix}COGNITO_ISSUER`] || process.env.COGNITO_ISSUER || '';
  const audience =
    process.env[`${envPrefix}COGNITO_CLIENT_ID`] || process.env.COGNITO_CLIENT_ID || '';

  if (!issuer) {
    return { valid: false, error: 'Authentication not configured' };
  }

  try {
    const claims = await verifyJwt(token, issuer, audience || undefined);
    return { valid: true, claims };
  } catch (err) {
    log.warn('auth.verifyToken.failed', { type, error: err });
    return { valid: false, error: 'Invalid or expired token' };
  }
}

// =============================================================================
// Token Exchange Types
// =============================================================================

interface TokenExchangeRequest {
  code: string;
  redirectUri: string;
  codeVerifier?: string;
}

interface CognitoTokenResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

// =============================================================================
// Server-Side Token Exchange (Callback Handler)
// =============================================================================

async function handleCallback(
  event: APIGatewayProxyEventV2,
  type: 'admin' | 'portal'
): Promise<APIGatewayProxyResultV2> {
  const requestOrigin = event.headers?.origin || event.headers?.Origin;
  const headers = buildCorsHeaders(requestOrigin);
  const isProduction = event.headers?.host?.includes('kanjona.com') || false;
  const cookieName = type === 'admin' ? ADMIN_COOKIE_NAME : PORTAL_COOKIE_NAME;
  const config = COGNITO_CONFIG[type];

  try {
    const body = event.body ? JSON.parse(event.body) : null;
    if (!body || !body.code || !body.redirectUri) {
      log.warn('auth.callback.missingParams', { type, hasCode: !!body?.code, hasRedirect: !!body?.redirectUri });
      return jsonResponse(HTTP_STATUS.BAD_REQUEST, { success: false, error: 'Missing code or redirectUri' }, headers);
    }

    const { code, redirectUri, codeVerifier } = body as TokenExchangeRequest;

    log.info('auth.callback.exchanging', { type, redirectUri, hasCodeVerifier: !!codeVerifier });

    // Build the token exchange request
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', config.clientId);
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    if (codeVerifier) {
      params.append('code_verifier', codeVerifier);
    }

    // Call Cognito token endpoint
    const tokenUrl = `${config.domain}/oauth2/token`;
    log.info('auth.callback.tokenRequest', { type, tokenUrl, clientId: config.clientId });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      log.error('auth.callback.tokenError', { type, status: tokenResponse.status, error: errorText });
      return jsonResponse(HTTP_STATUS.BAD_REQUEST, { success: false, error: `Token exchange failed: ${errorText}` }, headers);
    }

    const tokens = (await tokenResponse.json()) as CognitoTokenResponse;
    log.info('auth.callback.tokenSuccess', { type, expiresIn: tokens.expires_in });

    // Verify the access token
    const result = await verifyToken(tokens.access_token, type);
    if (!result.valid) {
      log.error('auth.callback.verifyFailed', { type, error: result.error });
      return jsonResponse(HTTP_STATUS.UNAUTHORIZED, { success: false, error: result.error }, headers);
    }

    // Store the access token in httpOnly cookie
    const maxAge = Math.min(tokens.expires_in, COOKIE_MAX_AGE);

    log.info('auth.callback.complete', { type, email: result.claims.email });

    return {
      statusCode: HTTP_STATUS.OK,
      headers: {
        ...headers,
        'Set-Cookie': setCookieHeader(cookieName, tokens.access_token, maxAge, isProduction),
      },
      body: JSON.stringify({
        success: true,
        user: {
          email: result.claims.email || result.claims['cognito:username'],
          sub: result.claims.sub,
          groups: result.claims['cognito:groups'] || [],
        },
      }),
    };
  } catch (err) {
    log.error('auth.callback.error', { type, error: err });
    return jsonResponse(HTTP_STATUS.INTERNAL_ERROR, { success: false, error: 'Token exchange failed' }, headers);
  }
}

// =============================================================================
// Route Handlers
// =============================================================================

async function handlePost(
  event: APIGatewayProxyEventV2,
  type: 'admin' | 'portal'
): Promise<APIGatewayProxyResultV2> {
  const requestOrigin = event.headers?.origin || event.headers?.Origin;
  const headers = buildCorsHeaders(requestOrigin);
  const isProduction = event.headers?.host?.includes('kanjona.com') || false;
  const cookieName = type === 'admin' ? ADMIN_COOKIE_NAME : PORTAL_COOKIE_NAME;

  try {
    const body = event.body ? JSON.parse(event.body) : null;
    if (!body || !body.accessToken) {
      return jsonResponse(HTTP_STATUS.BAD_REQUEST, { message: 'Missing accessToken' }, headers);
    }

    const payload = body as TokenPayload;

    // Verify the token before storing
    const result = await verifyToken(payload.accessToken, type);
    if (!result.valid) {
      return jsonResponse(HTTP_STATUS.UNAUTHORIZED, { message: result.error }, headers);
    }

    // Set the cookie with the access token
    const cookieValue = payload.accessToken;
    const maxAge = payload.expiresIn || COOKIE_MAX_AGE;

    log.info('auth.storeToken', { type, email: result.claims.email });

    return {
      statusCode: HTTP_STATUS.OK,
      headers: {
        ...headers,
        'Set-Cookie': setCookieHeader(cookieName, cookieValue, maxAge, isProduction),
      },
      body: JSON.stringify({
        ok: true,
        user: {
          email: result.claims.email || result.claims['cognito:username'],
          sub: result.claims.sub,
          groups: result.claims['cognito:groups'] || [],
        },
      }),
    };
  } catch (err) {
    log.error('auth.storeToken.error', { type, error: err });
    return jsonResponse(HTTP_STATUS.BAD_REQUEST, { message: 'Invalid request body' }, headers);
  }
}

async function handleGet(
  event: APIGatewayProxyEventV2,
  type: 'admin' | 'portal'
): Promise<APIGatewayProxyResultV2> {
  const requestOrigin = event.headers?.origin || event.headers?.Origin;
  const headers = buildCorsHeaders(requestOrigin);
  const cookieName = type === 'admin' ? ADMIN_COOKIE_NAME : PORTAL_COOKIE_NAME;

  const token = getCookie(event, cookieName);
  if (!token) {
    return jsonResponse(HTTP_STATUS.UNAUTHORIZED, { authenticated: false }, headers);
  }

  const result = await verifyToken(token, type);
  if (!result.valid) {
    return jsonResponse(
      HTTP_STATUS.UNAUTHORIZED,
      { authenticated: false, error: result.error },
      headers
    );
  }

  return jsonResponse(
    HTTP_STATUS.OK,
    {
      authenticated: true,
      user: {
        email: result.claims.email || result.claims['cognito:username'],
        sub: result.claims.sub,
        groups: result.claims['cognito:groups'] || [],
      },
    },
    headers
  );
}

async function handleDelete(
  event: APIGatewayProxyEventV2,
  type: 'admin' | 'portal'
): Promise<APIGatewayProxyResultV2> {
  const requestOrigin = event.headers?.origin || event.headers?.Origin;
  const headers = buildCorsHeaders(requestOrigin);
  const isProduction = event.headers?.host?.includes('kanjona.com') || false;
  const cookieName = type === 'admin' ? ADMIN_COOKIE_NAME : PORTAL_COOKIE_NAME;

  log.info('auth.logout', { type });

  return {
    statusCode: HTTP_STATUS.OK,
    headers: {
      ...headers,
      'Set-Cookie': clearCookieHeader(cookieName, isProduction),
    },
    body: JSON.stringify({ ok: true }),
  };
}

// =============================================================================
// Main Handler
// =============================================================================

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const path = event.requestContext.http.path;
  const method = event.requestContext.http.method;
  const requestOrigin = event.headers?.origin || event.headers?.Origin;

  log.info('auth.request', { method, path });

  // Determine auth type and sub-route from path
  let type: 'admin' | 'portal';
  let isCallback = false;

  if (path === '/auth/admin' || path === '/auth/admin/') {
    type = 'admin';
  } else if (path === '/auth/admin/callback' || path === '/auth/admin/callback/') {
    type = 'admin';
    isCallback = true;
  } else if (path === '/auth/portal' || path === '/auth/portal/') {
    type = 'portal';
  } else if (path === '/auth/portal/callback' || path === '/auth/portal/callback/') {
    type = 'portal';
    isCallback = true;
  } else {
    return jsonResponse(
      HTTP_STATUS.NOT_FOUND,
      { message: 'Not found' },
      buildCorsHeaders(requestOrigin)
    );
  }

  // Handle preflight
  if (method === 'OPTIONS') {
    return {
      statusCode: HTTP_STATUS.NO_CONTENT,
      headers: buildCorsHeaders(requestOrigin),
      body: '',
    };
  }

  // Route callback requests to the server-side token exchange handler
  if (isCallback) {
    if (method === 'POST') {
      return handleCallback(event, type);
    }
    return jsonResponse(
      HTTP_STATUS.METHOD_NOT_ALLOWED,
      { message: 'Method not allowed' },
      buildCorsHeaders(requestOrigin)
    );
  }

  // Route to standard auth handlers
  switch (method) {
    case 'POST':
      return handlePost(event, type);
    case 'GET':
      return handleGet(event, type);
    case 'DELETE':
      return handleDelete(event, type);
    default:
      return jsonResponse(
        HTTP_STATUS.METHOD_NOT_ALLOWED,
        { message: 'Method not allowed' },
        buildCorsHeaders(requestOrigin)
      );
  }
}
