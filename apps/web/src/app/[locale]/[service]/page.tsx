import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import { getServiceBySlug, getAllServiceSlugs } from '@/config/services';
import { FunnelHero, FunnelBenefits, FunnelForm } from '@/components/funnel';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Footer } from '@/components/Footer';
import {
  generateFunnelMetadata,
  generateFunnelFAQJsonLd,
  generateFunnelAggregateRatingJsonLd,
  generateBreadcrumbJsonLd,
} from '@/seo/funnelMetadata';
import { ExitIntent } from '@/components/ExitIntent';
import { StickyCTA } from '@/components/StickyCTA';
import { SocialProofBar } from '@/components/SocialProofBar';

/**
 * Lazy-load non-critical sections for better initial page performance.
 * These sections are below the fold and benefit from code splitting.
 */
const FunnelTestimonials = dynamic(() => import('@/components/funnel/FunnelTestimonials'), {
  loading: () => (
    <div
      className="h-96 animate-pulse bg-white/5 rounded-xl"
      style={{ height: '384px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }}
    />
  ),
});

const FunnelFAQ = dynamic(() => import('@/components/funnel/FunnelFAQ'), {
  loading: () => (
    <div
      className="h-64 animate-pulse bg-white/5 rounded-xl"
      style={{ height: '256px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }}
    />
  ),
});

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
 * Dynamic page for each of the 47 service funnels
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

      {/* Social Proof Bar */}
      <SocialProofBar variant="total" />

      {/* Header with Language Switcher */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          zIndex: 100,
        }}
      >
        <LanguageSwitcher />
      </header>

      {/* Hero Section */}
      <FunnelHero service={serviceConfig} />

      {/* Benefits Section */}
      <FunnelBenefits service={serviceConfig} />

      {/* Lead Form Section */}
      <FunnelForm service={serviceConfig} />

      {/* Testimonials Section (lazy-loaded) */}
      <FunnelTestimonials service={serviceConfig} />

      {/* FAQ Section (lazy-loaded) */}
      <FunnelFAQ service={serviceConfig} />

      {/* Footer with legal links */}
      <Footer accentColor={serviceConfig.color} />

      {/* Conversion optimization overlays */}
      <ExitIntent />
      <StickyCTA />
    </main>
  );
}
