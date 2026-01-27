/**
 * Web Vitals Tracking (re-export)
 * Re-exports from the main webVitals module for convenience.
 * The primary implementation is in webVitals.ts which already handles
 * LCP, FID, CLS, TTFB, INP, FCP tracking and GA4 integration.
 */

export { initWebVitals as reportWebVitals } from './webVitals';
