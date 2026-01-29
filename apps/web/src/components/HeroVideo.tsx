'use client';

/**
 * HeroVideo Component
 *
 * Displays a full-viewport hero video on initial page load.
 * Uses pre-rendered MP4 videos from /public/videos/
 * Gracefully degrades for reduced motion preferences.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tokens } from '@/design-system';

interface HeroVideoProps {
  serviceId: string;
  onComplete?: () => void;
  autoSkipDelay?: number; // ms before auto-transitioning (default: 3000)
  showSkipButton?: boolean;
  posterImage?: string;
}

export const HeroVideo: React.FC<HeroVideoProps> = ({
  serviceId,
  onComplete,
  autoSkipDelay = 3000,
  showSkipButton = true,
  posterImage,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [shouldShowVideo, setShouldShowVideo] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleComplete = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onComplete?.();
    }, 500); // Wait for exit animation
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    handleComplete();
  }, [handleComplete]);

  // Check for reduced motion preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setShouldShowVideo(!prefersReducedMotion);

      if (prefersReducedMotion) {
        // Skip video entirely for reduced motion
        handleComplete();
      }
    }
  }, [handleComplete]);

  // Auto-skip timer
  useEffect(() => {
    if (isLoaded && isVisible) {
      timerRef.current = setTimeout(() => {
        handleComplete();
      }, autoSkipDelay);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isLoaded, isVisible, autoSkipDelay, handleComplete]);

  const handleVideoLoaded = () => {
    setIsLoaded(true);
  };

  const handleVideoError = () => {
    // If video fails to load, skip to content
    handleComplete();
  };

  // Handle scroll to skip
  useEffect(() => {
    const handleScroll = () => {
      if (isVisible) {
        handleSkip();
      }
    };

    window.addEventListener('wheel', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('touchmove', handleScroll);
    };
  }, [handleSkip, isVisible]);

  // Handle keyboard to skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isVisible && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSkip, isVisible]);

  const videoSrc = `/videos/hero-${serviceId}.mp4`;
  const defaultPoster = `/images/posters/${serviceId}.jpg`;

  if (!shouldShowVideo) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="hero-video-container"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.1,
            filter: 'blur(20px)',
          }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: tokens.zIndex.overlay,
            background: tokens.colors.background.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Video element */}
          <video
            ref={videoRef}
            src={videoSrc}
            poster={posterImage || defaultPoster}
            autoPlay
            muted
            playsInline
            onLoadedData={handleVideoLoaded}
            onError={handleVideoError}
            onEnded={handleComplete}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />

          {/* Loading state */}
          {!isLoaded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                position: 'absolute',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: tokens.spacing[4],
              }}
            >
              {/* Loading spinner */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: 48,
                  height: 48,
                  border: `3px solid ${tokens.colors.surface.glassBorder}`,
                  borderTopColor: tokens.colors.accent.primary,
                  borderRadius: '50%',
                }}
              />
              <span
                style={{ color: tokens.colors.text.muted, fontSize: tokens.typography.fontSize.sm }}
              >
                Loading...
              </span>
            </motion.div>
          )}

          {/* Skip button */}
          {showSkipButton && isLoaded && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={handleSkip}
              style={{
                position: 'absolute',
                bottom: tokens.spacing[8],
                right: tokens.spacing[8],
                padding: `${tokens.spacing[3]} ${tokens.spacing[6]}`,
                background: tokens.colors.surface.glass,
                backdropFilter: `blur(${tokens.blur.glass})`,
                border: `1px solid ${tokens.colors.surface.glassBorder}`,
                borderRadius: tokens.radii.button,
                color: tokens.colors.text.secondary,
                fontSize: tokens.typography.fontSize.sm,
                fontWeight: tokens.typography.fontWeight.medium,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing[2],
                transition: `all ${tokens.transitions.duration.fast}`,
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.background = tokens.colors.surface.glassHover;
                e.currentTarget.style.borderColor = tokens.colors.surface.glassBorderHover;
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.background = tokens.colors.surface.glass;
                e.currentTarget.style.borderColor = tokens.colors.surface.glassBorder;
              }}
            >
              Skip Intro
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </motion.button>
          )}

          {/* Progress indicator */}
          {isLoaded && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: autoSkipDelay / 1000, ease: 'linear' }}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg, ${tokens.colors.accent.primary}, ${tokens.colors.accent.secondary})`,
                transformOrigin: 'left',
                boxShadow: tokens.shadows.glowPurple,
              }}
            />
          )}

          {/* Scroll hint */}
          {isLoaded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              style={{
                position: 'absolute',
                bottom: tokens.spacing[8],
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: tokens.spacing[2],
                color: tokens.colors.text.muted,
                fontSize: tokens.typography.fontSize.sm,
              }}
            >
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
              </motion.div>
              <span>Scroll or click to continue</span>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HeroVideo;
