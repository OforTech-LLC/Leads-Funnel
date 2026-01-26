'use client';

/**
 * Funnel Form Component
 * Lead capture form for service funnel pages
 */

import { useTranslations } from 'next-intl';
import { FadeIn } from '@/components/animations';
import LeadForm from '@/components/LeadForm';
import type { ServiceConfig } from '@/config/services';

interface FunnelFormProps {
  service: ServiceConfig;
}

export function FunnelForm({ service }: FunnelFormProps) {
  // Use type assertion for dynamic funnel namespaces
  const t = useTranslations(`funnels.${service.slug}` as 'funnels.real-estate');

  return (
    <section
      id="lead-form"
      style={{
        padding: '80px 24px',
        backgroundColor: '#fff',
      }}
    >
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <FadeIn>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 36px)',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: '12px',
              color: '#111',
            }}
          >
            {t('form.title')}
          </h2>
        </FadeIn>

        <FadeIn delay={0.1}>
          <p
            style={{
              fontSize: '16px',
              textAlign: 'center',
              color: '#666',
              marginBottom: '32px',
            }}
          >
            {t('form.subtitle')}
          </p>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div
            style={{
              border: `3px solid ${service.color}20`,
              borderRadius: '16px',
              padding: '8px',
            }}
          >
            <LeadForm funnelId={service.slug} primaryColor={service.color} />
          </div>
        </FadeIn>

        {/* Trust badges */}
        <FadeIn delay={0.3}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '24px',
              marginTop: '24px',
              flexWrap: 'wrap',
            }}
          >
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#666',
        fontSize: '14px',
      }}
    >
      {icon === 'shield' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )}
      {icon === 'clock' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      )}
      {icon === 'check' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
      {text}
    </div>
  );
}

export default FunnelForm;
