'use client';

/**
 * Funnel Testimonials Component
 * Social proof section for service funnel pages
 */

import { useTranslations } from 'next-intl';
import { CardTilt, FadeIn, StaggerChildren, StaggerItem } from '@/components/animations';
import type { ServiceConfig } from '@/config/services';

interface FunnelTestimonialsProps {
  service: ServiceConfig;
}

/** Star rating positions for stable keys */
const STAR_POSITIONS = [1, 2, 3, 4, 5] as const;

export function FunnelTestimonials({ service }: FunnelTestimonialsProps) {
  // Use type assertion for dynamic funnel namespaces
  const t = useTranslations(`funnels.${service.slug}` as 'funnels.real-estate');

  // Use indices to match translation array structure (testimonials.items)
  // Only 1 testimonial per funnel in translations
  const testimonials = [{ id: 'testimonial-0', index: 0 }];

  return (
    <section
      style={{
        padding: '80px 24px',
        backgroundColor: '#f9fafb',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <FadeIn>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: '48px',
              color: '#111',
            }}
          >
            {t('testimonials.title')}
          </h2>
        </FadeIn>

        <StaggerChildren
          staggerDelay={0.15}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
          }}
        >
          {testimonials.map(({ id, index }) => (
            <StaggerItem key={id}>
              <CardTilt maxTilt={3} glareEnable>
                <div
                  style={{
                    padding: '32px',
                    backgroundColor: '#fff',
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Stars */}
                  <div style={{ marginBottom: '16px' }}>
                    {STAR_POSITIONS.map((starPosition) => (
                      <span
                        key={`star-${starPosition}`}
                        style={{ color: '#FBBF24', fontSize: '18px' }}
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
                    &ldquo;{t(`testimonials.items.${index}.text` as Parameters<typeof t>[0])}&rdquo;
                  </p>

                  {/* Author */}
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
                      }}
                    >
                      {t(`testimonials.items.${index}.name` as Parameters<typeof t>[0]).charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#111', fontSize: '15px' }}>
                        {t(`testimonials.items.${index}.name` as Parameters<typeof t>[0])}
                      </div>
                      <div style={{ color: '#888', fontSize: '13px' }}>
                        {t(`testimonials.items.${index}.location` as Parameters<typeof t>[0])}
                      </div>
                    </div>
                  </div>
                </div>
              </CardTilt>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}

export default FunnelTestimonials;
