/**
 * Centralized constants for the Web (landing pages) app.
 *
 * Avoids hardcoded strings scattered across components.
 */

// ---------------------------------------------------------------------------
// Storage Keys (localStorage)
// ---------------------------------------------------------------------------

export const STORAGE_KEYS = {
  COOKIE_CONSENT: 'cookie-consent',
} as const;

// ---------------------------------------------------------------------------
// Custom Event Names
// ---------------------------------------------------------------------------

export const CUSTOM_EVENTS = {
  COOKIE_CONSENT_CHANGE: 'cookie-consent-change',
} as const;
