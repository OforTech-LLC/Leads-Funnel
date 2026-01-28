'use client';

/**
 * Hero Section Component
 *
 * Flexible hero section for service landing pages.
 * Performance optimized with extracted styles and memoized callbacks.
 *
 * Accessibility:
 * - Decorative phone SVG icon has aria-hidden="true"
 * - Stat labels use text.tertiary (not text.muted) for WCAG AA contrast
 */

import React, { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GlassButton, GlassBadge, tokens } from '@/design-system';

interface HeroSectionProps {
  badge?: string;
  headline: string;
  subheadline?: string;
  description: string;
  primaryCta: string;
  secondaryCta?: string;
  phone?: string;
  stats?: Array<{ value: string; label: string }>;
  gradient?: string;
  accentColor?: string;
}

// Memoized animation variants (defined outside component)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

export const HeroSection: React.FC<HeroSectionProps> = ({
  badge,
  headline,
  subheadline,
  description,
  primaryCta,
  secondaryCta,
  phone,
  stats,
  gradient = `linear-gradient(135deg, ${tokens.colors.accent.primary}, ${tokens.colors.accent.secondary})`,
  accentColor = tokens.colors.accent.primary,
}) => {
  // Memoized scroll handler
  const scrollToForm = useCallback(() => {
    const formSection = document.getElementById('contact');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Memoized phone handler
  const handlePhoneClick = useCallback(() => {
    if (phone) {
      window.location.href = `tel:${phone.replace(/[^0-9+]/g, '')}`;
    }
  }, [phone]);

  // Memoized headline style with gradient
  const headlineStyle = useMemo(
    () => ({
      ...heroStyles.headline,
      background: gradient,
    }),
    [gradient]
  );

  // Memoized stat value style with accent color
  const statValueStyle = useMemo(
    () => ({
      ...heroStyles.statValue,
      color: accentColor,
    }),
    [accentColor]
  );

  // Memoized phone link style
  const phoneLinkStyle = useMemo(() => heroStyles.phoneLink, []);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={heroStyles.container}
    >
      {/* Badge */}
      {badge && (
        <motion.div variants={itemVariants} style={heroStyles.badgeWrapper}>
          <GlassBadge variant="accent" size="lg">
            {badge}
          </GlassBadge>
        </motion.div>
      )}

      {/* Headline */}
      <motion.h1 variants={itemVariants} style={headlineStyle}>
        {headline}
      </motion.h1>

      {/* Subheadline */}
      {subheadline && (
        <motion.h2 variants={itemVariants} style={heroStyles.subheadline}>
          {subheadline}
        </motion.h2>
      )}

      {/* Description */}
      <motion.p variants={itemVariants} style={heroStyles.description}>
        {description}
      </motion.p>

      {/* CTAs */}
      <motion.div variants={itemVariants} style={heroStyles.ctaContainer}>
        <GlassButton variant="primary" size="lg" onClick={scrollToForm}>
          {primaryCta}
        </GlassButton>
        {secondaryCta && (
          <GlassButton variant="outline" size="lg" onClick={handlePhoneClick}>
            {secondaryCta}
          </GlassButton>
        )}
      </motion.div>

      {/* Phone */}
      {phone && (
        <motion.div variants={itemVariants} style={heroStyles.phoneWrapper}>
          <a
            href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
            style={phoneLinkStyle}
            onMouseEnter={(e) => (e.currentTarget.style.color = accentColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = tokens.colors.text.secondary)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
            Call Now: {phone}
          </a>
        </motion.div>
      )}

      {/* Stats */}
      {stats && stats.length > 0 && (
        <motion.div variants={itemVariants} style={heroStyles.statsContainer}>
          {stats.map((stat) => (
            <div key={`stat-${stat.label}-${stat.value}`} style={heroStyles.stat}>
              <div style={statValueStyle}>{stat.value}</div>
              <div style={heroStyles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};

// ============================================================================
// Extracted Styles (prevents new object creation on each render)
// ============================================================================

const heroStyles = {
  container: {
    textAlign: 'center' as const,
    maxWidth: '900px',
    margin: '0 auto',
    padding: `0 ${tokens.spacing[4]}`,
  },
  badgeWrapper: {
    marginBottom: tokens.spacing[6],
  },
  headline: {
    fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
    fontWeight: tokens.typography.fontWeight.extrabold,
    lineHeight: tokens.typography.lineHeight.tight,
    marginBottom: tokens.spacing[4],
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } as React.CSSProperties,
  subheadline: {
    fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.text.primary,
    marginBottom: tokens.spacing[6],
  } as React.CSSProperties,
  description: {
    fontSize: tokens.typography.fontSize.lg,
    color: tokens.colors.text.secondary,
    lineHeight: tokens.typography.lineHeight.relaxed,
    maxWidth: '700px',
    margin: `0 auto ${tokens.spacing[8]}`,
  } as React.CSSProperties,
  ctaContainer: {
    display: 'flex',
    gap: tokens.spacing[4],
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
    marginBottom: tokens.spacing[8],
  },
  phoneWrapper: {
    marginBottom: tokens.spacing[8],
  },
  phoneLink: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.lg,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacing[2],
    transition: `color ${tokens.transitions.duration.fast}`,
  } as React.CSSProperties,
  statsContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: tokens.spacing[12],
    flexWrap: 'wrap' as const,
  },
  stat: {
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: tokens.typography.fontSize['4xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    lineHeight: 1,
  } as React.CSSProperties,
  // Use text.tertiary instead of text.muted for better WCAG AA contrast
  statLabel: {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.text.tertiary,
    marginTop: tokens.spacing[2],
  } as React.CSSProperties,
};

export default HeroSection;
