/**
 * JWT verification using Cognito JWKS
 *
 * Verifies JWT signature via the JWKS endpoint with a 1-hour cache.
 */
export interface JwtClaims {
    sub: string;
    email?: string;
    'cognito:username'?: string;
    'cognito:groups'?: string[];
    'custom:role'?: string;
    'custom:userId'?: string;
    'custom:orgIds'?: string;
    'custom:primaryOrgId'?: string;
    client_id?: string;
    azp?: string;
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
export declare function verifyJwt(token: string, issuer: string, audience?: string): Promise<JwtClaims>;
/**
 * Extract claims from a JWT without verification.
 * Only use where the token has already been verified upstream.
 */
export declare function extractClaims(token: string): JwtClaims;
