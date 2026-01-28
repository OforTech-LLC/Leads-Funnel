import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import { getServiceBySlug, getAllServiceSlugs } from '@/config/services';
import {
  generateFunnelMetadata,
  generateFunnelFAQJsonLd,
  generateFunnelAggregateRatingJsonLd,
  generateBreadcrumbJsonLd,
} from '@/seo/funnelMetadata';
import { FunnelPageContent } from '@/components/funnel/FunnelPageContent';

/**
 * Generate static params for all locales and services
 * Creates 47 services x 2 locales = 94 static pages
 */
export function generateStaticParams() {
  const params: { locale: string; service: string }[] = [];

  for (const locale of routing.locales) {
    for (const slug of getAllServiceSlugs()) {
      params.push({ locale, service: slug });
    }
  }

  return params;
}

/**
 * Generate metadata for each funnel page
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; service: string }>;
}) {
  const { locale, service: serviceSlug } = await params;
  const serviceConfig = getServiceBySlug(serviceSlug);

  if (!serviceConfig) {
    return { title: 'Not Found' };
  }

  return generateFunnelMetadata(serviceConfig, locale as Locale);
}

/**
 * Service Funnel Page
 * Dynamic page for each of the 47 service funnels.
 *
 * Server Component handles metadata and JSON-LD structured data.
 * FunnelPageContent (Client Component) renders interactive content.
 */
export default async function ServiceFunnelPage({
  params,
}: {
  params: Promise<{ locale: string; service: string }>;
}) {
  const { locale, service: serviceSlug } = await params;

  // Enable static rendering
  setRequestLocale(locale);

  // Get service configuration
  const serviceConfig = getServiceBySlug(serviceSlug);

  if (!serviceConfig) {
    notFound();
  }

  // Generate structured data (FAQ + AggregateRating + Review + Breadcrumb schemas)
  const faqJsonLd = generateFunnelFAQJsonLd(serviceConfig, locale as Locale);
  const ratingJsonLd = generateFunnelAggregateRatingJsonLd(serviceConfig, locale as Locale);
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(serviceConfig, locale as Locale);

  return (
    <main style={{ minHeight: '100vh' }}>
      {/* FAQ Schema JSON-LD */}
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      {/* AggregateRating + Review Schema JSON-LD */}
      {ratingJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ratingJsonLd) }}
        />
      )}
      {/* BreadcrumbList Schema JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* All interactive content in Client Component boundary */}
      <FunnelPageContent service={serviceConfig} />
    </main>
  );
}
