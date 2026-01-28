'use client';

/**
 * Funnel Testimonials Component
 * Carousel with 5 testimonials per service, auto-rotation, and aggregate rating.
 *
 * Accessibility:
 * - role="region" with aria-label and aria-roledescription="carousel"
 * - aria-live="polite" on slide container for screen reader announcements
 * - Keyboard navigation: Left/Right arrows to change slides
 * - Prev/Next buttons with aria-labels
 * - Current slide indicator with "Slide X of Y" labels
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { FadeIn } from '@/components/animations';
import type { ServiceConfig } from '@/config/services';

interface FunnelTestimonialsProps {
  service: ServiceConfig;
}

/** Total number of testimonials per funnel */
const TESTIMONIAL_COUNT = 5;

/** Auto-rotation interval in ms */
const AUTO_ROTATE_MS = 5000;

/** Star positions for ratings */
const STAR_POSITIONS = [1, 2, 3, 4, 5] as const;

export function FunnelTestimonials({ service }: FunnelTestimonialsProps) {
  const t = useTranslations(`funnels.${service.slug}` as 'funnels.real-estate');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const carouselRef = useRef<HTMLElement>(null);

  // Build testimonial indices
  const testimonials = Array.from({ length: TESTIMONIAL_COUNT }, (_, i) => i);

  // Navigation helpers
  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % TESTIMONIAL_COUNT);
  }, []);

  const prevSlide = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + TESTIMONIAL_COUNT) % TESTIMONIAL_COUNT);
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextSlide, AUTO_ROTATE_MS);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextSlide();
      }
    },
    [prevSlide, nextSlide]
  );

  // Get rating for a testimonial (read from translation or default to 5)
  const getRating = (index: number): number => {
    try {
      const val = t(`testimonials.items.${index}.rating` as Parameters<typeof t>[0]);
      const num = parseInt(val, 10);
      return num >= 1 && num <= 5 ? num : 5;
    } catch {
      return 5;
    }
  };

  return (
    <section
      ref={carouselRef}
      role="region"
      aria-label="Customer testimonials"
      aria-roledescription="carousel"
      style={{
        padding: '80px 24px',
        backgroundColor: '#f9fafb',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header with aggregate rating */}
        <FadeIn>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: '8px',
              color: '#111',
            }}
          >
            {t('testimonials.title')}
          </h2>
          <div
            style={{
              textAlign: 'center',
              marginBottom: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: '2px' }} aria-hidden="true">
              {STAR_POSITIONS.map((pos) => (
                <span key={`agg-star-${pos}`} style={{ color: '#FBBF24', fontSize: '20px' }}>
                  ★
                </span>
              ))}
            </div>
            <span style={{ fontSize: '16px', color: '#444', fontWeight: 600 }}>
              {t('testimonials.aggregateRating' as Parameters<typeof t>[0])}
            </span>
          </div>
        </FadeIn>

        {/* Prev/Next Navigation */}
        <div
          style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}
        >
          <button onClick={prevSlide} aria-label="Previous testimonial" style={navButtonStyle}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button onClick={nextSlide} aria-label="Next testimonial" style={navButtonStyle}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Testimonial cards - responsive grid with aria-live for slide changes */}
        <div
          aria-live="polite"
          aria-atomic="true"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Show 3 testimonials at a time on desktop, rotating window */}
          {getVisibleIndices(activeIndex, TESTIMONIAL_COUNT).map((idx) => (
            <div
              key={`testimonial-${idx}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`Testimonial ${idx + 1} of ${TESTIMONIAL_COUNT}`}
              style={{
                padding: '32px',
                backgroundColor: '#fff',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
              }}
            >
              {/* Star rating */}
              <div
                style={{ marginBottom: '16px' }}
                aria-label={`Rating: ${getRating(idx)} out of 5 stars`}
              >
                {STAR_POSITIONS.map((starPos) => (
                  <span
                    key={`star-${idx}-${starPos}`}
                    aria-hidden="true"
                    style={{
                      color: starPos <= getRating(idx) ? '#FBBF24' : '#E5E7EB',
                      fontSize: '18px',
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>

              {/* Quote */}
              <p
                style={{
                  fontSize: '15px',
                  color: '#444',
                  lineHeight: 1.7,
                  flex: 1,
                  fontStyle: 'italic',
                }}
              >
                &ldquo;{t(`testimonials.items.${idx}.text` as Parameters<typeof t>[0])}&rdquo;
              </p>

              {/* Author info */}
              <div
                style={{
                  marginTop: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: `${service.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    color: service.color,
                    flexShrink: 0,
                  }}
                >
                  {t(`testimonials.items.${idx}.name` as Parameters<typeof t>[0]).charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#111', fontSize: '15px' }}>
                    {t(`testimonials.items.${idx}.name` as Parameters<typeof t>[0])}
                  </div>
                  <div style={{ color: '#888', fontSize: '13px' }}>
                    {t(`testimonials.items.${idx}.location` as Parameters<typeof t>[0])}
                  </div>
                  <div style={{ color: '#aaa', fontSize: '12px' }}>
                    {safeTranslate(t, `testimonials.items.${idx}.company`)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation dots */}
        <div
          role="tablist"
          aria-label="Testimonial slides"
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '32px',
          }}
        >
          {testimonials.map((idx) => (
            <button
              key={`dot-${idx}`}
              role="tab"
              onClick={() => setActiveIndex(idx)}
              aria-selected={activeIndex === idx}
              aria-label={`Slide ${idx + 1} of ${TESTIMONIAL_COUNT}`}
              style={{
                width: activeIndex === idx ? '28px' : '10px',
                height: '10px',
                borderRadius: '5px',
                border: 'none',
                backgroundColor: activeIndex === idx ? service.color : '#D1D5DB',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Get visible testimonial indices (window of 3 from active index)
 */
function getVisibleIndices(activeIndex: number, total: number): number[] {
  const indices: number[] = [];
  for (let i = 0; i < Math.min(3, total); i++) {
    indices.push((activeIndex + i) % total);
  }
  return indices;
}

/**
 * Safely attempt to translate a key, returning empty string on failure
 */
function safeTranslate(t: ReturnType<typeof useTranslations>, key: string): string {
  try {
    const result = t(key as Parameters<typeof t>[0]);
    // If the result equals the key, it means translation was not found
    if (result === key) return '';
    return result;
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const navButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  border: '1px solid #D1D5DB',
  backgroundColor: '#fff',
  cursor: 'pointer',
  color: '#444',
  transition: 'all 0.2s ease',
};

export default FunnelTestimonials;
