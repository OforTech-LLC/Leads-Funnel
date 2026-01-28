'use client';

/**
 * Funnel Page Content (Client Component)
 *
 * Wraps all interactive funnel page content in a single Client Component
 * boundary. This resolves the Next.js 15 prerendering issue where
 * next-intl's Link component (which wraps next/link with onFocus/onBlur
 * prefetch handlers) cannot be serialized across the Server/Client boundary
 * during static generation.
 *
 * The parent Server Component page handles metadata and JSON-LD only.
 */

import type { ServiceConfig } from '@/config/services';
import { FunnelHero, FunnelBenefits, FunnelForm } from '@/components/funnel';
import { FunnelTestimonials } from '@/components/funnel/FunnelTestimonials';
import { FunnelFAQ } from '@/components/funnel/FunnelFAQ';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Footer } from '@/components/Footer';
import { ExitIntent } from '@/components/ExitIntent';
import { StickyCTA } from '@/components/StickyCTA';
import { SocialProofBar } from '@/components/SocialProofBar';

interface FunnelPageContentProps {
  service: ServiceConfig;
}

export function FunnelPageContent({ service }: FunnelPageContentProps) {
  return (
    <>
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
      <FunnelHero service={service} />

      {/* Benefits Section */}
      <FunnelBenefits service={service} />

      {/* Lead Form Section */}
      <FunnelForm service={service} />

      {/* Testimonials Section */}
      <FunnelTestimonials service={service} />

      {/* FAQ Section */}
      <FunnelFAQ service={service} />

      {/* Footer with legal links */}
      <Footer accentColor={service.color} />

      {/* Conversion optimization overlays */}
      <ExitIntent />
      <StickyCTA />
    </>
  );
}

export default FunnelPageContent;
