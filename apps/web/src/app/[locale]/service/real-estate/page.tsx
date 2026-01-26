/**
 * Real Estate Landing Page
 *
 * Individual landing page for real estate services.
 * Uses the glassmorphism design system with localized content.
 */

import { setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import { ServiceLandingLayout } from '@/components/landing';
import { getLocalizedLandingPageConfig } from '@/config/localized-landing-pages';
import { notFound } from 'next/navigation';

const SERVICE_ID = 'real-estate';

/**
 * Generate static params for all locales
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Generate metadata for this service page
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const config = getLocalizedLandingPageConfig(SERVICE_ID, locale as Locale);

  if (!config) {
    return { title: 'Not Found' };
  }

  return {
    title: config.seo.title,
    description: config.seo.description,
    keywords: config.seo.keywords,
    openGraph: {
      title: config.seo.title,
      description: config.seo.description,
      locale,
      type: 'website',
    },
  };
}

/**
 * Real Estate Service Page
 */
export default async function RealEstatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale);

  // Get localized service configuration
  const config = getLocalizedLandingPageConfig(SERVICE_ID, locale as Locale);

  if (!config) {
    notFound();
  }

  return (
    <ServiceLandingLayout
      service={config.service}
      sections={[
        { type: 'hero', enabled: true, config: config.hero },
        { type: 'benefits', enabled: true, config: config.benefits },
        { type: 'process', enabled: true, config: config.process },
        { type: 'testimonials', enabled: true, config: config.testimonials },
        { type: 'faq', enabled: true, config: config.faq },
        { type: 'cta', enabled: true, config: config.form },
      ]}
    />
  );
}
