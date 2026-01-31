/**
 * RBAC Permission definitions for Admin and Portal roles.
 */
import { ADMIN_ROLES, MEMBERSHIP_ROLES } from '../constants.js';
// ---------------------------------------------------------------------------
// Admin permissions
// ---------------------------------------------------------------------------
/**
 * Only ADMIN can perform write operations (create/update/delete).
 */
export function canAdminWrite(role) {
    return role === ADMIN_ROLES.ADMIN;
}
/**
 * Both ADMIN and VIEWER can read.
 */
export function canAdminRead(role) {
    return role === ADMIN_ROLES.ADMIN || role === ADMIN_ROLES.VIEWER;
}
// ---------------------------------------------------------------------------
// Portal permissions
// ---------------------------------------------------------------------------
/**
 * ORG_OWNER, MANAGER, and AGENT can update leads.
 */
export function canPortalUpdateLead(memberRole) {
    return (memberRole === MEMBERSHIP_ROLES.ORG_OWNER ||
        memberRole === MEMBERSHIP_ROLES.MANAGER ||
        memberRole === MEMBERSHIP_ROLES.AGENT);
}
/**
 * Only ORG_OWNER can manage members.
 */
export function canPortalManageMembers(memberRole) {
    return memberRole === MEMBERSHIP_ROLES.ORG_OWNER;
}
/**
 * ORG_OWNER and MANAGER can view all org leads.
 * AGENT can only view leads assigned to them.
 * VIEWER can only view (no updates).
 */
export function canPortalViewAllOrgLeads(memberRole) {
    return memberRole === MEMBERSHIP_ROLES.ORG_OWNER || memberRole === MEMBERSHIP_ROLES.MANAGER;
}
//# sourceMappingURL=permissions.js.map