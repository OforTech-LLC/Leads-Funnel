'use client';

/**
 * Funnel Testimonials Component
 * Carousel with 5 testimonials per service, auto-rotation, and aggregate rating.
 */

import { useState, useEffect, useCallback } from 'react';
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

  // Build testimonial indices
  const testimonials = Array.from({ length: TESTIMONIAL_COUNT }, (_, i) => i);

  // Auto-rotate
  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % TESTIMONIAL_COUNT);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextSlide, AUTO_ROTATE_MS);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

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

  // Compute how many to show side-by-side based on a simple approach
  // Mobile: 1, Desktop: up to 3 visible (CSS handles this via grid)
  return (
    <section
      style={{
        padding: '80px 24px',
        backgroundColor: '#f9fafb',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
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
            <div style={{ display: 'flex', gap: '2px' }}>
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

        {/* Testimonial cards - responsive grid */}
        <div
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
              <div style={{ marginBottom: '16px' }}>
                {STAR_POSITIONS.map((starPos) => (
                  <span
                    key={`star-${idx}-${starPos}`}
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
              onClick={() => setActiveIndex(idx)}
              aria-label={`Go to testimonial ${idx + 1}`}
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

export default FunnelTestimonials;
