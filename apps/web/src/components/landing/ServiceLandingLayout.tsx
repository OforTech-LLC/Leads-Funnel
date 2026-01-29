'use client';

/**
 * Service Landing Layout
 *
 * Data-driven layout component for all service landing pages.
 * Accepts configuration objects and renders appropriate sections.
 *
 * Accessibility:
 * - Ambient glow divs have aria-hidden="true"
 * - Language switcher SVGs have aria-hidden="true"
 * - Language switcher button has aria-label and aria-expanded
 * - Footer text uses text.tertiary (not text.muted) for WCAG AA contrast
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter, usePathname } from '@/i18n/navigation';
import { tokens } from '@/design-system';
import {
  HeroSection,
  BenefitsSection,
  ProcessSection,
  TestimonialsSection,
  FAQSection,
  LeadCaptureForm,
} from './sections';

// Lazy load HeroVideo to handle missing video files gracefully
const HeroVideo = React.lazy(() =>
  import('@/components/HeroVideo').then((mod) => ({ default: mod.HeroVideo }))
);

// =============================================================================
// Types
// =============================================================================

export interface ServiceConfig {
  id: string;
  name: string;
  tagline: string;
  description: string;
  ctaText: string;
  ctaSubtext?: string;
  phone?: string;
  gradient: string;
  accentColor: string;
}

interface HeroConfig {
  badge?: string;
  headline: string;
  subheadline?: string;
  description: string;
  primaryCta: string;
  secondaryCta?: string;
  stats?: Array<{ value: string; label: string }>;
}

interface BenefitItem {
  icon: string;
  title: string;
  description: string;
}

interface BenefitsConfig {
  title: string;
  subtitle?: string;
  items: BenefitItem[];
}

interface ProcessStep {
  number: number;
  title: string;
  description: string;
}

interface ProcessConfig {
  title: string;
  subtitle?: string;
  steps: ProcessStep[];
  variant: 'horizontal' | 'timeline';
}

interface TestimonialItem {
  quote: string;
  author: string;
  role?: string;
  rating: number;
}

interface TestimonialsConfig {
  title: string;
  subtitle?: string;
  items: TestimonialItem[];
  variant: 'grid' | 'featured';
}

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQConfig {
  title: string;
  subtitle?: string;
  items: FAQItem[];
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

interface FormConfig {
  title: string;
  subtitle?: string;
  fields: FormField[];
  submitText: string;
}

export type SectionType =
  | 'hero'
  | 'benefits'
  | 'process'
  | 'testimonials'
  | 'gallery'
  | 'faq'
  | 'cta';

export interface SectionConfig {
  type: SectionType;
  enabled: boolean;
  config?:
    | HeroConfig
    | BenefitsConfig
    | ProcessConfig
    | TestimonialsConfig
    | FAQConfig
    | FormConfig;
}

interface ServiceLandingLayoutProps {
  service: ServiceConfig;
  sections: SectionConfig[];
  children?: React.ReactNode;
}

// =============================================================================
// Component
// =============================================================================

// Language options
const languages = [
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
];

export const ServiceLandingLayout: React.FC<ServiceLandingLayoutProps> = ({
  service,
  sections,
  children,
}) => {
  const [showContent, setShowContent] = useState(true); // Skip video for now
  const [videoComplete, setVideoComplete] = useState(true); // Skip video for now
  const [skipVideo] = useState(true); // Set to false to enable hero video
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  // Get current locale from URL (usePathname from next-intl doesn't include locale)
  const [currentLocale, setCurrentLocale] = useState('en');

  useEffect(() => {
    // Get locale from window.location since next-intl's usePathname strips it
    if (typeof window !== 'undefined') {
      const locale = window.location.pathname.split('/')[1];
      if (locale === 'en' || locale === 'es') {
        setCurrentLocale(locale);
      }
    }
  }, [pathname]);

  // Switch language using next-intl router
  const switchLanguage = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale as 'en' | 'es' });
    setCurrentLocale(newLocale);
    setLangMenuOpen(false);
  };

  // For future: Initialize animations when GSAP is properly configured
  useEffect(() => {
    // Animation setup will be added when GSAP path resolution is fixed
  }, [videoComplete]);

  const handleVideoComplete = () => {
    setVideoComplete(true);
    setTimeout(() => setShowContent(true), 100);
  };

  // Render section based on type and config
  const renderSection = (section: SectionConfig) => {
    if (!section.enabled || !section.config) return null;

    switch (section.type) {
      case 'hero':
        const heroConfig = section.config as HeroConfig;
        return (
          <section
            key="hero"
            style={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: `${tokens.spacing[20]} ${tokens.spacing[6]}`,
              position: 'relative',
            }}
          >
            <div style={{ maxWidth: '1280px', width: '100%', margin: '0 auto' }}>
              <HeroSection
                badge={heroConfig.badge}
                headline={heroConfig.headline}
                subheadline={heroConfig.subheadline}
                description={heroConfig.description}
                primaryCta={heroConfig.primaryCta}
                secondaryCta={heroConfig.secondaryCta}
                phone={service.phone}
                stats={heroConfig.stats}
                accentColor={service.accentColor}
                gradient={service.gradient}
              />
            </div>
          </section>
        );

      case 'benefits':
        const benefitsConfig = section.config as BenefitsConfig;
        return (
          <section
            key="benefits"
            style={{
              padding: `${tokens.spacing[20]} ${tokens.spacing[6]}`,
              position: 'relative',
            }}
          >
            <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
              <BenefitsSection
                title={benefitsConfig.title}
                subtitle={benefitsConfig.subtitle}
                benefits={benefitsConfig.items}
                accentColor={service.accentColor}
              />
            </div>
          </section>
        );

      case 'process':
        const processConfig = section.config as ProcessConfig;
        return (
          <section
            key="process"
            style={{
              padding: `${tokens.spacing[20]} ${tokens.spacing[6]}`,
              background: tokens.colors.surface.glass,
              position: 'relative',
            }}
          >
            <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
              <ProcessSection
                title={processConfig.title}
                subtitle={processConfig.subtitle}
                steps={processConfig.steps}
                variant={processConfig.variant}
                accentColor={service.accentColor}
              />
            </div>
          </section>
        );

      case 'testimonials':
        const testimonialsConfig = section.config as TestimonialsConfig;
        return (
          <section
            key="testimonials"
            style={{
              padding: `${tokens.spacing[20]} ${tokens.spacing[6]}`,
              position: 'relative',
            }}
          >
            <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
              <TestimonialsSection
                title={testimonialsConfig.title}
                subtitle={testimonialsConfig.subtitle}
                testimonials={testimonialsConfig.items}
                variant={testimonialsConfig.variant}
                accentColor={service.accentColor}
              />
            </div>
          </section>
        );

      case 'faq':
        const faqConfig = section.config as FAQConfig;
        return (
          <section
            key="faq"
            style={{
              padding: `${tokens.spacing[20]} ${tokens.spacing[6]}`,
              background: tokens.colors.surface.glass,
              position: 'relative',
            }}
          >
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <FAQSection
                title={faqConfig.title}
                subtitle={faqConfig.subtitle}
                faqs={faqConfig.items}
                accentColor={service.accentColor}
              />
            </div>
          </section>
        );

      case 'cta':
        const formConfig = section.config as FormConfig;
        return (
          <section
            key="cta"
            id="contact"
            style={{
              padding: `${tokens.spacing[24]} ${tokens.spacing[6]}`,
              position: 'relative',
              background: `linear-gradient(180deg, transparent 0%, ${service.accentColor}10 100%)`,
            }}
          >
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <LeadCaptureForm
                title={formConfig.title}
                subtitle={formConfig.subtitle}
                fields={formConfig.fields}
                submitText={formConfig.submitText}
                accentColor={service.accentColor}
                serviceId={service.id}
              />
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: tokens.colors.background.primary,
        color: tokens.colors.text.primary,
        fontFamily: tokens.typography.fontFamily.sans,
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* Animated ambient background glows (decorative, hidden from AT) */}
      <motion.div
        aria-hidden="true"
        className="ambient-glow"
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'fixed',
          top: '10%',
          left: '5%',
          width: '40vw',
          height: '40vw',
          background: `radial-gradient(circle, ${service.accentColor}25 0%, transparent 70%)`,
          filter: 'blur(100px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <motion.div
        aria-hidden="true"
        className="ambient-glow"
        animate={{
          x: [0, -40, 30, 0],
          y: [0, 30, -20, 0],
          scale: [1, 0.9, 1.15, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
        style={{
          position: 'fixed',
          bottom: '20%',
          right: '10%',
          width: '35vw',
          height: '35vw',
          background: `radial-gradient(circle, ${tokens.colors.glow.indigo} 0%, transparent 70%)`,
          filter: 'blur(100px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <motion.div
        aria-hidden="true"
        className="ambient-glow"
        animate={{
          x: ['-50%', '-45%', '-55%', '-50%'],
          y: ['-50%', '-55%', '-45%', '-50%'],
          scale: [1, 1.2, 0.9, 1],
          opacity: [0.6, 0.8, 0.5, 0.6],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          width: '50vw',
          height: '50vw',
          background: `radial-gradient(circle, ${tokens.colors.glow.pink} 0%, transparent 70%)`,
          filter: 'blur(120px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Header with Language Switcher */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: `${tokens.spacing[4]} ${tokens.spacing[6]}`,
          background: tokens.colors.surface.glass,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${tokens.colors.border.subtle}`,
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Logo/Brand */}
          <div
            style={{
              fontSize: tokens.typography.fontSize.xl,
              fontWeight: tokens.typography.fontWeight.bold,
              color: tokens.colors.text.primary,
            }}
          >
            <span style={{ color: service.accentColor }}>Kanjona</span>
          </div>

          {/* Language Switcher */}
          <nav aria-label="Language selection">
            <div style={{ position: 'relative' }}>
              <motion.button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-expanded={langMenuOpen}
                aria-haspopup="true"
                aria-label={`Language: ${currentLocale.toUpperCase()}. Click to change.`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing[2],
                  padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
                  background: tokens.colors.surface.glass,
                  border: `1px solid ${tokens.colors.border.subtle}`,
                  borderRadius: tokens.radii.full,
                  color: tokens.colors.text.primary,
                  fontSize: tokens.typography.fontSize.sm,
                  fontWeight: tokens.typography.fontWeight.medium,
                  cursor: 'pointer',
                }}
              >
                <span aria-hidden="true">
                  {languages.find((l) => l.code === currentLocale)?.flag}
                </span>
                <span>{currentLocale.toUpperCase()}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                  style={{
                    transform: langMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </motion.button>

              {/* Dropdown */}
              {langMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  role="menu"
                  aria-label="Select language"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: tokens.spacing[2],
                    background: 'rgba(10, 10, 15, 0.9)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: `1px solid ${tokens.colors.border.subtle}`,
                    borderRadius: tokens.radii.lg,
                    overflow: 'hidden',
                    minWidth: '120px',
                  }}
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      role="menuitem"
                      onClick={() => switchLanguage(lang.code)}
                      aria-current={currentLocale === lang.code ? 'true' : undefined}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: tokens.spacing[3],
                        width: '100%',
                        padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
                        background:
                          currentLocale === lang.code ? `${service.accentColor}20` : 'transparent',
                        border: 'none',
                        color: tokens.colors.text.primary,
                        fontSize: tokens.typography.fontSize.sm,
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (currentLocale !== lang.code) {
                          e.currentTarget.style.background = tokens.colors.surface.glass;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentLocale !== lang.code) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <span style={{ fontSize: '1.2em' }} aria-hidden="true">
                        {lang.flag}
                      </span>
                      <span>{lang.label}</span>
                      {currentLocale === lang.code && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={service.accentColor}
                          strokeWidth="2"
                          style={{ marginLeft: 'auto' }}
                          aria-hidden="true"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Video Intro - Disabled for now until videos are rendered */}
      {!skipVideo && !videoComplete && (
        <React.Suspense fallback={null}>
          <HeroVideo serviceId={service.id} onComplete={handleVideoComplete} autoSkipDelay={3000} />
        </React.Suspense>
      )}

      {/* Main Content */}
      {showContent && (
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          style={{ position: 'relative', zIndex: 1, paddingTop: '80px' }}
        >
          {/* Render all sections */}
          {sections.map((section) => renderSection(section))}

          {/* Additional custom content */}
          {children}

          {/* Footer */}
          <footer
            style={{
              padding: `${tokens.spacing[8]} ${tokens.spacing[6]}`,
              borderTop: `1px solid ${tokens.colors.border.subtle}`,
              textAlign: 'center',
            }}
          >
            <p
              style={{
                color: tokens.colors.text.tertiary,
                fontSize: tokens.typography.fontSize.sm,
              }}
            >
              &copy; {new Date().getFullYear()} Kanjona. All rights reserved.
            </p>
          </footer>
        </motion.main>
      )}
    </div>
  );
};

export default ServiceLandingLayout;
