/**
 * Web Vitals Monitoring
 * Tracks Core Web Vitals (LCP, FID, CLS, TTFB, INP) for performance monitoring
 */

// ============================================================================
// Types
// ============================================================================

interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

interface AnalyticsPayload {
  metric: WebVitalsMetric;
  url: string;
  timestamp: number;
  userAgent: string;
  connectionType?: string;
}

type ReportHandler = (metric: WebVitalsMetric) => void;

// Type for web-vitals Metric (we define our own to avoid import issues)
interface Metric {
  name: string;
  value: number;
  delta: number;
  id: string;
  navigationType?: string;
}

// Type for web-vitals module
interface WebVitalsModule {
  onLCP: (callback: (metric: Metric) => void) => void;
  onFID: (callback: (metric: Metric) => void) => void;
  onCLS: (callback: (metric: Metric) => void) => void;
  onTTFB: (callback: (metric: Metric) => void) => void;
  onINP: (callback: (metric: Metric) => void) => void;
  onFCP: (callback: (metric: Metric) => void) => void;
}

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// ============================================================================
// Thresholds based on Google's Core Web Vitals guidelines
// ============================================================================

const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
  FID: { good: 100, poor: 300 }, // First Input Delay (ms)
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift (score)
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte (ms)
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint (ms)
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
};

// ============================================================================
// Rating Calculation
// ============================================================================

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

// ============================================================================
// Console Reporter (Development)
// ============================================================================

const RATING_COLORS = {
  good: '#0CCE6B',
  'needs-improvement': '#FFA400',
  poor: '#FF4E42',
};

function reportToConsole(metric: WebVitalsMetric): void {
  const color = RATING_COLORS[metric.rating];
  const unit = metric.name === 'CLS' ? '' : 'ms';

  console.log(
    `%c[Web Vitals] ${metric.name}: ${metric.value.toFixed(metric.name === 'CLS' ? 3 : 0)}${unit} (${metric.rating})`,
    `color: ${color}; font-weight: bold;`
  );

  // Additional context for poor metrics
  if (metric.rating === 'poor') {
    const threshold = THRESHOLDS[metric.name as keyof typeof THRESHOLDS];
    if (threshold) {
      console.log(
        `%c  Target: <${threshold.good}${unit} (good), <${threshold.poor}${unit} (needs improvement)`,
        'color: #888; font-size: 11px;'
      );
    }
  }
}

// ============================================================================
// Analytics Reporter (Production)
// ============================================================================

function reportToAnalytics(metric: WebVitalsMetric): void {
  const payload: AnalyticsPayload = {
    metric,
    url: window.location.href,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    connectionType: getConnectionType(),
  };

  // Send to analytics endpoint
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    navigator.sendBeacon('/api/analytics/vitals', blob);
  } else {
    // Fallback for browsers without sendBeacon
    fetch('/api/analytics/vitals', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {
      // Silently fail - analytics should not affect user experience
    });
  }

  // Also send to Google Analytics if available
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getConnectionType(): string | undefined {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const connection = (navigator as { connection?: { effectiveType?: string } }).connection;
    return connection?.effectiveType;
  }
  return undefined;
}

// ============================================================================
// Main Export: initWebVitals
// ============================================================================

/**
 * Initialize Web Vitals monitoring
 * In development: Reports to console with color-coded ratings
 * In production: Reports to analytics endpoint
 *
 * @param customHandler - Optional custom handler for metrics
 */
export async function initWebVitals(customHandler?: ReportHandler): Promise<void> {
  // Only run on client
  if (typeof window === 'undefined') return;

  try {
    // Dynamic import to avoid bundling web-vitals in SSR
    // Using dynamic import with explicit type assertion
    const webVitals = (await import(/* webpackIgnore: true */ 'web-vitals')) as WebVitalsModule;

    const isDev = process.env.NODE_ENV === 'development';

    const handleMetric = (metric: Metric) => {
      const enhancedMetric: WebVitalsMetric = {
        name: metric.name,
        value: metric.value,
        rating: getRating(metric.name, metric.value),
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType || 'unknown',
      };

      // Always call custom handler if provided
      if (customHandler) {
        customHandler(enhancedMetric);
      }

      // Report based on environment
      if (isDev) {
        reportToConsole(enhancedMetric);
      } else {
        reportToAnalytics(enhancedMetric);
      }
    };

    // Register all Core Web Vitals
    webVitals.onLCP(handleMetric);
    webVitals.onFID(handleMetric);
    webVitals.onCLS(handleMetric);
    webVitals.onTTFB(handleMetric);
    webVitals.onINP(handleMetric);
    webVitals.onFCP(handleMetric);
  } catch (error) {
    // Silently fail if web-vitals is not available
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Web Vitals] Failed to initialize:', error);
    }
  }
}

/**
 * Get current performance timing data
 * Useful for custom performance tracking
 */
export function getPerformanceTiming(): Record<string, number> | null {
  if (typeof window === 'undefined' || !window.performance) return null;

  const timing = performance.timing;
  if (!timing) return null;

  return {
    dns: timing.domainLookupEnd - timing.domainLookupStart,
    tcp: timing.connectEnd - timing.connectStart,
    ttfb: timing.responseStart - timing.requestStart,
    download: timing.responseEnd - timing.responseStart,
    domParsing: timing.domInteractive - timing.responseEnd,
    domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
    load: timing.loadEventEnd - timing.navigationStart,
  };
}

/**
 * Track custom performance marks
 */
export function markPerformance(name: string): void {
  if (typeof window !== 'undefined' && window.performance) {
    performance.mark(name);
  }
}

/**
 * Measure time between two performance marks
 */
export function measurePerformance(
  name: string,
  startMark: string,
  endMark?: string
): number | null {
  if (typeof window === 'undefined' || !window.performance) return null;

  try {
    if (endMark) {
      performance.measure(name, startMark, endMark);
    } else {
      performance.measure(name, startMark);
    }

    const entries = performance.getEntriesByName(name, 'measure');
    const entry = entries[entries.length - 1];
    return entry ? entry.duration : null;
  } catch {
    return null;
  }
}

export default initWebVitals;
