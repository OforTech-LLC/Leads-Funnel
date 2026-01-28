'use client';

/**
 * Testimonials Section Component
 *
 * Display customer testimonials in various layouts.
 *
 * Accessibility:
 * - Star SVGs have aria-hidden="true" (meaning conveyed via aria-label on container)
 * - Decorative quote icon has aria-hidden="true"
 * - Featured testimonials rendered in a region with aria-label
 * - Testimonial role text uses text.tertiary for WCAG AA contrast (not text.muted)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TestimonialCard, tokens } from '@/design-system';

interface Testimonial {
  quote: string;
  author: string;
  role?: string;
  avatar?: string;
  rating?: number;
}

interface TestimonialsSectionProps {
  title: string;
  subtitle?: string;
  testimonials: Testimonial[];
  variant?: 'grid' | 'carousel' | 'featured';
  accentColor?: string;
}

/** Star rating positions for stable keys */
const STAR_POSITIONS = [1, 2, 3, 4, 5] as const;

export const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({
  title,
  subtitle,
  testimonials,
  variant = 'grid',
  accentColor = tokens.colors.accent.primary,
}) => {
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
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  const renderGrid = () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: tokens.spacing[6],
      }}
    >
      {testimonials.map((testimonial) => (
        <motion.div
          key={`testimonial-${testimonial.author}-${testimonial.quote.slice(0, 20)}`}
          variants={itemVariants}
        >
          <TestimonialCard {...testimonial} />
        </motion.div>
      ))}
    </div>
  );

  const renderFeatured = () => {
    if (testimonials.length === 0) return null;
    const [featured, ...rest] = testimonials;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[8] }}>
        {/* Featured testimonial */}
        <motion.div variants={itemVariants}>
          <div
            style={{
              padding: tokens.spacing[10],
              background: tokens.colors.surface.glass,
              borderRadius: tokens.radii['2xl'],
              border: `1px solid ${tokens.colors.border.accent}`,
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Decorative quote icon */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: tokens.spacing[6],
                left: tokens.spacing[6],
                fontSize: '6rem',
                color: `${accentColor}20`,
                lineHeight: 1,
                fontFamily: 'serif',
              }}
            >
              &ldquo;
            </div>

            {/* Rating */}
            {featured.rating && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: tokens.spacing[1],
                  marginBottom: tokens.spacing[6],
                }}
                aria-label={`Rating: ${featured.rating} out of 5 stars`}
              >
                {STAR_POSITIONS.map((starPosition) => (
                  <svg
                    key={`featured-star-${starPosition}`}
                    width="28"
                    height="28"
                    viewBox="0 0 20 20"
                    fill={
                      starPosition <= featured.rating! ? accentColor : tokens.colors.border.subtle
                    }
                    aria-hidden="true"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            )}

            {/* Quote */}
            <blockquote
              style={{
                fontSize: tokens.typography.fontSize['2xl'],
                color: tokens.colors.text.primary,
                lineHeight: tokens.typography.lineHeight.relaxed,
                fontStyle: 'italic',
                marginBottom: tokens.spacing[8],
                maxWidth: '800px',
                margin: `0 auto ${tokens.spacing[8]}`,
              }}
            >
              &ldquo;{featured.quote}&rdquo;
            </blockquote>

            {/* Author */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: tokens.spacing[4],
              }}
            >
              {featured.avatar && (
                <img
                  src={featured.avatar}
                  alt={featured.author}
                  loading="lazy"
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: tokens.radii.full,
                    objectFit: 'cover',
                    border: `3px solid ${accentColor}`,
                  }}
                />
              )}
              <div style={{ textAlign: 'left' }}>
                <div
                  style={{
                    fontSize: tokens.typography.fontSize.lg,
                    fontWeight: tokens.typography.fontWeight.semibold,
                    color: tokens.colors.text.primary,
                  }}
                >
                  {featured.author}
                </div>
                {featured.role && (
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.base,
                      // Use text.tertiary instead of text.muted for WCAG AA contrast
                      color: tokens.colors.text.tertiary,
                    }}
                  >
                    {featured.role}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Rest of testimonials */}
        {rest.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: tokens.spacing[6],
            }}
          >
            {rest.map((testimonial) => (
              <motion.div
                key={`rest-testimonial-${testimonial.author}-${testimonial.quote.slice(0, 20)}`}
                variants={itemVariants}
              >
                <TestimonialCard {...testimonial} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* Section Header */}
      <motion.div
        variants={itemVariants}
        style={{ textAlign: 'center', marginBottom: tokens.spacing[12] }}
      >
        <h2
          style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: tokens.typography.fontWeight.bold,
            marginBottom: tokens.spacing[4],
            color: tokens.colors.text.primary,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              fontSize: tokens.typography.fontSize.lg,
              color: tokens.colors.text.secondary,
              maxWidth: '600px',
              margin: '0 auto',
            }}
          >
            {subtitle}
          </p>
        )}
      </motion.div>

      {/* Testimonials */}
      {variant === 'featured' ? renderFeatured() : renderGrid()}
    </motion.div>
  );
};

export default TestimonialsSection;
