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

// =============================================================================
// Feature Flags
// =============================================================================

export interface FeatureFlags {
  enable_assignment_service: boolean;
  enable_notification_service: boolean;
  enable_email_notifications: boolean;
  enable_sms_notifications: boolean;
  enable_twilio: boolean;
  enable_sns_sms: boolean;
}

// =============================================================================
// Worker Configuration
// =============================================================================

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

// =============================================================================
// EventBridge Event Detail Types
// =============================================================================

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

// =============================================================================
// Assignment Rule Types
// =============================================================================

export type AssignmentTargetType = 'ORG' | 'USER';

export interface AssignmentRule {
  ruleId: string;
  funnelId: string; // specific funnelId or '*' for wildcard
  targetType: AssignmentTargetType;
  targetId: string; // orgId or userId
  orgId: string; // always present; if targetType=USER, this is the user's org
  zipPatterns: string[]; // e.g., ["33101", "331", "33"]
  priority: number; // lower = higher priority
  dailyCap?: number;
  monthlyCap?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Lead Record Types (DynamoDB shape)
// =============================================================================

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

// =============================================================================
// Organization & Membership Types
// =============================================================================

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

// =============================================================================
// User Record Types (for Cognito triggers)
// =============================================================================

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
  gsi2pk?: string; // COGNITO#{cognitoSub}
  gsi2sk?: string;
}

// =============================================================================
// Notification Types
// =============================================================================

export interface NotificationRecord {
  pk: string;
  sk: string;
  notificationId: string;
  leadId: string;
  funnelId: string;
  recipientType: 'internal' | 'org_member';
  recipientId: string; // email or phone
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

// =============================================================================
// Unassigned Lead Record
// =============================================================================

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

// =============================================================================
// Cap Counter Types
// =============================================================================

export interface CapCheckResult {
  allowed: boolean;
  reason?: string;
}
