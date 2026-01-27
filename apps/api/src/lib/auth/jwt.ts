/**
 * JWT verification using Cognito JWKS
 *
 * Verifies JWT signature via the JWKS endpoint with a 1-hour cache.
 */

import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';

// ---------------------------------------------------------------------------
// JWKS cache (1 hour)
// ---------------------------------------------------------------------------

interface JwksEntry {
  jwks: ReturnType<typeof createRemoteJWKSet>;
  expiresAt: number;
}

const JWKS_CACHE_MS = 60 * 60 * 1000; // 1 hour
const jwksCache = new Map<string, JwksEntry>();

function getJwks(issuer: string): ReturnType<typeof createRemoteJWKSet> {
  const cached = jwksCache.get(issuer);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.jwks;
  }

  const jwksUrl = `${issuer}/.well-known/jwks.json`;
  const jwks = createRemoteJWKSet(new URL(jwksUrl));

  jwksCache.set(issuer, {
    jwks,
    expiresAt: Date.now() + JWKS_CACHE_MS,
  });

  return jwks;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface JwtClaims {
  sub: string;
  email?: string;
  'cognito:username'?: string;
  'cognito:groups'?: string[];
  'custom:role'?: string;
  'custom:userId'?: string;
  'custom:orgIds'?: string;
  'custom:primaryOrgId'?: string;
  token_use?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

/**
 * Verify a JWT against a Cognito User Pool's JWKS.
 *
 * @param token   Raw JWT (without "Bearer " prefix)
 * @param poolId  Cognito User Pool region + ID, used to build issuer URL
 * @returns Verified claims payload
 * @throws If signature, issuer, audience, or expiry is invalid
 */
export async function verifyJwt(
  token: string,
  issuer: string,
  audience?: string
): Promise<JwtClaims> {
  const jwks = getJwks(issuer);

  const verifyOptions: { issuer: string; audience?: string } = { issuer };
  if (audience) {
    verifyOptions.audience = audience;
  }

  const { payload } = await jwtVerify(token, jwks, verifyOptions);

  return payload as unknown as JwtClaims;
}

/**
 * Extract claims from a JWT without verification.
 * Only use where the token has already been verified upstream.
 */
export function extractClaims(token: string): JwtClaims {
  return decodeJwt(token) as unknown as JwtClaims;
}
