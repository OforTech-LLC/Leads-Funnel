/**
 * Umedspa Landing Page
 *
 * Individual landing page with localized content.
 */

import { setRequestLocale } from 'next-intl/server';
import { type Locale } from '@/i18n/routing';
import { ServiceLandingLayout } from '@/components/landing';
import { getLocalizedLandingPageConfig } from '@/config/localized-landing-pages';
import { notFound } from 'next/navigation';

const SERVICE_ID = 'medspa';


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
    openGraph: {
      title: config.seo.title,
      description: config.seo.description,
      locale,
      type: 'website',
    },
  };
}

export default async function UmedspaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

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
