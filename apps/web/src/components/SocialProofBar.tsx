'use client';

/**
 * Social Proof Bar Component
 * Shows a sticky bar at the top of the page with social proof messaging.
 *
 * - Animated counting number on mount
 * - Dismissible with X button (persisted in sessionStorage)
 * - Subtle background styling
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

const DISMISSED_KEY = 'social_proof_dismissed';

interface SocialProofBarProps {
  /** Total count to display (e.g. 10000) */
  totalCount?: number;
  /** Dynamic "today" count for the local variant */
  todayCount?: number;
  /** Which variant to display: 'total' or 'today' */
  variant?: 'total' | 'today';
}

export function SocialProofBar({
  totalCount = 10000,
  todayCount = 47,
  variant = 'total',
}: SocialProofBarProps) {
  const t = useTranslations('socialProof');
  const [isDismissed, setIsDismissed] = useState(true); // start hidden to avoid flash
  const [displayCount, setDisplayCount] = useState(0);
  const animationFrame = useRef<number>(0);

  // Check dismissed state on mount
  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(DISMISSED_KEY) === 'true';
      setIsDismissed(dismissed);
    } catch {
      setIsDismissed(false);
    }
  }, []);

  // Animate count
  useEffect(() => {
    if (isDismissed) return;

    const target = variant === 'total' ? totalCount : todayCount;
    const duration = 1500; // ms
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayCount(Math.round(eased * target));
      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(tick);
      }
    };

    animationFrame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame.current);
  }, [isDismissed, variant, totalCount, todayCount]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // ignore
    }
  }, []);

  const formattedCount = displayCount.toLocaleString();

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={barStyles}
          role="status"
          aria-live="polite"
        >
          <div style={contentStyles}>
            <span style={iconStyle} role="img" aria-hidden="true">
              &#11088;
            </span>
            <span style={textStyles}>
              {variant === 'total'
                ? t('totalMessage', { count: formattedCount })
                : t('todayMessage', { count: formattedCount })}
            </span>
            <button onClick={dismiss} aria-label={t('dismiss')} style={closeButtonStyles}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const barStyles: React.CSSProperties = {
  position: 'relative',
  zIndex: 200,
  backgroundColor: '#f0f4ff',
  borderBottom: '1px solid #e0e7ff',
};

const contentStyles: React.CSSProperties = {
  maxWidth: '900px',
  margin: '0 auto',
  padding: '10px 48px 10px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  position: 'relative',
};

const iconStyle: React.CSSProperties = {
  fontSize: '16px',
  flexShrink: 0,
};

const textStyles: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: '#1e3a5f',
  textAlign: 'center',
};

const closeButtonStyles: React.CSSProperties = {
  position: 'absolute',
  right: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
};

export default SocialProofBar;
