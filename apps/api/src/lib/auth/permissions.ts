/**
 * RBAC Permission definitions for Admin and Portal roles.
 */

// ---------------------------------------------------------------------------
// Role enums
// ---------------------------------------------------------------------------

export type AdminRole = 'ADMIN' | 'VIEWER';
export type MembershipRole = 'ORG_OWNER' | 'MANAGER' | 'AGENT' | 'VIEWER';

// ---------------------------------------------------------------------------
// Admin permissions
// ---------------------------------------------------------------------------

/**
 * Only ADMIN can perform write operations (create/update/delete).
 */
export function canAdminWrite(role: AdminRole): boolean {
  return role === 'ADMIN';
}

/**
 * Both ADMIN and VIEWER can read.
 */
export function canAdminRead(role: AdminRole): boolean {
  return role === 'ADMIN' || role === 'VIEWER';
}

// ---------------------------------------------------------------------------
// Portal permissions
// ---------------------------------------------------------------------------

/**
 * ORG_OWNER, MANAGER, and AGENT can update leads.
 */
export function canPortalUpdateLead(memberRole: MembershipRole): boolean {
  return memberRole === 'ORG_OWNER' || memberRole === 'MANAGER' || memberRole === 'AGENT';
}

/**
 * Only ORG_OWNER can manage members.
 */
export function canPortalManageMembers(memberRole: MembershipRole): boolean {
  return memberRole === 'ORG_OWNER';
}

/**
 * ORG_OWNER and MANAGER can view all org leads.
 * AGENT can only view leads assigned to them.
 * VIEWER can only view (no updates).
 */
export function canPortalViewAllOrgLeads(memberRole: MembershipRole): boolean {
  return memberRole === 'ORG_OWNER' || memberRole === 'MANAGER';
}
