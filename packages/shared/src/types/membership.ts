/**
 * Membership types linking users to organizations with specific roles.
 */

/**
 * Const enum-like object for membership roles.
 * Use `MembershipRoleEnum.OWNER` instead of hardcoding `'ORG_OWNER'`.
 */
export const MembershipRoleEnum = {
  OWNER: 'ORG_OWNER',
  MANAGER: 'MANAGER',
  AGENT: 'AGENT',
  VIEWER: 'VIEWER',
} as const;

export type MembershipRole = (typeof MembershipRoleEnum)[keyof typeof MembershipRoleEnum];

export interface Membership {
  orgId: string;
  userId: string;
  role: MembershipRole;
  notifyEmail: boolean;
  notifySms: boolean;
  createdAt: string;
  lastUpdatedAt: string;
  deletedAt?: string;
}

export interface AddMemberInput {
  userId: string;
  role: MembershipRole;
  notifyEmail?: boolean;
  notifySms?: boolean;
}

export interface UpdateMemberInput {
  role?: MembershipRole;
  notifyEmail?: boolean;
  notifySms?: boolean;
}
