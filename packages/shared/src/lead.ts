// =============================================================================
// lead.ts
// @kanjona/shared
// =============================================================================
// Shared types for lead capture across web and API.
// =============================================================================

/**
 * UTM tracking parameters captured from URL query strings.
 */
export interface LeadUtm {
  /** Campaign source (e.g., google, facebook) */
  utm_source?: string;
  /** Campaign medium (e.g., cpc, email) */
  utm_medium?: string;
  /** Campaign name */
  utm_campaign?: string;
  /** Campaign term (for paid search) */
  utm_term?: string;
  /** Campaign content (for A/B testing) */
  utm_content?: string;
}

/**
 * Lead input data from the form.
 * This is what the user fills in.
 */
export interface LeadInput {
  /** Email address (required) */
  email: string;
  /** Full name (optional) */
  name?: string;
  /** Company name (optional) */
  company?: string;
  /** Phone number (optional) */
  phone?: string;
  /** Additional notes or message (optional) */
  notes?: string;
  /** Lead source identifier (optional, defaults to "website") */
  source?: string;
  /** Honeypot field - should always be empty (bot detection) */
  website?: string;
}

/**
 * Full request payload sent to the API.
 * Combines form input with tracking data.
 */
export interface LeadRequestPayload extends LeadInput {
  /** UTM tracking parameters */
  utm?: LeadUtm;
  /** Additional metadata */
  metadata?: Record<string, string>;
}

/**
 * Individual lead data returned from API.
 */
export interface LeadData {
  /** Unique lead ID */
  id: string;
  /** Email address */
  email: string;
  /** Full name */
  name?: string;
  /** Company name */
  company?: string;
  /** Phone number */
  phone?: string;
  /** Notes */
  notes?: string;
  /** Lead source */
  source: string;
  /** Lead status (new, contacted, qualified, etc.) */
  status: string;
  /** ISO timestamp of creation */
  createdAt: string;
}

/**
 * API response for lead submission.
 */
export interface LeadSubmitResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Lead data if successful */
  data?: LeadData;
  /** Error information if unsuccessful */
  error?: {
    /** Error code */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Field-specific errors */
    fields?: Record<string, string>;
  };
  /** Request ID for tracing */
  requestId?: string;
}

/**
 * Field-level validation errors.
 * Keys are field names, values are error messages.
 */
export type FieldErrors = Record<string, string>;

/**
 * Valid lead sources.
 */
export type LeadSource =
  | 'website'
  | 'landing_page'
  | 'referral'
  | 'social'
  | 'api'
  | 'import';

/**
 * Valid lead statuses.
 */
export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'converted'
  | 'lost'
  | 'quarantined';
