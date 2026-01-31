/**
 * JWT verification using Cognito JWKS
 *
 * Verifies JWT signature via the JWKS endpoint with a 1-hour cache.
 */
import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';
const JWKS_CACHE_MS = 60 * 60 * 1000; // 1 hour
const jwksCache = new Map();
function getJwks(issuer) {
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
/**
 * Verify a JWT against a Cognito User Pool's JWKS.
 *
 * @param token   Raw JWT (without "Bearer " prefix)
 * @param poolId  Cognito User Pool region + ID, used to build issuer URL
 * @returns Verified claims payload
 * @throws If signature, issuer, audience, or expiry is invalid
 */
export async function verifyJwt(token, issuer, audience) {
    const jwks = getJwks(issuer);
    // Cognito access tokens don't have 'aud' claim, they use 'client_id'
    // We need to skip the default audience validation and handle it manually
    const { payload } = await jwtVerify(token, jwks, {
        issuer,
        // Skip audience validation - Cognito access tokens use client_id instead
        audience: undefined,
    });
    // Verify token_use if present (Cognito-specific)
    const tokenUse = payload.token_use;
    if (tokenUse && tokenUse !== 'access' && tokenUse !== 'id') {
        throw new Error('Invalid token_use claim');
    }
    // Manual audience/client_id validation for Cognito compatibility
    if (audience) {
        const aud = payload.aud;
        const clientId = payload.client_id;
        const azp = payload.azp;
        const audMatches = typeof aud === 'string'
            ? aud === audience
            : Array.isArray(aud)
                ? aud.includes(audience)
                : false;
        const clientMatches = clientId === audience || azp === audience;
        if (!audMatches && !clientMatches) {
            throw new Error('JWT audience mismatch');
        }
    }
    return payload;
}
/**
 * Extract claims from a JWT without verification.
 * Only use where the token has already been verified upstream.
 */
export function extractClaims(token) {
    return decodeJwt(token);
}
//# sourceMappingURL=jwt.js.map