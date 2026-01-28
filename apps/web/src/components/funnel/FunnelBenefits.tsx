'use client';

/**
 * Funnel Benefits Component
 * Benefits/features section for service funnel pages
 *
 * Accessibility:
 * - All decorative SVG icons have aria-hidden="true"
 */

import { useTranslations } from 'next-intl';
import { CardTilt, FadeIn, StaggerChildren, StaggerItem } from '@/components/animations';
import type { ServiceConfig } from '@/config/services';

interface FunnelBenefitsProps {
  service: ServiceConfig;
}

/** Benefit icon types */
type BenefitIconType = 'check' | 'star' | 'shield' | 'clock';

/** Benefit configuration with stable IDs */
const BENEFIT_CONFIGS: Array<{ id: string; index: number; icon: BenefitIconType }> = [
  { id: 'benefit-0', index: 0, icon: 'check' },
  { id: 'benefit-1', index: 1, icon: 'star' },
  { id: 'benefit-2', index: 2, icon: 'shield' },
];

export function FunnelBenefits({ service }: FunnelBenefitsProps) {
  // Use type assertion for dynamic funnel namespaces
  const t = useTranslations(`funnels.${service.slug}` as 'funnels.real-estate');

  return (
    <section
      style={{
        padding: '80px 24px',
        backgroundColor: '#f9fafb',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <FadeIn>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: '16px',
              color: '#111',
            }}
          >
            {t('benefits.title')}
          </h2>
        </FadeIn>

        <StaggerChildren
          staggerDelay={0.1}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}
        >
          {BENEFIT_CONFIGS.map(({ id, index, icon }) => (
            <StaggerItem key={id}>
              <CardTilt maxTilt={5} glareEnable>
                <div
                  style={{
                    padding: '32px',
                    backgroundColor: '#fff',
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '12px',
                      backgroundColor: `${service.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '20px',
                    }}
                  >
                    <BenefitIcon icon={icon} color={service.color} />
                  </div>
                  <h3
                    style={{
                      fontSize: '20px',
                      fontWeight: 600,
                      marginBottom: '12px',
                      color: '#111',
                    }}
                  >
                    {t(`benefits.items.${index}.title` as Parameters<typeof t>[0])}
                  </h3>
                  <p
                    style={{
                      fontSize: '15px',
                      color: '#666',
                      lineHeight: 1.6,
                    }}
                  >
                    {t(`benefits.items.${index}.description` as Parameters<typeof t>[0])}
                  </p>
                </div>
              </CardTilt>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}

function BenefitIcon({ icon, color }: { icon: BenefitIconType; color: string }) {
  const svgProps = {
    width: 28,
    height: 28,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };

  switch (icon) {
    case 'check':
      return (
        <svg {...svgProps}>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );
    case 'star':
      return (
        <svg {...svgProps}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...svgProps}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
    default:
      return null;
  }
}

export default FunnelBenefits;
