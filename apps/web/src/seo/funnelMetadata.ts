/**
 * Funnel Page Metadata Generation
 * SEO metadata for all 47 service funnel pages
 */

import type { Metadata } from 'next';
import type { Locale } from '@/i18n/routing';
import type { ServiceConfig } from '@/config/services';

// Import translation files directly for server-side metadata generation
import enMessages from '@/i18n/messages/en.json';
import esMessages from '@/i18n/messages/es.json';

type Messages = typeof enMessages;

const messages: Record<Locale, Messages> = {
  en: enMessages,
  es: esMessages,
};

/**
 * Funnel translation structure
 */
interface FunnelTranslation {
  meta?: {
    title?: string;
    description?: string;
    keywords?: string;
  };
  hero?: {
    headline?: string;
    subheadline?: string;
  };
  [key: string]: unknown;
}

/**
 * Generate metadata for a funnel page
 */
export function generateFunnelMetadata(service: ServiceConfig, locale: Locale): Metadata {
  const t = messages[locale] as Messages & { funnels?: Record<string, FunnelTranslation> };
  const funnel = t.funnels?.[service.slug];

  if (!funnel) {
    return {
      title: 'Service',
      description: 'Professional services',
    };
  }

  const title = funnel.meta?.title || funnel.hero?.headline || 'Service';
  const description = funnel.meta?.description || funnel.hero?.subheadline || 'Professional services';

  return {
    title,
    description,
    keywords: funnel.meta?.keywords,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: locale === 'es' ? 'es_ES' : 'en_US',
      siteName: 'Kanjona',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `/${locale}/${service.slug}`,
      languages: {
        en: `/en/${service.slug}`,
        es: `/es/${service.slug}`,
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

/**
 * Generate JSON-LD structured data for funnel pages
 */
export function generateFunnelJsonLd(service: ServiceConfig, locale: Locale) {
  const t = messages[locale] as Messages & { funnels?: Record<string, FunnelTranslation> };
  const funnel = t.funnels?.[service.slug];

  if (!funnel) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: funnel.hero?.headline || service.slug,
    description: funnel.hero?.subheadline || 'Professional services',
    provider: {
      '@type': 'Organization',
      name: 'Kanjona',
      url: 'https://kanjona.com',
    },
    areaServed: {
      '@type': 'Country',
      name: locale === 'es' ? 'Estados Unidos' : 'United States',
    },
    serviceType: service.slug.replace(/-/g, ' '),
  };
}
