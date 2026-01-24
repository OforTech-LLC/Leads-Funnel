/**
 * UTM Parameter handling utilities
 * Extracts and manages UTM tracking parameters from URLs
 */

import type { LeadUtm } from '@kanjona/shared';

/**
 * UTM parameters interface (re-exported from shared)
 */
export type UTMParams = LeadUtm;

/**
 * Valid UTM parameter keys
 */
const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

/**
 * Parse UTM parameters from URL search params
 */
export function parseUTMParams(searchParams: URLSearchParams): UTMParams {
  const utm: UTMParams = {};

  UTM_KEYS.forEach((key) => {
    const value = searchParams.get(key);
    if (value) {
      utm[key] = value;
    }
  });

  return utm;
}

/**
 * Parse UTM parameters from a URL string
 */
export function parseUTMFromUrl(url: string): UTMParams {
  try {
    const urlObj = new URL(url);
    return parseUTMParams(urlObj.searchParams);
  } catch {
    return {};
  }
}

/**
 * Get UTM parameters from the current window location
 * Safe for server-side rendering
 */
export function getUTMFromWindow(): UTMParams {
  if (typeof window === 'undefined') {
    return {};
  }

  return parseUTMParams(new URLSearchParams(window.location.search));
}

/**
 * Store UTM parameters in session storage for persistence across page navigations
 */
export function storeUTMParams(utm: UTMParams): void {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }

  try {
    // Only store if we have at least one UTM param
    if (Object.keys(utm).length > 0) {
      window.sessionStorage.setItem('utm_params', JSON.stringify(utm));
    }
  } catch {
    // Silently fail if storage is not available
  }
}

/**
 * Retrieve stored UTM parameters from session storage
 */
export function getStoredUTMParams(): UTMParams {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return {};
  }

  try {
    const stored = window.sessionStorage.getItem('utm_params');
    if (stored) {
      return JSON.parse(stored) as UTMParams;
    }
  } catch {
    // Silently fail if storage is not available or parsing fails
  }

  return {};
}

/**
 * Get the best available UTM parameters
 * First checks current URL, then falls back to stored params
 */
export function getBestUTMParams(): UTMParams {
  const currentUtm = getUTMFromWindow();

  // If we have current UTM params, store them and return
  if (Object.keys(currentUtm).length > 0) {
    storeUTMParams(currentUtm);
    return currentUtm;
  }

  // Fall back to stored params
  return getStoredUTMParams();
}

/**
 * Get current page URL (safe for SSR)
 */
export function getCurrentPageUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.href;
}

/**
 * Get document referrer (safe for SSR)
 */
export function getReferrer(): string {
  if (typeof document === 'undefined') {
    return '';
  }
  return document.referrer || '';
}
