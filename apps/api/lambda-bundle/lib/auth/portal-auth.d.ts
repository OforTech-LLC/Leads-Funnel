/**
 * Portal (agent) authentication middleware.
 *
 * Verifies portal JWT and extracts userId / orgIds from custom claims.
 */
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { PlatformLead } from '../db/leads.js';
export interface PortalIdentity {
    userId: string;
    orgIds: string[];
    primaryOrgId: string;
    sub: string;
    email: string;
}
/**
 * Authenticate a portal user from the incoming API Gateway event.
 *
 * The pre-token Lambda (pre-token-portal) injects:
 *   custom:userId, custom:orgIds, custom:primaryOrgId
 *
 * @returns PortalIdentity on success
 * @throws PortalAuthError with message suitable for 401/403 responses
 */
export declare function authenticatePortal(event: APIGatewayProxyEventV2): Promise<PortalIdentity>;
/**
 * Check if a portal user can access a specific lead.
 *
 * Policy:
 * - Lead must belong to one of the user's orgs.
 * - OR the user must be the assigned user.
 */
export declare function checkLeadAccess(identity: PortalIdentity, lead: PlatformLead): boolean;
export declare class PortalAuthError extends Error {
    readonly statusCode: number;
    constructor(message: string, statusCode: number);
}
