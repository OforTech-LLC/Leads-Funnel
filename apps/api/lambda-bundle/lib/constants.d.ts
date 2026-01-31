/**
 * Centralized constants for DynamoDB key prefixes, GSI names, sort key
 * values, and other magic strings used throughout the backend.
 *
 * All files MUST import from this module instead of hard-coding string
 * prefixes.  This avoids typo-induced bugs and makes future key-schema
 * changes a single-file edit.
 */
export declare const DB_PREFIXES: {
    /** Lead record:  PK = LEAD#<funnelId>#<leadId>  or  LEAD#<leadId> (capture handler) */
    readonly LEAD: "LEAD#";
    /** Organisation:  PK = ORG#<orgId> */
    readonly ORG: "ORG#";
    /** User:  PK = USER#<userId> */
    readonly USER: "USER#";
    /** Assignment rule:  PK = RULE#<ruleId> */
    readonly RULE: "RULE#";
    /** Audit log:  PK = AUDIT#<actorId> */
    readonly AUDIT: "AUDIT#";
    /** Notification:  PK = NOTIFY#<leadId> */
    readonly NOTIFY: "NOTIFY#";
    /** Export job:  PK = EXPORT#<exportId> */
    readonly EXPORT: "EXPORT#";
    /** Webhook config:  PK = WEBHOOK#<id> */
    readonly WEBHOOK: "WEBHOOK#";
    /** Webhook delivery:  PK = WHDELIVER#<webhookId> */
    readonly WHDELIVER: "WHDELIVER#";
    /** Unassigned lead queue:  PK = UNASSIGNED#<funnelId>  or  UNASSIGNED#<leadId> (worker) */
    readonly UNASSIGNED: "UNASSIGNED#";
    /** Rate limit counter:  PK = RATELIMIT#<userId>#<windowKey> */
    readonly RATELIMIT: "RATELIMIT#";
    /** IP-based rate limit (capture handler):  PK = IP#<ipHash> */
    readonly IP: "IP#";
    /** Idempotency record:  PK = IDEMPOTENCY#<key> */
    readonly IDEMPOTENCY: "IDEMPOTENCY#";
    /** Billing account:  PK = BILLING#<orgId> */
    readonly BILLING: "BILLING#";
    /** Billing usage:  SK = USAGE#<YYYY-MM> */
    readonly USAGE: "USAGE#";
    /** Analytics cache:  PK = ANALYTICS_CACHE#<cacheKey> */
    readonly ANALYTICS_CACHE: "ANALYTICS_CACHE#";
    /** Calendar config:  PK = CALENDAR#<userId> */
    readonly CALENDAR: "CALENDAR#";
    /** Export throttle:  PK = EXPORT_THROTTLE#<emailHash> */
    readonly EXPORT_THROTTLE: "EXPORT_THROTTLE#";
};
export declare const DB_SORT_KEYS: {
    /** Generic metadata sort key */
    readonly META: "META";
    /** Webhook config sort key */
    readonly CONFIG: "CONFIG";
    /** Rate limit sort key */
    readonly LIMIT: "LIMIT";
    /** Cap counter sort key */
    readonly COUNTER: "COUNTER";
    /** Billing account sort key */
    readonly ACCOUNT: "ACCOUNT";
    /** Analytics cache data sort key */
    readonly DATA: "DATA";
    /** Export throttle sort key */
    readonly THROTTLE: "THROTTLE";
};
export declare const GSI_KEYS: {
    /** GSI1PK for funnel-based lead queries:  FUNNEL#<funnelId> */
    readonly FUNNEL: "FUNNEL#";
    /** GSI2PK for org-based lead queries:  ORG#<orgId> */
    readonly ORG: "ORG#";
    /** GSI3PK for status-based lead queries:  STATUS#<funnelId>#<status> */
    readonly STATUS: "STATUS#";
    /** GSI1PK for user email lookup:  EMAIL#<email> */
    readonly EMAIL: "EMAIL#";
    /** GSI2PK for Cognito sub lookup:  COGNITOSUB#<sub> */
    readonly COGNITOSUB: "COGNITOSUB#";
    /** GSI1PK for org webhooks listing:  ORG#<orgId>#WEBHOOKS */
    readonly ORG_WEBHOOKS_SUFFIX: "#WEBHOOKS";
    /** GSI1SK / GSI2SK / GSI3SK date prefix:  CREATED#<iso> */
    readonly CREATED: "CREATED#";
    /** GSI2SK for assigned leads:  ASSIGNED#<iso> */
    readonly ASSIGNED: "ASSIGNED#";
    /** GSI1SK for rule priority:  PRIORITY#<padded> */
    readonly PRIORITY: "PRIORITY#";
    /** GSI sort key prefix for membership:  MEMBER#<userId> */
    readonly MEMBER: "MEMBER#";
    /** GSI sort key prefix for org invites: INVITE#<email> */
    readonly INVITE: "INVITE#";
    /** Fixed GSI PK for global org listing */
    readonly ORGS_LIST: "ORGS";
    /** Fixed GSI PK for global user listing */
    readonly USERS_LIST: "USERS";
    /** Fixed GSI PK for global audit log */
    readonly AUDITLOG: "AUDITLOG";
    /** Fixed GSI PK for global notification log */
    readonly NOTIFYLOG: "NOTIFYLOG";
    /** Fixed GSI PK for global export listing */
    readonly EXPORTS_LIST: "EXPORTS";
    /** Worker GSI: ORG#<orgId>#LEADS */
    readonly ORG_LEADS_SUFFIX: "#LEADS";
    /** Worker GSI: USER#<userId>#LEADS */
    readonly USER_LEADS_SUFFIX: "#LEADS";
};
export declare const SK_PREFIXES: {
    /** Window sort key for IP rate limit:  WINDOW#<bucket> */
    readonly WINDOW: "WINDOW#";
    /** Cap daily key:  #CAP#DAILY#<date> */
    readonly CAP_DAILY: "#CAP#DAILY#";
    /** Cap monthly key:  #CAP#MONTHLY#<month> */
    readonly CAP_MONTHLY: "#CAP#MONTHLY#";
};
export declare const EVENT_TYPES: {
    readonly LEAD_CREATED: "lead.created";
    readonly LEAD_ASSIGNED: "lead.assigned";
    readonly LEAD_UNASSIGNED: "lead.unassigned";
    readonly LEAD_STATUS_CHANGED: "lead.status_changed";
    readonly LEAD_NOTE_ADDED: "lead.note_added";
};
export declare const EVENT_SOURCE = "kanjona.leads";
export declare const ERROR_CODES: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly AUTH_ERROR: "AUTH_ERROR";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly CONFLICT: "CONFLICT";
    readonly RATE_LIMITED: "RATE_LIMITED";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly BAD_REQUEST: "BAD_REQUEST";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE";
};
/** 1 MB body size limit for admin/portal handlers */
export declare const MAX_BODY_SIZE: number;
/** 10 KB body size limit for the lead capture handler */
export declare const MAX_LEAD_PAYLOAD_SIZE: number;
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly METHOD_NOT_ALLOWED: 405;
    readonly CONFLICT: 409;
    readonly PAYLOAD_TOO_LARGE: 413;
    readonly RATE_LIMITED: 429;
    readonly INTERNAL_ERROR: 500;
    readonly SERVICE_UNAVAILABLE: 503;
};
export declare const HTTP_HEADERS: {
    readonly CONTENT_TYPE: "Content-Type";
    readonly AUTHORIZATION: "Authorization";
    readonly AUTHORIZATION_LOWER: "authorization";
    readonly CACHE_CONTROL: "Cache-Control";
    readonly X_REQUEST_ID: "X-Request-Id";
    readonly X_CONTENT_TYPE_OPTIONS: "X-Content-Type-Options";
    readonly X_FRAME_OPTIONS: "X-Frame-Options";
    readonly X_XSS_PROTECTION: "X-XSS-Protection";
    readonly CONTENT_SECURITY_POLICY: "Content-Security-Policy";
    readonly RETRY_AFTER: "Retry-After";
    readonly ACCESS_CONTROL_ALLOW_ORIGIN: "Access-Control-Allow-Origin";
    readonly ACCESS_CONTROL_ALLOW_METHODS: "Access-Control-Allow-Methods";
    readonly ACCESS_CONTROL_ALLOW_HEADERS: "Access-Control-Allow-Headers";
    readonly ACCESS_CONTROL_ALLOW_CREDENTIALS: "Access-Control-Allow-Credentials";
    readonly VARY: "Vary";
    readonly PRAGMA: "Pragma";
};
export declare const CONTENT_TYPES: {
    readonly JSON: "application/json";
    readonly FORM_URLENCODED: "application/x-www-form-urlencoded";
};
export declare const ADMIN_ROLES: {
    readonly ADMIN: "ADMIN";
    readonly VIEWER: "VIEWER";
};
export declare const MEMBERSHIP_ROLES: {
    readonly ORG_OWNER: "ORG_OWNER";
    readonly MANAGER: "MANAGER";
    readonly AGENT: "AGENT";
    readonly VIEWER: "VIEWER";
};
export declare const VALID_MEMBERSHIP_ROLES: readonly ["ORG_OWNER", "MANAGER", "AGENT", "VIEWER"];
export declare const ACTOR_TYPES: {
    readonly ADMIN: "admin";
    readonly PORTAL_USER: "portal_user";
    readonly SYSTEM: "system";
};
export type ActorType = (typeof ACTOR_TYPES)[keyof typeof ACTOR_TYPES];
export declare const CAPTURE_STATUS: {
    readonly ACCEPTED: "accepted";
    readonly QUARANTINED: "quarantined";
};
export type CaptureStatus = (typeof CAPTURE_STATUS)[keyof typeof CAPTURE_STATUS];
export declare const GSI_INDEX_NAMES: {
    readonly GSI1: "GSI1";
    readonly GSI2: "GSI2";
    readonly GSI3: "GSI3";
};
export declare const BILLING_TIERS: {
    readonly FREE: "free";
    readonly STARTER: "starter";
    readonly PRO: "pro";
    readonly ENTERPRISE: "enterprise";
};
export declare const VALID_BILLING_TIERS: readonly ["free", "starter", "pro", "enterprise"];
export declare const ANALYTICS_GRANULARITY: {
    readonly DAILY: "daily";
    readonly WEEKLY: "weekly";
    readonly MONTHLY: "monthly";
};
export declare const VALID_GRANULARITIES: readonly ["daily", "weekly", "monthly"];
