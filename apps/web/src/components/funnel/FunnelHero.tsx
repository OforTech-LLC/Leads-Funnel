'use client';

/**
 * Funnel Hero Component
 * Hero section for service funnel pages.
 *
 * Enhanced CTA Copy (Task 7):
 * - CTA text configurable per A/B experiment
 * - Default: "Get Free Quotes Now"
 * - Variant: "Compare Top Pros Near You"
 * - Urgency text below button
 * - Trust text below urgency
 *
 * Accessibility:
 * - Scroll indicator SVG has aria-hidden="true"
 * - Service icon emoji has role="img" with aria-label
 */

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { GradientMesh, FadeIn, FloatingElements } from '@/components/animations';
import { useExperiment } from '@/lib/experiments';
import type { ServiceConfig } from '@/config/services';

interface FunnelHeroProps {
  service: ServiceConfig;
}

export function FunnelHero({ service }: FunnelHeroProps) {
  // Use type assertion for dynamic funnel namespaces
  const t = useTranslations(`funnels.${service.slug}` as 'funnels.real-estate');
  const heroT = useTranslations('hero');

  // A/B test: CTA button text
  const ctaVariant = useExperiment('cta_text');

  // Parse gradient colors from config
  const gradientColors = getGradientColors(service.gradient);

  // Determine CTA text based on experiment variant
  const ctaText = (() => {
    // If funnel has its own CTA text, use it as the default
    const funnelCTA = t('cta.button');
    if (!ctaVariant) return funnelCTA;

    switch (ctaVariant) {
      case 'get_free_quotes':
        return heroT('ctaDefault');
      case 'get_started':
        return funnelCTA;
      default:
        return funnelCTA;
    }
  })();

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px 60px',
        overflow: 'hidden',
      }}
    >
      {/* Animated Background */}
      <GradientMesh colors={gradientColors} speed={0.001} />
      <FloatingElements count={8} colors={gradientColors} minSize={30} maxSize={100} />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '900px',
          textAlign: 'center',
          color: '#fff',
        }}
      >
        {/* Icon */}
        <FadeIn delay={0}>
          <motion.div
            style={{
              fontSize: '64px',
              marginBottom: '24px',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
            }}
            animate={{
              y: [0, -10, 0],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            role="img"
            aria-label={service.slug.replace(/-/g, ' ')}
          >
            {service.icon}
          </motion.div>
        </FadeIn>

        {/* Headline */}
        <FadeIn delay={0.1}>
          <h1
            style={{
              fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: 800,
              marginBottom: '20px',
              lineHeight: 1.1,
              textShadow: '0 2px 20px rgba(0,0,0,0.3)',
            }}
          >
            {t('hero.headline')}
          </h1>
        </FadeIn>

        {/* Subheadline */}
        <FadeIn delay={0.2}>
          <p
            style={{
              fontSize: 'clamp(16px, 2.5vw, 20px)',
              opacity: 0.95,
              maxWidth: '700px',
              margin: '0 auto 32px',
              lineHeight: 1.6,
              textShadow: '0 1px 10px rgba(0,0,0,0.2)',
            }}
          >
            {t('hero.subheadline')}
          </p>
        </FadeIn>

        {/* CTA Button */}
        <FadeIn delay={0.3}>
          <motion.a
            href="#lead-form"
            style={{
              display: 'inline-block',
              padding: '16px 40px',
              fontSize: '18px',
              fontWeight: 600,
              color: service.color,
              backgroundColor: '#fff',
              borderRadius: '50px',
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}
            whileHover={{
              scale: 1.05,
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            }}
            whileTap={{ scale: 0.98 }}
          >
            {ctaText}
          </motion.a>
        </FadeIn>

        {/* Urgency Text */}
        <FadeIn delay={0.4}>
          <p
            style={{
              fontSize: '14px',
              opacity: 0.85,
              marginTop: '16px',
              fontWeight: 500,
              letterSpacing: '0.5px',
              textShadow: '0 1px 4px rgba(0,0,0,0.2)',
            }}
          >
            {heroT('urgencyText')}
          </p>
        </FadeIn>

        {/* Trust Text */}
        <FadeIn delay={0.5}>
          <p
            style={{
              fontSize: '12px',
              opacity: 0.7,
              marginTop: '8px',
              maxWidth: '500px',
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: 1.4,
            }}
          >
            {heroT('trustText')}
          </p>
        </FadeIn>
      </div>

      {/* Scroll indicator (decorative) */}
      <motion.div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#fff',
          opacity: 0.7,
        }}
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </motion.div>
    </section>
  );
}

/**
 * Parse Tailwind gradient class to colors
 */
function getGradientColors(gradient: string): string[] {
  const colorMap: Record<string, string> = {
    'blue-500': '#3B82F6',
    'blue-600': '#2563EB',
    'blue-700': '#1D4ED8',
    'blue-800': '#1E40AF',
    'blue-900': '#1E3A8A',
    'purple-500': '#A855F7',
    'purple-600': '#9333EA',
    'purple-700': '#7C3AED',
    'purple-800': '#6D28D9',
    'violet-500': '#8B5CF6',
    'violet-600': '#7C3AED',
    'violet-700': '#6D28D9',
    'pink-400': '#F472B6',
    'pink-500': '#EC4899',
    'pink-700': '#BE185D',
    'rose-500': '#F43F5E',
    'rose-600': '#E11D48',
    'rose-700': '#BE123C',
    'rose-800': '#9F1239',
    'red-500': '#EF4444',
    'red-600': '#DC2626',
    'red-700': '#B91C1C',
    'red-800': '#991B1B',
    'orange-500': '#F97316',
    'orange-600': '#EA580C',
    'amber-500': '#F59E0B',
    'amber-600': '#D97706',
    'amber-700': '#92400E',
    'amber-900': '#78350F',
    'yellow-500': '#EAB308',
    'yellow-600': '#CA8A04',
    'lime-500': '#84CC16',
    'green-500': '#22C55E',
    'green-600': '#16A34A',
    'green-700': '#15803D',
    'emerald-500': '#10B981',
    'emerald-600': '#059669',
    'emerald-700': '#047857',
    'emerald-800': '#065F46',
    'teal-500': '#14B8A6',
    'teal-600': '#0D9488',
    'teal-700': '#0F766E',
    'cyan-500': '#06B6D4',
    'cyan-600': '#0891B2',
    'sky-500': '#0EA5E9',
    'indigo-500': '#6366F1',
    'indigo-600': '#4F46E5',
    'indigo-700': '#4338CA',
    'indigo-900': '#312E81',
    'fuchsia-500': '#D946EF',
    'gray-500': '#6B7280',
    'gray-700': '#374151',
    'gray-800': '#1F2937',
    'gray-900': '#111827',
    'slate-700': '#334155',
    'slate-800': '#1E293B',
    'slate-900': '#0F172A',
    'stone-500': '#78716C',
    'stone-600': '#57534E',
    'stone-700': '#44403C',
    'stone-800': '#292524',
  };

  const colors: string[] = [];
  const parts = gradient.split(' ');

  for (const part of parts) {
    const colorMatch = part.match(/(?:from-|to-)(\w+-\d+)/);
    if (colorMatch && colorMap[colorMatch[1]]) {
      colors.push(colorMap[colorMatch[1]]);
    }
  }

  return colors.length >= 2 ? colors : ['#3B82F6', '#8B5CF6'];
}

export default FunnelHero;
