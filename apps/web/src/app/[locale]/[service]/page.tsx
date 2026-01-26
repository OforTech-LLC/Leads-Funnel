import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import { services, getServiceBySlug, getAllServiceSlugs } from '@/config/services';
import { FunnelHero, FunnelBenefits, FunnelForm, FunnelTestimonials, FunnelFAQ } from '@/components/funnel';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { generateFunnelMetadata } from '@/seo/funnelMetadata';

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

  return (
    <main style={{ minHeight: '100vh' }}>
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

      {/* Footer */}
      <Footer color={serviceConfig.color} />
    </main>
  );
}

/**
 * Footer Component
 */
function Footer({ color }: { color: string }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        padding: '40px 24px',
        textAlign: 'center',
        backgroundColor: '#111',
        color: '#888',
      }}
    >
      <div style={{ marginBottom: '16px' }}>
        <a
          href="/"
          style={{
            color,
            fontWeight: 600,
            fontSize: '18px',
            textDecoration: 'none',
          }}
        >
          Kanjona
        </a>
      </div>
      <p style={{ fontSize: '14px' }}>&copy; {currentYear} Kanjona. All rights reserved.</p>
    </footer>
  );
}
