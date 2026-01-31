/**
 * DynamoDB operations for Org Memberships
 *
 * Single-table access patterns:
 *   PK = ORG#<orgId>     SK = MEMBER#<userId>   (org members)
 *   GSI1PK = USER#<userId>  GSI1SK = ORG#<orgId>  (user orgs)
 */
export type MembershipRole = 'ORG_OWNER' | 'MANAGER' | 'AGENT' | 'VIEWER';
export interface Membership {
    pk: string;
    sk: string;
    orgId: string;
    userId: string;
    role: MembershipRole;
    notifyEmail: boolean;
    notifySms: boolean;
    joinedAt: string;
    updatedAt: string;
    gsi1pk: string;
    gsi1sk: string;
}
export type InviteStatus = 'pending' | 'accepted' | 'expired';
export interface OrgInvite {
    pk: string;
    sk: string;
    orgId: string;
    inviteId: string;
    email: string;
    role: MembershipRole;
    status: InviteStatus;
    invitedBy: string;
    invitedByName: string;
    createdAt: string;
    expiresAt: string;
    ttl: number;
}
export interface AddMemberInput {
    orgId: string;
    userId: string;
    role: MembershipRole;
    notifyEmail?: boolean;
    notifySms?: boolean;
}
export interface UpdateMemberInput {
    orgId: string;
    userId: string;
    role?: MembershipRole;
    notifyEmail?: boolean;
    notifySms?: boolean;
}
export interface CreateInviteInput {
    orgId: string;
    email: string;
    role: MembershipRole;
    invitedBy: string;
    invitedByName: string;
}
export declare function addMember(input: AddMemberInput): Promise<Membership>;
export declare function getMember(orgId: string, userId: string): Promise<Membership | null>;
export declare function updateMember(input: UpdateMemberInput): Promise<Membership>;
export declare function removeMember(orgId: string, userId: string): Promise<void>;
export interface PaginatedMemberships {
    items: Membership[];
    nextCursor?: string;
}
export declare function listOrgMembers(orgId: string, cursor?: string, limit?: number): Promise<PaginatedMemberships>;
export declare function listUserOrgs(userId: string, cursor?: string, limit?: number): Promise<PaginatedMemberships>;
export declare function createInvite(input: CreateInviteInput): Promise<OrgInvite>;
export declare function listInvites(orgId: string, cursor?: string, limit?: number): Promise<{
    items: OrgInvite[];
    nextCursor?: string;
}>;
/**
 * Get all members of an org who should receive notifications.
 */
export declare function getOrgNotifyRecipients(orgId: string): Promise<Membership[]>;
