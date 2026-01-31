/**
 * Shared Event & Domain Types
 *
 * Canonical location for types that are used across workers, lib modules,
 * and handlers.  Previously these lived in workers/types.ts which created
 * a circular-dependency risk (workers -> lib -> workers/types).
 *
 * workers/types.ts now re-exports everything from here so existing
 * import paths continue to compile without changes during the transition.
 */
export interface FeatureFlags {
    enable_assignment_service: boolean;
    enable_notification_service: boolean;
    enable_email_notifications: boolean;
    enable_sms_notifications: boolean;
    enable_twilio_sms: boolean;
    enable_sns_sms: boolean;
}
export interface AssignmentWorkerConfig {
    awsRegion: string;
    env: 'dev' | 'prod';
    leadsTableName: string;
    orgsTableName: string;
    usersTableName: string;
    membershipsTableName: string;
    assignmentRulesTableName: string;
    unassignedTableName: string;
    eventBusName: string;
    featureFlagSsmPath: string;
    assignmentRulesSsmPath: string;
}
export interface NotificationWorkerConfig {
    awsRegion: string;
    env: 'dev' | 'prod';
    leadsTableName: string;
    orgsTableName: string;
    usersTableName: string;
    membershipsTableName: string;
    notificationsTableName: string;
    featureFlagSsmPath: string;
    internalRecipientsSsmPath: string;
    sesFromAddress: string;
    twilioSecretArn: string;
    snsTopicArn: string;
}
export interface PreTokenAdminConfig {
    awsRegion: string;
    allowedEmailsSsmPath: string;
}
export interface PreTokenPortalConfig {
    awsRegion: string;
    usersTableName: string;
    membershipsTableName: string;
}
export interface LeadCreatedEventDetail {
    leadId: string;
    funnelId: string;
    zipCode?: string;
    createdAt: string;
    status: string;
    suspicious: boolean;
    reasons: string[];
}
export interface LeadAssignedEventDetail {
    leadId: string;
    funnelId: string;
    assignedOrgId: string;
    assignedUserId?: string;
    assignmentRuleId: string;
    assignedAt: string;
    zipCode?: string;
}
export interface LeadUnassignedEventDetail {
    leadId: string;
    funnelId: string;
    zipCode?: string;
    reason: string;
    evaluatedAt: string;
}
export type AssignmentTargetType = 'ORG' | 'USER';
export interface AssignmentRule {
    ruleId: string;
    funnelId: string;
    targetType: AssignmentTargetType;
    targetId: string;
    orgId: string;
    zipPatterns: string[];
    priority: number;
    dailyCap?: number;
    monthlyCap?: number;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface LeadRecord {
    pk: string;
    sk: string;
    leadId: string;
    funnelId: string;
    name: string;
    email: string;
    phone?: string;
    zipCode?: string;
    status: string;
    createdAt: string;
    updatedAt?: string;
    orgId?: string;
    assignedUserId?: string;
    ruleId?: string;
    assignedAt?: string;
    notifiedAt?: string;
    notifiedInternalAt?: string;
    notifiedOrgAt?: string;
    gsi1pk?: string;
    gsi1sk?: string;
    gsi2pk?: string;
    gsi2sk?: string;
    gsi3pk?: string;
    gsi3sk?: string;
    [key: string]: unknown;
}
export interface OrgRecord {
    pk: string;
    sk: string;
    orgId: string;
    name: string;
    slug?: string;
    contactEmail?: string;
    phone?: string;
    notifyEmails?: string[];
    notifySms?: string[];
    settings?: Record<string, unknown>;
    createdAt: string;
    updatedAt?: string;
    deletedAt?: string;
}
export interface MembershipRecord {
    pk: string;
    sk: string;
    userId: string;
    orgId: string;
    role: 'ORG_OWNER' | 'MANAGER' | 'AGENT' | 'VIEWER';
    notifyEmail: boolean;
    notifySms: boolean;
    joinedAt: string;
    updatedAt: string;
}
export interface UserRecord {
    pk: string;
    sk: string;
    userId: string;
    cognitoSub?: string;
    email: string;
    name: string;
    status: 'active' | 'inactive' | 'invited';
    phone?: string;
    avatarUrl?: string;
    createdAt: string;
    gsi2pk?: string;
    gsi2sk?: string;
}
export interface NotificationRecord {
    pk: string;
    sk: string;
    notificationId: string;
    leadId: string;
    funnelId: string;
    recipientType: 'internal' | 'org_member';
    recipientId: string;
    channel: 'email' | 'sms';
    status: 'sent' | 'failed' | 'skipped';
    messageId?: string;
    errorMessage?: string;
    sentAt: string;
    ttl: number;
}
export interface InternalRecipient {
    name: string;
    email?: string;
    phone?: string;
}
export interface UnassignedLeadRecord {
    pk: string;
    sk: string;
    leadId: string;
    funnelId: string;
    zipCode?: string;
    reason: string;
    evaluatedAt: string;
    ttl: number;
}
export interface CapCheckResult {
    allowed: boolean;
    reason?: string;
}
