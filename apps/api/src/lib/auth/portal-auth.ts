/**
 * Portal (agent) authentication middleware.
 *
 * Verifies portal JWT and extracts userId / orgIds from custom claims.
 */

import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { verifyJwt, type JwtClaims } from './jwt.js';
import type { PlatformLead } from '../db/leads.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PortalIdentity {
  userId: string;
  orgIds: string[];
  primaryOrgId: string;
  sub: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractBearer(event: APIGatewayProxyEventV2): string | null {
  const header = event.headers?.['authorization'] || event.headers?.['Authorization'];
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Authenticate a portal user from the incoming API Gateway event.
 *
 * The pre-token Lambda (pre-token-portal) injects:
 *   custom:userId, custom:orgIds, custom:primaryOrgId
 *
 * @returns PortalIdentity on success
 * @throws PortalAuthError with message suitable for 401/403 responses
 */
export async function authenticatePortal(event: APIGatewayProxyEventV2): Promise<PortalIdentity> {
  const token = extractBearer(event);
  if (!token) {
    throw new PortalAuthError('Missing or invalid Authorization header', 401);
  }

  const issuer = process.env.PORTAL_COGNITO_ISSUER || process.env.COGNITO_ISSUER || '';
  const audience = process.env.PORTAL_COGNITO_CLIENT_ID || process.env.COGNITO_CLIENT_ID || '';

  if (!issuer) {
    throw new PortalAuthError('Portal authentication not configured', 500);
  }

  let claims: JwtClaims;
  try {
    claims = await verifyJwt(token, issuer, audience || undefined);
  } catch {
    throw new PortalAuthError('Invalid or expired token', 401);
  }

  const userId = claims['custom:userId'] as string | undefined;
  const orgIdsRaw = claims['custom:orgIds'] as string | undefined;
  const primaryOrgId = claims['custom:primaryOrgId'] as string | undefined;

  if (!userId) {
    throw new PortalAuthError('Token missing userId claim', 401);
  }

  const orgIds = orgIdsRaw ? orgIdsRaw.split(',').filter(Boolean) : [];
  const email = (claims.email || '').toLowerCase().trim();

  return {
    userId,
    orgIds,
    primaryOrgId: primaryOrgId || orgIds[0] || '',
    sub: claims.sub,
    email,
  };
}

/**
 * Check if a portal user can access a specific lead.
 *
 * Policy:
 * - Lead must belong to one of the user's orgs.
 * - OR the user must be the assigned user.
 */
export function checkLeadAccess(identity: PortalIdentity, lead: PlatformLead): boolean {
  // Lead assigned to one of user's orgs
  if (lead.orgId && identity.orgIds.includes(lead.orgId)) {
    return true;
  }

  // Lead directly assigned to user
  if (lead.assignedUserId === identity.userId) {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class PortalAuthError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'PortalAuthError';
    this.statusCode = statusCode;
  }
}
