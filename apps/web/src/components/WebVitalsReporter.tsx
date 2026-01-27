'use client';

/**
 * Web Vitals Reporter Component
 *
 * Client-side component that initializes Web Vitals monitoring.
 * Place this component in your root layout to enable performance tracking.
 *
 * Usage:
 * import { WebVitalsReporter } from '@/components/WebVitalsReporter';
 *
 * // In your layout:
 * <WebVitalsReporter />
 */

import { useEffect } from 'react';
import { initWebVitals } from '@/lib/webVitals';

interface WebVitalsReporterProps {
  /**
   * Enable debug mode (logs all metrics to console regardless of environment)
   */
  debug?: boolean;
}

export function WebVitalsReporter({ debug = false }: WebVitalsReporterProps) {
  useEffect(() => {
    // Initialize web vitals monitoring
    initWebVitals(
      debug
        ? (metric) => {
            console.log('[Web Vitals Debug]', metric);
          }
        : undefined
    );
  }, [debug]);

  // This component renders nothing
  return null;
}

export default WebVitalsReporter;
