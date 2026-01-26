/**
 * Electrician Landing Page
 */

import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { ServiceLandingLayout } from '@/components/landing';
import { getLandingPageConfig } from '@/config/landing-pages';
import { notFound } from 'next/navigation';

const SERVICE_ID = 'electrician';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const config = getLandingPageConfig(SERVICE_ID);
  if (!config) return { title: 'Not Found' };

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

export default async function ElectricianPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const config = getLandingPageConfig(SERVICE_ID);
  if (!config) notFound();

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
