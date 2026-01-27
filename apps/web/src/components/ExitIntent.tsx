'use client';

/**
 * Exit Intent Popup Component
 * Detects when the user is about to leave the page and shows a modal
 * encouraging them to fill out the lead form.
 *
 * - Desktop: detects mouse leaving viewport (mouseout event on document)
 * - Mobile: not shown (mouse detection does not work on touch devices)
 * - Only shown once per session (sessionStorage flag)
 * - Not shown if form already submitted (checks Redux state)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '@/store/hooks';
import { selectIsSuccess } from '@/store/leadSlice';

const EXIT_INTENT_SHOWN_KEY = 'exit_intent_shown';

export function ExitIntent() {
  const t = useTranslations('exitIntent');
  const [isVisible, setIsVisible] = useState(false);
  const isFormSubmitted = useAppSelector(selectIsSuccess);
  const hasTriggered = useRef(false);

  // Check if we are on a touch / mobile device
  const isMobile = useCallback((): boolean => {
    if (typeof window === 'undefined') return true;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // Check if already shown this session
  const wasAlreadyShown = useCallback((): boolean => {
    if (typeof window === 'undefined') return true;
    try {
      return sessionStorage.getItem(EXIT_INTENT_SHOWN_KEY) === 'true';
    } catch {
      return false;
    }
  }, []);

  // Mark as shown
  const markAsShown = useCallback(() => {
    try {
      sessionStorage.setItem(EXIT_INTENT_SHOWN_KEY, 'true');
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  // Show the popup
  const show = useCallback(() => {
    if (hasTriggered.current) return;
    if (isFormSubmitted) return;
    if (wasAlreadyShown()) return;
    if (isMobile()) return;

    hasTriggered.current = true;
    markAsShown();
    setIsVisible(true);
  }, [isFormSubmitted, wasAlreadyShown, isMobile, markAsShown]);

  // Dismiss the popup
  const dismiss = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Smooth scroll to form and dismiss
  const goToForm = useCallback(() => {
    setIsVisible(false);
    const formEl = document.getElementById('lead-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Handle keyboard: Escape to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        dismiss();
      }
    },
    [isVisible, dismiss]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isMobile()) return;
    if (wasAlreadyShown()) return;
    if (isFormSubmitted) return;

    const handleMouseOut = (e: MouseEvent) => {
      // Only trigger if mouse leaves through the top of the viewport
      if (e.clientY <= 0) {
        show();
      }
    };

    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobile, wasAlreadyShown, isFormSubmitted, show, handleKeyDown]);

  // Focus trap: keep focus inside the modal while it is open
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || !modalRef.current) return;

    const focusableEls = modalRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusableEls.length === 0) return;

    const firstEl = focusableEls[0];
    const lastEl = focusableEls[focusableEls.length - 1];

    firstEl.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={overlayStyles}
          role="dialog"
          aria-modal="true"
          aria-label={t('ariaLabel')}
          onClick={(e) => {
            if (e.target === e.currentTarget) dismiss();
          }}
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            style={modalStyles}
          >
            {/* Close button */}
            <button onClick={dismiss} aria-label={t('close')} style={closeButtonStyles}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Content */}
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                <span role="img" aria-hidden="true">
                  &#9888;&#65039;
                </span>
              </div>

              <h2 style={headlineStyles}>{t('headline')}</h2>

              <p style={subtextStyles}>{t('subtext')}</p>

              <button onClick={goToForm} style={ctaButtonStyles}>
                {t('ctaButton')}
              </button>

              <button onClick={dismiss} style={dismissLinkStyles}>
                {t('dismiss')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const overlayStyles: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  padding: '24px',
};

const modalStyles: React.CSSProperties = {
  position: 'relative',
  maxWidth: '460px',
  width: '100%',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '40px 32px 32px',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
};

const closeButtonStyles: React.CSSProperties = {
  position: 'absolute',
  top: '12px',
  right: '12px',
  background: 'none',
  border: 'none',
  color: '#999',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const headlineStyles: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#111',
  marginBottom: '12px',
  lineHeight: 1.3,
};

const subtextStyles: React.CSSProperties = {
  fontSize: '16px',
  color: '#555',
  marginBottom: '28px',
  lineHeight: 1.5,
};

const ctaButtonStyles: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '16px 24px',
  fontSize: '16px',
  fontWeight: 600,
  color: '#fff',
  backgroundColor: '#0070f3',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  marginBottom: '16px',
  transition: 'background-color 0.2s ease',
};

const dismissLinkStyles: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px',
  fontSize: '14px',
  color: '#888',
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  textDecoration: 'underline',
};

export default ExitIntent;
