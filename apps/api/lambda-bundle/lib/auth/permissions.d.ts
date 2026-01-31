/**
 * RBAC Permission definitions for Admin and Portal roles.
 */
export type AdminRole = 'ADMIN' | 'VIEWER';
export type MembershipRole = 'ORG_OWNER' | 'MANAGER' | 'AGENT' | 'VIEWER';
/**
 * Only ADMIN can perform write operations (create/update/delete).
 */
export declare function canAdminWrite(role: AdminRole): boolean;
/**
 * Both ADMIN and VIEWER can read.
 */
export declare function canAdminRead(role: AdminRole): boolean;
/**
 * ORG_OWNER, MANAGER, and AGENT can update leads.
 */
export declare function canPortalUpdateLead(memberRole: MembershipRole): boolean;
/**
 * Only ORG_OWNER can manage members.
 */
export declare function canPortalManageMembers(memberRole: MembershipRole): boolean;
/**
 * ORG_OWNER and MANAGER can view all org leads.
 * AGENT can only view leads assigned to them.
 * VIEWER can only view (no updates).
 */
export declare function canPortalViewAllOrgLeads(memberRole: MembershipRole): boolean;
