/**
 * @kanjona/shared
 * Shared types and utilities for the Kanjona lead generation platform
 */

// =============================================================================
// Platform Types (3-sided marketplace)
// =============================================================================

export { OrgTypeEnum, OrgStatusEnum, LeadVisibilityPolicyEnum } from './types/org';
export type {
  OrgType,
  OrgStatus,
  LeadVisibilityPolicy,
  Org,
  CreateOrgInput,
  UpdateOrgInput,
} from './types/org';

export { UserStatusEnum } from './types/user';
export type { UserStatus, User, CreateUserInput, UpdateUserInput } from './types/user';

export { MembershipRoleEnum } from './types/membership';
export type {
  MembershipRole,
  Membership,
  AddMemberInput,
  UpdateMemberInput,
} from './types/membership';

export type {
  TargetType,
  AssignmentRule,
  CreateRuleInput,
  UpdateRuleInput,
  RuleTestInput,
  RuleTestResult,
} from './types/assignment-rule';

export {
  NotificationChannelEnum,
  NotificationStatusEnum,
  NotificationTargetTypeEnum,
} from './types/notification';
export type {
  NotificationChannel,
  NotificationStatus,
  NotificationTargetType,
  Notification,
} from './types/notification';

// Re-export new lead types with "Platform" prefix to avoid collision with
// the original Lead interface (which represents form-submission data).
export { PipelineStatusEnum } from './types/lead';
export type {
  PipelineStatus,
  Lead as PlatformLead,
  LeadNotificationInfo,
  UpdateLeadInput,
  ReassignLeadInput,
} from './types/lead';

export { ExportFormatEnum, ExportStatusEnum } from './types/export';
export type { ExportFormat, ExportStatus, ExportJob, CreateExportInput } from './types/export';

export type { AuditEntry } from './types/audit';

export type { PaginationRequest, PaginationResponse, PaginatedResult } from './types/pagination';

export { ApiErrorCodes } from './types/api';
export type { ErrorCode, ApiErrorCode, ApiErrorResponse, ApiSuccessResponse } from './types/api';

export type { LeadCreatedEvent, LeadAssignedEvent, LeadUnassignedEvent } from './types/events';

// =============================================================================
// Feature Flags
// =============================================================================

export { FEATURE_FLAGS, FEATURE_FLAG_DEFAULTS } from './feature-flags';
export type { FeatureFlag } from './feature-flags';

/**
 * Alias for FEATURE_FLAGS to match the FeatureFlagNames convention.
 * Prefer using `FeatureFlagNames.BILLING_ENABLED` for enum-style access.
 */
export { FEATURE_FLAGS as FeatureFlagNames } from './feature-flags';

// =============================================================================
// Lead Scoring
// =============================================================================

export { qualityFromScore } from './scoring';
export type { LeadScore, ScoreBreakdown, LeadQuality } from './scoring';

// =============================================================================
// Analytics
// =============================================================================

export type {
  OverviewMetrics,
  TrendPoint,
  FunnelMetric,
  OrgMetric,
  ConversionFunnel,
  ConversionStage,
  SourceMetric,
  DateRangePreset,
  DateRange,
} from './analytics';

// =============================================================================
// Webhooks
// =============================================================================

export { WEBHOOK_EVENTS, WebhookEventEnum } from './webhooks';
export type { WebhookEventType, WebhookConfig, WebhookDelivery } from './webhooks';

// =============================================================================
// Billing
// =============================================================================

export { BILLING_PLANS, PLAN_LIMITS } from './billing';
export type { BillingPlan, BillingAccount, UsageRecord } from './billing';

// =============================================================================
// Calendar
// =============================================================================

export { CALENDAR_PROVIDERS } from './calendar';
export type { CalendarProvider, CalendarConfig, TimeSlot, CalendarEvent } from './calendar';

// =============================================================================
// Messaging
// =============================================================================

export { MESSAGING_PROVIDERS } from './messaging';
export type { MessagingProvider, MessagingConfig, MessagingPayload } from './messaging';

// =============================================================================
// App Notifications & Preferences
// =============================================================================

export { NOTIFICATION_TYPES, NotificationTypeEnum, DigestFrequencyEnum } from './notifications';
export type {
  NotificationType,
  DigestFrequency,
  AppNotification,
  NotificationPreferences,
} from './notifications';

// =============================================================================
// Lead Status State Machine
// =============================================================================

export {
  VALID_STATUS_TRANSITIONS,
  isValidTransition,
  getAvailableTransitions,
} from './state-machine';

// =============================================================================
// Constants
// =============================================================================

export { PAGINATION, RATE_LIMITS, CACHE_TTL, DATA_RETENTION } from './constants';

// =============================================================================
// Unified Lead Status
// =============================================================================

/**
 * All possible lead statuses across the platform.
 *
 * Used by admin, portal, and web apps. Individual apps may only display
 * a subset of these statuses depending on their context.
 *
 * - new:         Lead just submitted
 * - assigned:    Lead assigned to an org/agent
 * - unassigned:  No matching rule found
 * - contacted:   Outreach made
 * - qualified:   Lead vetted and viable
 * - booked:      Appointment or meeting booked
 * - converted:   Lead became a customer
 * - won:         Deal closed successfully
 * - lost:        Lead did not convert
 * - dnc:         Do not contact
 * - quarantined: Flagged for review (spam, duplicate, etc.)
 */
export const LEAD_STATUSES = [
  'new',
  'assigned',
  'unassigned',
  'contacted',
  'qualified',
  'booked',
  'converted',
  'won',
  'lost',
  'dnc',
  'quarantined',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

/**
 * Const enum-like object for lead statuses.
 * Use `LeadStatusEnum.NEW` instead of hardcoding `'new'`.
 */
export const LeadStatusEnum = {
  NEW: 'new',
  ASSIGNED: 'assigned',
  UNASSIGNED: 'unassigned',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  BOOKED: 'booked',
  CONVERTED: 'converted',
  WON: 'won',
  LOST: 'lost',
  DNC: 'dnc',
  QUARANTINED: 'quarantined',
} as const satisfies Record<string, LeadStatus>;

/**
 * Admin pipeline stages (separate from lead status).
 * These represent internal workflow steps.
 */
export const ADMIN_PIPELINE_STATUSES = [
  'none',
  'nurturing',
  'negotiating',
  'closing',
  'closed_won',
  'closed_lost',
] as const;

export type AdminPipelineStatus = (typeof ADMIN_PIPELINE_STATUSES)[number];

/**
 * Const enum-like object for admin pipeline statuses.
 * Use `AdminPipelineStatusEnum.NURTURING` instead of hardcoding `'nurturing'`.
 */
export const AdminPipelineStatusEnum = {
  NONE: 'none',
  NURTURING: 'nurturing',
  NEGOTIATING: 'negotiating',
  CLOSING: 'closing',
  CLOSED_WON: 'closed_won',
  CLOSED_LOST: 'closed_lost',
} as const satisfies Record<string, AdminPipelineStatus>;

/**
 * Supported export file formats.
 */
export const EXPORT_FORMATS = ['csv', 'xlsx', 'pdf', 'docx', 'json'] as const;

export type ExportFormatValue = (typeof EXPORT_FORMATS)[number];

// =============================================================================
// Funnel Category Enum
// =============================================================================

/**
 * Const enum-like object for funnel categories.
 * Use `FunnelCategoryEnum.CORE` instead of hardcoding `'core'`.
 */
export const FunnelCategoryEnum = {
  CORE: 'core',
  HOME_SERVICES: 'home-services',
  HEALTH: 'health',
  LEGAL: 'legal',
  BUSINESS: 'business',
  AUTO: 'auto',
  EDUCATION: 'education',
  EVENTS: 'events',
} as const satisfies Record<string, FunnelCategory>;

// =============================================================================
// Consent Source Enum
// =============================================================================

/**
 * Const enum-like object for consent sources.
 * Use `ConsentSourceEnum.FORM` instead of hardcoding `'form'`.
 */
export const ConsentSourceEnum = {
  FORM: 'form',
  API: 'api',
  IMPORT: 'import',
  MANUAL: 'manual',
} as const;

export type ConsentSource = (typeof ConsentSourceEnum)[keyof typeof ConsentSourceEnum];

// =============================================================================
// Health Status Enums
// =============================================================================

/**
 * Const enum-like object for health check statuses.
 * Use `HealthStatusEnum.HEALTHY` instead of hardcoding `'healthy'`.
 */
export const HealthStatusEnum = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
} as const;

export type HealthStatus = (typeof HealthStatusEnum)[keyof typeof HealthStatusEnum];

/**
 * Const enum-like object for individual service statuses.
 * Use `ServiceStatusEnum.UP` instead of hardcoding `'up'`.
 */
export const ServiceStatusEnum = {
  UP: 'up',
  DOWN: 'down',
} as const;

export type ServiceStatus = (typeof ServiceStatusEnum)[keyof typeof ServiceStatusEnum];

// =============================================================================
// UTM Parameters
// =============================================================================

/**
 * UTM tracking parameters
 */
export interface LeadUtm {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

// =============================================================================
// Consent Types (GDPR/CCPA Compliance)
// =============================================================================

/**
 * Consent tracking for GDPR/CCPA compliance
 */
export interface LeadConsent {
  /** Whether user accepted the privacy policy */
  privacyAccepted: boolean;
  /** Whether user consented to marketing communications */
  marketingConsent: boolean;
  /** ISO 8601 timestamp when consent was given */
  consentTimestamp: string;
  /** IP address hash at time of consent (for audit) */
  consentIpHash?: string;
  /** Version of privacy policy accepted */
  privacyPolicyVersion?: string;
  /** Version of terms of service accepted */
  termsVersion?: string;
  /** Source of consent (form, api, import) */
  consentSource?: ConsentSource;
}

/**
 * Consent update record for audit trail
 */
export interface ConsentUpdate {
  /** ISO 8601 timestamp of update */
  timestamp: string;
  /** Previous consent state */
  previousState: Partial<LeadConsent>;
  /** New consent state */
  newState: Partial<LeadConsent>;
  /** Who/what made the update */
  updatedBy: string;
  /** Reason for update */
  reason?: string;
}

// =============================================================================
// Lead Types
// =============================================================================

/**
 * Lead input data from form submission
 */
export interface LeadInput {
  name: string;
  email: string;
  phone?: string;
  notes?: string;
}

/**
 * Lead metadata for tracking
 */
export interface LeadMetadata {
  pageUrl?: string;
  referrer?: string;
  userAgent?: string;
  ipHash?: string;
  timestamp?: string;
}

/**
 * API request payload for lead submission
 */
export interface LeadRequestPayload {
  funnelId?: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  utm: LeadUtm;
  metadata?: LeadMetadata;
  customFields?: Record<string, string>;
  /** Consent information (required for GDPR compliance) */
  consent?: LeadConsentInput;
}

/**
 * Consent input from form submission
 */
export interface LeadConsentInput {
  /** User must accept privacy policy */
  privacyAccepted: boolean;
  /** User can opt-in to marketing */
  marketingConsent?: boolean;
  /** Privacy policy version shown to user */
  privacyPolicyVersion?: string;
  /** Terms version shown to user */
  termsVersion?: string;
}

/**
 * Lead data stored in database
 */
export interface Lead {
  id: string;
  funnelId: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  utm: LeadUtm;
  metadata: LeadMetadata;
  customFields?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  status: LeadStatus;
  /** Consent tracking information */
  consent?: LeadConsent;
  /** History of consent updates for audit trail */
  consentHistory?: ConsentUpdate[];
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Field-level validation errors
 * Maps field names to their error messages
 */
export type FieldErrors = Record<string, string>;

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  fieldErrors?: FieldErrors;
}

/**
 * Lead submission response
 */
export interface LeadSubmitResponse {
  success: boolean;
  data?: {
    id: string;
    message?: string;
  };
  error?: ApiError;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: HealthStatus;
  version: string;
  timestamp: string;
  services?: Record<string, ServiceHealth>;
}

/**
 * Service health status
 */
export interface ServiceHealth {
  status: ServiceStatus;
  latency?: number;
  message?: string;
}

// =============================================================================
// Funnel Types
// =============================================================================

/**
 * Funnel configuration
 */
export interface FunnelConfig {
  id: string;
  slug: string;
  name: string;
  category: FunnelCategory;
  enabled: boolean;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  /** Whether consent is required for this funnel */
  requireConsent?: boolean;
  /** Privacy policy URL for this funnel */
  privacyPolicyUrl?: string;
  /** Terms of service URL for this funnel */
  termsUrl?: string;
}

/**
 * Funnel category
 */
export type FunnelCategory =
  | 'core'
  | 'home-services'
  | 'health'
  | 'legal'
  | 'business'
  | 'auto'
  | 'education'
  | 'events';

/**
 * List of all 47 funnel IDs
 */
export const FUNNEL_IDS = [
  // Core Services (8)
  'real-estate',
  'life-insurance',
  'construction',
  'moving',
  'dentist',
  'plastic-surgeon',
  'roofing',
  'cleaning',

  // Home Services (19)
  'hvac',
  'plumbing',
  'electrician',
  'pest-control',
  'landscaping',
  'pool-service',
  'home-remodeling',
  'solar',
  'locksmith',
  'pressure-washing',
  'water-damage-restoration',
  'mold-remediation',
  'flooring',
  'painting',
  'windows-doors',
  'fencing',
  'concrete',
  'junk-removal',
  'appliance-repair',

  // Health & Beauty (7)
  'orthodontist',
  'dermatology',
  'medspa',
  'chiropractic',
  'physical-therapy',
  'hair-transplant',
  'cosmetic-dentistry',

  // Professional & Legal (5)
  'personal-injury-attorney',
  'immigration-attorney',
  'criminal-defense-attorney',
  'tax-accounting',
  'business-consulting',

  // Business Services (4)
  'commercial-cleaning',
  'security-systems',
  'it-services',
  'marketing-agency',

  // Auto Services (4)
  'auto-repair',
  'auto-detailing',
  'towing',
  'auto-glass',
] as const;

export type FunnelId = (typeof FUNNEL_IDS)[number];

// =============================================================================
// Validation
// =============================================================================

/**
 * Email validation regex
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Phone validation regex (US format)
 */
export const PHONE_REGEX = /^[\d\s\-\(\)\+]{10,20}$/;

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Validate phone format
 */
export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone);
}

/**
 * Check if a string is a valid funnel ID
 */
export function isValidFunnelId(id: string): id is FunnelId {
  return FUNNEL_IDS.includes(id as FunnelId);
}

/**
 * Validate consent input
 * Returns validation errors if consent is invalid
 */
export function validateConsent(
  consent: LeadConsentInput | undefined,
  requireConsent: boolean = true
): FieldErrors {
  const errors: FieldErrors = {};

  if (requireConsent) {
    if (!consent) {
      errors.consent = 'Consent information is required';
      return errors;
    }

    if (consent.privacyAccepted !== true) {
      errors.privacyAccepted = 'You must accept the privacy policy to continue';
    }
  }

  return errors;
}

/**
 * Create a consent record from input
 */
export function createConsentRecord(
  input: LeadConsentInput,
  ipHash?: string,
  source: ConsentSource = 'form'
): LeadConsent {
  return {
    privacyAccepted: input.privacyAccepted,
    marketingConsent: input.marketingConsent ?? false,
    consentTimestamp: new Date().toISOString(),
    consentIpHash: ipHash,
    privacyPolicyVersion: input.privacyPolicyVersion,
    termsVersion: input.termsVersion,
    consentSource: source,
  };
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Normalize email address
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Normalize phone number (remove non-digits except +)
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}
