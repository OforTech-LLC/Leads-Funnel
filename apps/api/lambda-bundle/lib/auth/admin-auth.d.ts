/**
 * Admin authentication middleware.
 *
 * Verifies admin JWT and checks email allowlist stored in SSM.
 */
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { AdminRole } from './permissions.js';
export interface AdminIdentity {
    email: string;
    emailHash: string;
    role: AdminRole;
    sub: string;
    groups: string[];
}
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
export declare function authenticateAdmin(event: APIGatewayProxyEventV2): Promise<AdminIdentity>;
export declare class AuthError extends Error {
    readonly statusCode: number;
    constructor(message: string, statusCode: number);
}
