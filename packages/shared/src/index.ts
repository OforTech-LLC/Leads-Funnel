/**
 * @kanjona/shared
 * Shared types and utilities for the Kanjona lead generation platform
 */

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
  consentSource?: 'form' | 'api' | 'import' | 'manual';
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

/**
 * Lead status enum
 */
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

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
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  services?: Record<string, ServiceHealth>;
}

/**
 * Service health status
 */
export interface ServiceHealth {
  status: 'up' | 'down';
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
  source: LeadConsent['consentSource'] = 'form'
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
