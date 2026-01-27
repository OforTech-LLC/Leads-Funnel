'use client';

/**
 * Funnel Form Component
 * Lead capture form for service funnel pages with enhanced trust badges.
 * Supports A/B testing between single-step (LeadForm) and multi-step (MultiStepForm).
 */

import { useTranslations } from 'next-intl';
import { FadeIn } from '@/components/animations';
import LeadForm from '@/components/LeadForm';
import MultiStepForm from '@/components/MultiStepForm';
import { ABTest, Variant } from '@/components/ABTest';
import type { ServiceConfig } from '@/config/services';
import { useMemo } from 'react';

interface FunnelFormProps {
  service: ServiceConfig;
  /**
   * Force a specific form variant. When set, the A/B test is bypassed.
   * - 'single': existing single-step LeadForm
   * - 'multi': new MultiStepForm
   * - undefined: uses A/B test framework (experiment "form_variant")
   */
  formVariant?: 'single' | 'multi';
}

export function FunnelForm({ service, formVariant }: FunnelFormProps) {
  const t = useTranslations(`funnels.${service.slug}` as 'funnels.real-estate');

  const formWrapperStyle = useMemo(
    () => ({
      ...formStyles.formWrapper,
      borderColor: `${service.color}20`,
    }),
    [service.color]
  );

  const renderSingleForm = () => <LeadForm funnelId={service.slug} primaryColor={service.color} />;

  const renderMultiForm = () => (
    <MultiStepForm funnelId={service.slug} primaryColor={service.color} />
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
            {formVariant === 'single' && renderSingleForm()}
            {formVariant === 'multi' && renderMultiForm()}
            {!formVariant && (
              <ABTest experimentId="form_variant" fallback={renderSingleForm()}>
                <Variant id="single">{renderSingleForm()}</Variant>
                <Variant id="multi">{renderMultiForm()}</Variant>
              </ABTest>
            )}
          </div>
        </FadeIn>

        {/* Primary trust badges */}
        <FadeIn delay={0.3}>
          <div style={formStyles.trustBadges}>
            <TrustBadge icon="shield" text={t('trust.secure')} />
            <TrustBadge icon="clock" text={t('trust.fast')} />
            <TrustBadge icon="check" text={t('trust.free')} />
          </div>
        </FadeIn>

        {/* Enhanced trust badges */}
        <FadeIn delay={0.4}>
          <div style={formStyles.enhancedBadges}>
            <EnhancedBadge icon="lock" text={t('trust.ssl' as Parameters<typeof t>[0])} />
            <EnhancedBadge icon="noSpam" text={t('trust.noSpam' as Parameters<typeof t>[0])} />
            <EnhancedBadge
              icon="privacyProtected"
              text={t('trust.privacyProtected' as Parameters<typeof t>[0])}
            />
            <EnhancedBadge
              icon="verified"
              text={t('trust.verifiedProviders' as Parameters<typeof t>[0])}
            />
          </div>
        </FadeIn>

        {/* Aggregate rating display */}
        <FadeIn delay={0.5}>
          <div style={formStyles.ratingRow}>
            <div style={formStyles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={`form-star-${s}`} style={{ color: '#FBBF24', fontSize: '18px' }}>
                  ★
                </span>
              ))}
            </div>
            <span style={formStyles.ratingText}>
              {t('trust.ratedBy' as Parameters<typeof t>[0])}
            </span>
          </div>
        </FadeIn>

        {/* People helped counter */}
        <FadeIn delay={0.55}>
          <div style={formStyles.counterRow}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22C55E"
              strokeWidth="2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span style={formStyles.counterText}>
              {t('trust.peopleHelped' as Parameters<typeof t>[0])}
            </span>
          </div>
        </FadeIn>

        {/* As Featured In */}
        <FadeIn delay={0.6}>
          <div style={formStyles.featuredSection}>
            <p style={formStyles.featuredLabel}>
              {t('trust.featuredIn' as Parameters<typeof t>[0])}
            </p>
            <div style={formStyles.featuredLogos}>
              {['Forbes', 'Inc.', 'Bloomberg', 'WSJ'].map((name) => (
                <div key={name} style={formStyles.featuredLogo}>
                  {name}
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* BBB-style badge */}
        <FadeIn delay={0.65}>
          <div style={formStyles.bbbBadge}>
            <div style={formStyles.bbbInner}>
              <span style={formStyles.bbbLetter}>A+</span>
              <span style={formStyles.bbbText}>
                {t('trust.bbbRating' as Parameters<typeof t>[0])}
              </span>
            </div>
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

function EnhancedBadge({ icon, text }: { icon: string; text: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    lock: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    noSpam: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    ),
    privacyProtected: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    verified: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  };

  return (
    <div style={formStyles.enhancedBadge}>
      {iconMap[icon]}
      <span style={formStyles.enhancedBadgeText}>{text}</span>
    </div>
  );
}

// ============================================================================
// Extracted Styles
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
  enhancedBadges: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginTop: '16px',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  enhancedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#F0FDF4',
    borderRadius: '20px',
    border: '1px solid #BBF7D0',
  } as React.CSSProperties,
  enhancedBadgeText: {
    fontSize: '12px',
    color: '#166534',
    fontWeight: 500,
  } as React.CSSProperties,
  ratingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '20px',
  } as React.CSSProperties,
  starsRow: {
    display: 'flex',
    gap: '2px',
  } as React.CSSProperties,
  ratingText: {
    fontSize: '14px',
    color: '#555',
    fontWeight: 500,
  } as React.CSSProperties,
  counterRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '12px',
  } as React.CSSProperties,
  counterText: {
    fontSize: '14px',
    color: '#555',
    fontWeight: 500,
  } as React.CSSProperties,
  featuredSection: {
    marginTop: '24px',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  featuredLabel: {
    fontSize: '12px',
    color: '#999',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    marginBottom: '12px',
  } as React.CSSProperties,
  featuredLogos: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  featuredLogo: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#ccc',
    letterSpacing: '1px',
  } as React.CSSProperties,
  bbbBadge: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '20px',
  } as React.CSSProperties,
  bbbInner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    border: '2px solid #1D4ED8',
    borderRadius: '8px',
    backgroundColor: '#EFF6FF',
  } as React.CSSProperties,
  bbbLetter: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#1D4ED8',
  } as React.CSSProperties,
  bbbText: {
    fontSize: '12px',
    color: '#1E40AF',
    fontWeight: 500,
  } as React.CSSProperties,
};

export default FunnelForm;
