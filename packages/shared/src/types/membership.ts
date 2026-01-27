/**
 * Membership types linking users to organizations with specific roles.
 */

export type MembershipRole = 'ORG_OWNER' | 'MANAGER' | 'AGENT' | 'VIEWER';

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
