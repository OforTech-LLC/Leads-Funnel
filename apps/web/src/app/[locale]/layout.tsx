import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import { generatePageMetadata } from '@/seo/metadata';
import { generateAllJsonLd } from '@/seo/jsonld';
import { StoreProvider } from './StoreProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { WebVitalsReporter } from '@/components/WebVitalsReporter';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { CookieConsent } from '@/components/CookieConsent';
import { SkipToContent } from '@/components/SkipToContent';

import '../globals.css';

/**
 * Generate static params for all supported locales
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Generate metadata for the locale
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as Locale)) {
    return {};
  }

  return generatePageMetadata(locale as Locale);
}

/**
 * Loading fallback for Suspense boundaries
 */
function LoadingFallback() {
  return (
    <div style={loadingStyles.container} role="status">
      <div style={loadingStyles.spinner} />
      <span className="sr-only">Loading...</span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/**
 * Root layout for locale-specific pages
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Get messages for the locale
  const messages = await getMessages();

  // Generate JSON-LD
  const jsonLd = generateAllJsonLd(locale as Locale);

  return (
    <html lang={locale}>
      <head>
        {/* JSON-LD Structured Data */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </head>
      <body style={bodyStyles}>
        {/* Skip-to-content link (WCAG 2.4.1 - Bypass Blocks) */}
        <SkipToContent />

        {/* Google Analytics 4 - respects cookie consent */}
        <GoogleAnalytics />
        <NextIntlClientProvider messages={messages}>
          <StoreProvider>
            {/* ErrorBoundary is a Client Component - do not pass onError from Server Component */}
            {/* Error logging is handled internally by ErrorBoundary's componentDidCatch */}
            <ErrorBoundary>
              <Suspense fallback={<LoadingFallback />}>
                <div id="main-content">{children}</div>
              </Suspense>
            </ErrorBoundary>
            {/* Core Web Vitals tracking */}
            <WebVitalsReporter />
            {/* Cookie Consent Banner - GDPR/CCPA compliant */}
            <CookieConsent />
          </StoreProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

// ============================================================================
// Extracted Styles (prevents new object creation on each render)
// ============================================================================

/**
 * Minimal body styles - neutral to allow page-level theming
 */
const bodyStyles: React.CSSProperties = {
  margin: 0,
  padding: 0,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  lineHeight: 1.6,
  minHeight: '100vh',
};

/**
 * Loading fallback styles
 */
const loadingStyles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#0f0f13',
  } as React.CSSProperties,
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  } as React.CSSProperties,
};
