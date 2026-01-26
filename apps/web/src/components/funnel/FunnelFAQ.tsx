'use client';

/**
 * Funnel FAQ Component
 * Frequently asked questions for service funnel pages
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeIn, StaggerChildren, StaggerItem } from '@/components/animations';
import type { ServiceConfig } from '@/config/services';

interface FunnelFAQProps {
  service: ServiceConfig;
}

export function FunnelFAQ({ service }: FunnelFAQProps) {
  // Use type assertion for dynamic funnel namespaces
  const t = useTranslations(`funnels.${service.slug}` as 'funnels.real-estate');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Use indices to match translation array structure (faq.items)
  const faqs = [{ idx: 0 }, { idx: 1 }, { idx: 2 }];

  return (
    <section
      style={{
        padding: '80px 24px',
        backgroundColor: '#fff',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
            {t('faq.title')}
          </h2>
        </FadeIn>

        <StaggerChildren staggerDelay={0.1}>
          {faqs.map(({ idx }, faqIndex) => (
            <StaggerItem key={idx}>
              <div
                style={{
                  borderBottom: '1px solid #eee',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === faqIndex ? null : faqIndex)}
                  style={{
                    width: '100%',
                    padding: '24px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      fontSize: '17px',
                      fontWeight: 600,
                      color: '#111',
                      paddingRight: '16px',
                    }}
                  >
                    {t(`faq.items.${idx}.question` as Parameters<typeof t>[0])}
                  </span>
                  <motion.span
                    animate={{ rotate: openIndex === faqIndex ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      color: service.color,
                      flexShrink: 0,
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </motion.span>
                </button>

                <AnimatePresence>
                  {openIndex === faqIndex && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p
                        style={{
                          fontSize: '15px',
                          color: '#666',
                          lineHeight: 1.7,
                          paddingBottom: '24px',
                        }}
                      >
                        {t(`faq.items.${idx}.answer` as Parameters<typeof t>[0])}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}

export default FunnelFAQ;
