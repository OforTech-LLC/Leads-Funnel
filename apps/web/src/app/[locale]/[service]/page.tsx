import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import { services, getServiceBySlug, getAllServiceSlugs } from '@/config/services';
import {
  FunnelHero,
  FunnelBenefits,
  FunnelForm,
  FunnelTestimonials,
  FunnelFAQ,
} from '@/components/funnel';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Footer } from '@/components/Footer';
import {
  generateFunnelMetadata,
  generateFunnelJsonLd,
  generateFunnelFAQJsonLd,
  generateFunnelAggregateRatingJsonLd,
} from '@/seo/funnelMetadata';
import { ExitIntent } from '@/components/ExitIntent';
import { StickyCTA } from '@/components/StickyCTA';
import { SocialProofBar } from '@/components/SocialProofBar';

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

  // Generate structured data (FAQ + AggregateRating + Review schemas)
  const faqJsonLd = generateFunnelFAQJsonLd(serviceConfig, locale as Locale);
  const ratingJsonLd = generateFunnelAggregateRatingJsonLd(serviceConfig, locale as Locale);

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

      {/* Testimonials Section */}
      <FunnelTestimonials service={serviceConfig} />

      {/* FAQ Section */}
      <FunnelFAQ service={serviceConfig} />

      {/* Footer with legal links */}
      <Footer accentColor={serviceConfig.color} />

      {/* Conversion optimization overlays */}
      <ExitIntent />
      <StickyCTA />
    </main>
  );
}
