'use client';

/**
 * Sticky CTA Component
 * A fixed bottom bar on mobile screens that appears after scrolling past the hero
 * and hides when the lead form is in the viewport.
 *
 * - Shows only below md breakpoint (max-width: 767px)
 * - Smooth slide-up entrance animation
 * - Hidden after form submission
 * - Uses IntersectionObserver for hero/form visibility detection
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '@/store/hooks';
import { selectIsSuccess } from '@/store/leadSlice';

export function StickyCTA() {
  const t = useTranslations('stickyCTA');
  const isFormSubmitted = useAppSelector(selectIsSuccess);

  const [isMobile, setIsMobile] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [formInView, setFormInView] = useState(false);
  const observerRefs = useRef<IntersectionObserver[]>([]);

  // Detect mobile viewport
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Observe hero and form sections
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Disconnect previous observers
    observerRefs.current.forEach((o) => o.disconnect());
    observerRefs.current = [];

    // Observe hero - when hero leaves viewport, we are "past hero"
    const heroEl = document.querySelector('section:first-of-type');
    if (heroEl) {
      const heroObs = new IntersectionObserver(
        ([entry]) => {
          setPastHero(!entry.isIntersecting);
        },
        { threshold: 0.1 }
      );
      heroObs.observe(heroEl);
      observerRefs.current.push(heroObs);
    }

    // Observe lead form
    const formEl = document.getElementById('lead-form');
    if (formEl) {
      const formObs = new IntersectionObserver(
        ([entry]) => {
          setFormInView(entry.isIntersecting);
        },
        { threshold: 0.1 }
      );
      formObs.observe(formEl);
      observerRefs.current.push(formObs);
    }

    return () => {
      observerRefs.current.forEach((o) => o.disconnect());
    };
  }, []);

  const scrollToForm = useCallback(() => {
    const formEl = document.getElementById('lead-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const shouldShow = isMobile && pastHero && !formInView && !isFormSubmitted;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          style={barStyles}
          role="complementary"
          aria-label={t('ariaLabel')}
        >
          <button onClick={scrollToForm} style={buttonStyles} aria-label={t('buttonLabel')}>
            {t('buttonText')}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const barStyles: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  padding: '12px 16px',
  paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
  borderTop: '1px solid rgba(0, 0, 0, 0.05)',
};

const buttonStyles: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '14px 24px',
  fontSize: '16px',
  fontWeight: 600,
  color: '#fff',
  backgroundColor: '#0070f3',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  textAlign: 'center',
};

export default StickyCTA;
