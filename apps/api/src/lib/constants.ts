/**
 * Centralized constants for DynamoDB key prefixes, GSI names, sort key
 * values, and other magic strings used throughout the backend.
 *
 * All files MUST import from this module instead of hard-coding string
 * prefixes.  This avoids typo-induced bugs and makes future key-schema
 * changes a single-file edit.
 */

// ---------------------------------------------------------------------------
// DynamoDB Partition Key (PK) Prefixes
// ---------------------------------------------------------------------------

export const DB_PREFIXES = {
  /** Lead record:  PK = LEAD#<funnelId>#<leadId>  or  LEAD#<leadId> (capture handler) */
  LEAD: 'LEAD#',
  /** Organisation:  PK = ORG#<orgId> */
  ORG: 'ORG#',
  /** User:  PK = USER#<userId> */
  USER: 'USER#',
  /** Assignment rule:  PK = RULE#<ruleId> */
  RULE: 'RULE#',
  /** Audit log:  PK = AUDIT#<actorId> */
  AUDIT: 'AUDIT#',
  /** Notification:  PK = NOTIFY#<leadId> */
  NOTIFY: 'NOTIFY#',
  /** Export job:  PK = EXPORT#<exportId> */
  EXPORT: 'EXPORT#',
  /** Webhook config:  PK = WEBHOOK#<id> */
  WEBHOOK: 'WEBHOOK#',
  /** Webhook delivery:  PK = WHDELIVER#<webhookId> */
  WHDELIVER: 'WHDELIVER#',
  /** Unassigned lead queue:  PK = UNASSIGNED#<funnelId>  or  UNASSIGNED#<leadId> (worker) */
  UNASSIGNED: 'UNASSIGNED#',
  /** Rate limit counter:  PK = RATELIMIT#<userId>#<windowKey> */
  RATELIMIT: 'RATELIMIT#',
  /** IP-based rate limit (capture handler):  PK = IP#<ipHash> */
  IP: 'IP#',
  /** Idempotency record:  PK = IDEMPOTENCY#<key> */
  IDEMPOTENCY: 'IDEMPOTENCY#',
  /** Billing account:  PK = BILLING#<orgId> */
  BILLING: 'BILLING#',
  /** Billing usage:  SK = USAGE#<YYYY-MM> */
  USAGE: 'USAGE#',
  /** Analytics cache:  PK = ANALYTICS_CACHE#<cacheKey> */
  ANALYTICS_CACHE: 'ANALYTICS_CACHE#',
  /** Calendar config:  PK = CALENDAR#<userId> */
  CALENDAR: 'CALENDAR#',
  /** Export throttle:  PK = EXPORT_THROTTLE#<emailHash> */
  EXPORT_THROTTLE: 'EXPORT_THROTTLE#',
} as const;

// ---------------------------------------------------------------------------
// DynamoDB Sort Key (SK) Constants
// ---------------------------------------------------------------------------

export const DB_SORT_KEYS = {
  /** Generic metadata sort key */
  META: 'META',
  /** Webhook config sort key */
  CONFIG: 'CONFIG',
  /** Rate limit sort key */
  LIMIT: 'LIMIT',
  /** Cap counter sort key */
  COUNTER: 'COUNTER',
  /** Billing account sort key */
  ACCOUNT: 'ACCOUNT',
  /** Analytics cache data sort key */
  DATA: 'DATA',
  /** Export throttle sort key */
  THROTTLE: 'THROTTLE',
} as const;

// ---------------------------------------------------------------------------
// GSI Partition Key Prefixes & Fixed Keys
// ---------------------------------------------------------------------------

export const GSI_KEYS = {
  /** GSI1PK for funnel-based lead queries:  FUNNEL#<funnelId> */
  FUNNEL: 'FUNNEL#',
  /** GSI2PK for org-based lead queries:  ORG#<orgId> */
  ORG: 'ORG#',
  /** GSI3PK for status-based lead queries:  STATUS#<funnelId>#<status> */
  STATUS: 'STATUS#',
  /** GSI1PK for user email lookup:  EMAIL#<email> */
  EMAIL: 'EMAIL#',
  /** GSI2PK for Cognito sub lookup:  COGNITOSUB#<sub> */
  COGNITOSUB: 'COGNITOSUB#',
  /** GSI1PK for org webhooks listing:  ORG#<orgId>#WEBHOOKS */
  ORG_WEBHOOKS_SUFFIX: '#WEBHOOKS',
  /** GSI1SK / GSI2SK / GSI3SK date prefix:  CREATED#<iso> */
  CREATED: 'CREATED#',
  /** GSI2SK for assigned leads:  ASSIGNED#<iso> */
  ASSIGNED: 'ASSIGNED#',
  /** GSI1SK for rule priority:  PRIORITY#<padded> */
  PRIORITY: 'PRIORITY#',
  /** GSI sort key prefix for membership:  MEMBER#<userId> */
  MEMBER: 'MEMBER#',
  /** GSI sort key prefix for org invites: INVITE#<email> */
  INVITE: 'INVITE#',
  /** Fixed GSI PK for global org listing */
  ORGS_LIST: 'ORGS',
  /** Fixed GSI PK for global user listing */
  USERS_LIST: 'USERS',
  /** Fixed GSI PK for global audit log */
  AUDITLOG: 'AUDITLOG',
  /** Fixed GSI PK for global notification log */
  NOTIFYLOG: 'NOTIFYLOG',
  /** Fixed GSI PK for global export listing */
  EXPORTS_LIST: 'EXPORTS',
  /** Worker GSI: ORG#<orgId>#LEADS */
  ORG_LEADS_SUFFIX: '#LEADS',
  /** Worker GSI: USER#<userId>#LEADS */
  USER_LEADS_SUFFIX: '#LEADS',
} as const;

// ---------------------------------------------------------------------------
// DynamoDB SK Prefixes (used in KeyConditionExpression begins_with)
// ---------------------------------------------------------------------------

export const SK_PREFIXES = {
  /** Window sort key for IP rate limit:  WINDOW#<bucket> */
  WINDOW: 'WINDOW#',
  /** Cap daily key:  #CAP#DAILY#<date> */
  CAP_DAILY: '#CAP#DAILY#',
  /** Cap monthly key:  #CAP#MONTHLY#<month> */
  CAP_MONTHLY: '#CAP#MONTHLY#',
} as const;

// ---------------------------------------------------------------------------
// EventBridge Event Types
// ---------------------------------------------------------------------------

export const EVENT_TYPES = {
  LEAD_CREATED: 'lead.created',
  LEAD_ASSIGNED: 'lead.assigned',
  LEAD_UNASSIGNED: 'lead.unassigned',
  LEAD_STATUS_CHANGED: 'lead.status_changed',
  LEAD_NOTE_ADDED: 'lead.note_added',
} as const;

// ---------------------------------------------------------------------------
// EventBridge Source
// ---------------------------------------------------------------------------

export const EVENT_SOURCE = 'kanjona.leads';

// ---------------------------------------------------------------------------
// HTTP / API Error Codes
// ---------------------------------------------------------------------------

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
} as const;

// ---------------------------------------------------------------------------
// Request Body Size Limits
// ---------------------------------------------------------------------------

/** 1 MB body size limit for admin/portal handlers */
export const MAX_BODY_SIZE = 1 * 1024 * 1024; // 1 MB

/** 10 KB body size limit for the lead capture handler */
export const MAX_LEAD_PAYLOAD_SIZE = 10 * 1024; // 10 KB

// ---------------------------------------------------------------------------
// HTTP Status Codes
// ---------------------------------------------------------------------------

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ---------------------------------------------------------------------------
// HTTP Header Names
// ---------------------------------------------------------------------------

export const HTTP_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
  AUTHORIZATION_LOWER: 'authorization',
  CACHE_CONTROL: 'Cache-Control',
  X_REQUEST_ID: 'X-Request-Id',
  X_CONTENT_TYPE_OPTIONS: 'X-Content-Type-Options',
  X_FRAME_OPTIONS: 'X-Frame-Options',
  X_XSS_PROTECTION: 'X-XSS-Protection',
  CONTENT_SECURITY_POLICY: 'Content-Security-Policy',
  RETRY_AFTER: 'Retry-After',
  ACCESS_CONTROL_ALLOW_ORIGIN: 'Access-Control-Allow-Origin',
  ACCESS_CONTROL_ALLOW_METHODS: 'Access-Control-Allow-Methods',
  ACCESS_CONTROL_ALLOW_HEADERS: 'Access-Control-Allow-Headers',
  ACCESS_CONTROL_ALLOW_CREDENTIALS: 'Access-Control-Allow-Credentials',
  VARY: 'Vary',
  PRAGMA: 'Pragma',
} as const;

// ---------------------------------------------------------------------------
// Content Type Values
// ---------------------------------------------------------------------------

export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
} as const;

// ---------------------------------------------------------------------------
// Admin / Portal Role Constants
// ---------------------------------------------------------------------------

export const ADMIN_ROLES = {
  ADMIN: 'ADMIN',
  VIEWER: 'VIEWER',
} as const;

export const MEMBERSHIP_ROLES = {
  ORG_OWNER: 'ORG_OWNER',
  MANAGER: 'MANAGER',
  AGENT: 'AGENT',
  VIEWER: 'VIEWER',
} as const;

export const VALID_MEMBERSHIP_ROLES = [
  MEMBERSHIP_ROLES.ORG_OWNER,
  MEMBERSHIP_ROLES.MANAGER,
  MEMBERSHIP_ROLES.AGENT,
  MEMBERSHIP_ROLES.VIEWER,
] as const;

// ---------------------------------------------------------------------------
// Actor Type Constants (for audit logs)
// ---------------------------------------------------------------------------

export const ACTOR_TYPES = {
  ADMIN: 'admin',
  PORTAL_USER: 'portal_user',
  SYSTEM: 'system',
} as const;

export type ActorType = (typeof ACTOR_TYPES)[keyof typeof ACTOR_TYPES];

// ---------------------------------------------------------------------------
// Lead Capture Status (accepted/quarantined)
// ---------------------------------------------------------------------------

export const CAPTURE_STATUS = {
  ACCEPTED: 'accepted',
  QUARANTINED: 'quarantined',
} as const;

export type CaptureStatus = (typeof CAPTURE_STATUS)[keyof typeof CAPTURE_STATUS];

// ---------------------------------------------------------------------------
// GSI Index Names
// ---------------------------------------------------------------------------

export const GSI_INDEX_NAMES = {
  GSI1: 'GSI1',
  GSI2: 'GSI2',
  GSI3: 'GSI3',
} as const;

// ---------------------------------------------------------------------------
// Billing Tiers
// ---------------------------------------------------------------------------

export const BILLING_TIERS = {
  FREE: 'free',
  STARTER: 'starter',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

export const VALID_BILLING_TIERS = [
  BILLING_TIERS.FREE,
  BILLING_TIERS.STARTER,
  BILLING_TIERS.PRO,
  BILLING_TIERS.ENTERPRISE,
] as const;

// ---------------------------------------------------------------------------
// Analytics Granularity
// ---------------------------------------------------------------------------

export const ANALYTICS_GRANULARITY = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
} as const;

export const VALID_GRANULARITIES = [
  ANALYTICS_GRANULARITY.DAILY,
  ANALYTICS_GRANULARITY.WEEKLY,
  ANALYTICS_GRANULARITY.MONTHLY,
] as const;
