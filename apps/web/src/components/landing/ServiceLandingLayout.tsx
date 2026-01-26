'use client';

/**
 * Service Landing Layout
 *
 * Data-driven layout component for all service landing pages.
 * Accepts configuration objects and renders appropriate sections.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
const HeroVideo = React.lazy(() => import('@/components/HeroVideo').then(mod => ({ default: mod.HeroVideo })));

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

export type SectionType = 'hero' | 'benefits' | 'process' | 'testimonials' | 'gallery' | 'faq' | 'cta';

export interface SectionConfig {
  type: SectionType;
  enabled: boolean;
  config?: HeroConfig | BenefitsConfig | ProcessConfig | TestimonialsConfig | FAQConfig | FormConfig;
}

interface ServiceLandingLayoutProps {
  service: ServiceConfig;
  sections: SectionConfig[];
  children?: React.ReactNode;
}

// =============================================================================
// Component
// =============================================================================

export const ServiceLandingLayout: React.FC<ServiceLandingLayoutProps> = ({
  service,
  sections,
  children,
}) => {
  const [showContent, setShowContent] = useState(true); // Skip video for now
  const [videoComplete, setVideoComplete] = useState(true); // Skip video for now
  const [skipVideo] = useState(true); // Set to false to enable hero video

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
      {/* Animated ambient background glows */}
      <motion.div
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

      {/* Hero Video Intro - Disabled for now until videos are rendered */}
      {!skipVideo && !videoComplete && (
        <React.Suspense fallback={null}>
          <HeroVideo
            serviceId={service.id}
            onComplete={handleVideoComplete}
            autoSkipDelay={3000}
          />
        </React.Suspense>
      )}

      {/* Main Content */}
      {showContent && (
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          style={{ position: 'relative', zIndex: 1 }}
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
            <p style={{ color: tokens.colors.text.muted, fontSize: tokens.typography.fontSize.sm }}>
              © {new Date().getFullYear()} Kanjona. All rights reserved.
            </p>
          </footer>
        </motion.main>
      )}
    </div>
  );
};

export default ServiceLandingLayout;
