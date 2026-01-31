'use client';

/**
 * Google Analytics 4 Integration
 * Loads gtag.js and provides helper functions for event tracking.
 * Only loads when NEXT_PUBLIC_GA_MEASUREMENT_ID is set AND the user has
 * consented to analytics cookies (GDPR/CCPA compliant).
 */

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { STORAGE_KEYS, CUSTOM_EVENTS } from '@/lib/constants';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const CONSENT_STORAGE_KEY = STORAGE_KEYS.COOKIE_CONSENT;

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
 * Read analytics consent from localStorage.
 * Returns true only when the user has explicitly accepted analytics cookies.
 */
function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed.analytics === true;
  } catch {
    return false;
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
 * Respects cookie consent -- will not load GA if the user has not consented
 * to analytics cookies. Listens for runtime consent changes via a custom event.
 */
export function GoogleAnalytics({ nonce }: { nonce?: string }) {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    // Check initial consent state
    setConsented(hasAnalyticsConsent());

    // Listen for consent changes dispatched by the CookieConsent component
    const handleConsentChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setConsented(detail?.analytics === true);
    };

    window.addEventListener(CUSTOM_EVENTS.COOKIE_CONSENT_CHANGE, handleConsentChange);
    return () => {
      window.removeEventListener(CUSTOM_EVENTS.COOKIE_CONSENT_CHANGE, handleConsentChange);
    };
  }, []);

  // Don't load GA if no measurement ID or no consent
  if (!GA_MEASUREMENT_ID || !consented) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="google-analytics" strategy="afterInteractive" nonce={nonce}>
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
