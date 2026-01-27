'use client';

/**
 * Funnel Form Component
 * Lead capture form for service funnel pages
 * Performance optimized with extracted styles
 */

import { useTranslations } from 'next-intl';
import { FadeIn } from '@/components/animations';
import LeadForm from '@/components/LeadForm';
import type { ServiceConfig } from '@/config/services';
import { useMemo } from 'react';

interface FunnelFormProps {
  service: ServiceConfig;
}

export function FunnelForm({ service }: FunnelFormProps) {
  // Use type assertion for dynamic funnel namespaces
  const t = useTranslations(`funnels.${service.slug}` as 'funnels.real-estate');

  // Memoize border style that depends on service color
  const formWrapperStyle = useMemo(
    () => ({
      ...formStyles.formWrapper,
      borderColor: `${service.color}20`,
    }),
    [service.color]
  );

  return (
    <section id="lead-form" style={formStyles.section}>
      <div style={formStyles.container}>
        <FadeIn>
          <h2 style={formStyles.title}>{t('form.title')}</h2>
        </FadeIn>

        <FadeIn delay={0.1}>
          <p style={formStyles.subtitle}>{t('form.subtitle')}</p>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div style={formWrapperStyle}>
            <LeadForm funnelId={service.slug} primaryColor={service.color} />
          </div>
        </FadeIn>

        {/* Trust badges */}
        <FadeIn delay={0.3}>
          <div style={formStyles.trustBadges}>
            <TrustBadge icon="shield" text={t('trust.secure')} />
            <TrustBadge icon="clock" text={t('trust.fast')} />
            <TrustBadge icon="check" text={t('trust.free')} />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function TrustBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={formStyles.trustBadge}>
      {icon === 'shield' && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )}
      {icon === 'clock' && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      )}
      {icon === 'check' && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
      {text}
    </div>
  );
}

// ============================================================================
// Extracted Styles (prevents new object creation on each render)
// ============================================================================

const formStyles = {
  section: {
    padding: '80px 24px',
    backgroundColor: '#fff',
  } as React.CSSProperties,
  container: {
    maxWidth: '600px',
    margin: '0 auto',
  } as React.CSSProperties,
  title: {
    fontSize: 'clamp(28px, 4vw, 36px)',
    fontWeight: 700,
    textAlign: 'center' as const,
    marginBottom: '12px',
    color: '#111',
  } as React.CSSProperties,
  subtitle: {
    fontSize: '16px',
    textAlign: 'center' as const,
    color: '#666',
    marginBottom: '32px',
  } as React.CSSProperties,
  formWrapper: {
    border: '3px solid',
    borderRadius: '16px',
    padding: '8px',
  } as React.CSSProperties,
  trustBadges: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginTop: '24px',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  trustBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#666',
    fontSize: '14px',
  } as React.CSSProperties,
};

export default FunnelForm;
