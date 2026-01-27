'use client';

/**
 * Google Analytics 4 Integration
 * Loads gtag.js and provides helper functions for event tracking.
 * Only loads when NEXT_PUBLIC_GA_MEASUREMENT_ID is set.
 */

import Script from 'next/script';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Declare gtag on window for TypeScript
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Track a custom event in GA4
 */
export function trackEvent(action: string, category: string, label?: string, value?: number) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}

/**
 * Track a successful form submission
 */
export function trackFormSubmission(funnelId: string) {
  trackEvent('form_submission', 'lead_form', funnelId);
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'generate_lead', {
      currency: 'USD',
      value: 1,
      funnel_id: funnelId,
    });
  }
}

/**
 * Track form abandonment (user leaves without submitting)
 */
export function trackFormAbandonment(funnelId: string, lastField: string) {
  trackEvent('form_abandonment', 'lead_form', `${funnelId}:${lastField}`);
}

/**
 * GoogleAnalytics Component
 * Renders the GA4 script tags. Include once in the root layout.
 */
export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
            send_page_view: true
          });
        `}
      </Script>
    </>
  );
}

export default GoogleAnalytics;
