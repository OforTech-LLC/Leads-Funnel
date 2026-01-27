/**
 * Animation Utilities
 * GSAP and scroll animation hooks with proper cleanup and singleton pattern
 */

'use client';

import { useEffect, useRef, RefObject } from 'react';

// ============================================================================
// GSAP Singleton Pattern - Prevents re-registering plugins on every import
// ============================================================================

type GSAPInstance = typeof import('gsap').default;
type ScrollTriggerInstance = typeof import('gsap/ScrollTrigger').default;

interface GSAPCache {
  gsap: GSAPInstance | null;
  ScrollTrigger: ScrollTriggerInstance | null;
  initialized: boolean;
  initPromise: Promise<{ gsap: GSAPInstance; ScrollTrigger: ScrollTriggerInstance }> | null;
}

// Global cache for GSAP instance
const gsapCache: GSAPCache = {
  gsap: null,
  ScrollTrigger: null,
  initialized: false,
  initPromise: null,
};

/**
 * Lazy load GSAP and plugins with singleton pattern
 * Caches the instance globally to prevent re-registration
 */
export async function loadGsap(): Promise<{
  gsap: GSAPInstance;
  ScrollTrigger: ScrollTriggerInstance;
}> {
  // Return cached instance if already initialized
  if (gsapCache.initialized && gsapCache.gsap && gsapCache.ScrollTrigger) {
    return { gsap: gsapCache.gsap, ScrollTrigger: gsapCache.ScrollTrigger };
  }

  // Return existing promise if initialization is in progress
  if (gsapCache.initPromise) {
    return gsapCache.initPromise;
  }

  // Create new initialization promise
  gsapCache.initPromise = (async () => {
    const gsap = (await import('gsap')).default;
    const ScrollTrigger = (await import('gsap/ScrollTrigger')).default;

    // Only register plugin once
    if (!gsapCache.initialized) {
      gsap.registerPlugin(ScrollTrigger);
      gsapCache.gsap = gsap;
      gsapCache.ScrollTrigger = ScrollTrigger;
      gsapCache.initialized = true;
    }

    return { gsap: gsapCache.gsap!, ScrollTrigger: gsapCache.ScrollTrigger! };
  })();

  return gsapCache.initPromise;
}

/**
 * Get cached GSAP instance synchronously (returns null if not loaded)
 */
export function getCachedGsap(): {
  gsap: GSAPInstance;
  ScrollTrigger: ScrollTriggerInstance;
} | null {
  if (gsapCache.initialized && gsapCache.gsap && gsapCache.ScrollTrigger) {
    return { gsap: gsapCache.gsap, ScrollTrigger: gsapCache.ScrollTrigger };
  }
  return null;
}

// ============================================================================
// Animation Hooks with Proper Cleanup
// ============================================================================

/**
 * Split text animation hook
 * Animates text characters with stagger effect
 * Uses safe DOM methods instead of innerHTML to prevent XSS
 */
export function useSplitTextAnimation(
  selector: string,
  options?: {
    delay?: number;
    stagger?: number;
    duration?: number;
    ease?: string;
  }
) {
  const hasAnimated = useRef(false);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (hasAnimated.current) return;

    const animate = async () => {
      const { gsap } = await loadGsap();
      const element = document.querySelector(selector);
      if (!element) return;

      const text = element.textContent || '';
      const words = text.split(' ');

      // Clear existing content safely
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }

      // Build DOM elements safely (no innerHTML - prevents XSS)
      words.forEach((word, index) => {
        // Create word wrapper
        const wordWrapper = document.createElement('span');
        wordWrapper.className = 'word';
        wordWrapper.style.display = 'inline-block';
        wordWrapper.style.overflow = 'hidden';

        // Create inner word span
        const wordInner = document.createElement('span');
        wordInner.className = 'word-inner';
        wordInner.style.display = 'inline-block';
        wordInner.textContent = word; // Safe: textContent escapes HTML

        wordWrapper.appendChild(wordInner);
        element.appendChild(wordWrapper);

        // Add space between words (except after last word)
        if (index < words.length - 1) {
          const space = document.createElement('span');
          space.style.display = 'inline-block';
          space.textContent = '\u00A0'; // Non-breaking space (safe)
          element.appendChild(space);
        }
      });

      tweenRef.current = gsap.from(`${selector} .word-inner`, {
        y: '110%',
        opacity: 0,
        duration: options?.duration ?? 0.8,
        stagger: options?.stagger ?? 0.05,
        ease: options?.ease ?? 'power4.out',
        delay: options?.delay ?? 0,
      });

      hasAnimated.current = true;
    };

    // Delay to ensure DOM is ready
    const timer = setTimeout(animate, 100);

    return () => {
      clearTimeout(timer);
      // Kill the tween on cleanup
      if (tweenRef.current) {
        tweenRef.current.kill();
        tweenRef.current = null;
      }
    };
  }, [selector, options?.delay, options?.stagger, options?.duration, options?.ease]);
}

/**
 * Scroll-triggered fade up animation with proper cleanup
 */
export function useScrollFadeUp(
  ref: RefObject<HTMLElement>,
  options?: {
    start?: string;
    end?: string;
    duration?: number;
    delay?: number;
    y?: number;
    markers?: boolean;
  }
) {
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const setup = async () => {
      const { gsap, ScrollTrigger } = await loadGsap();

      if (!ref.current) return;

      tweenRef.current = gsap.from(ref.current, {
        y: options?.y ?? 50,
        opacity: 0,
        duration: options?.duration ?? 1,
        delay: options?.delay ?? 0,
        scrollTrigger: {
          trigger: ref.current,
          start: options?.start ?? 'top 80%',
          end: options?.end ?? 'bottom 20%',
          markers: options?.markers ?? false,
          toggleActions: 'play none none reverse',
          onEnter: () => {
            const trigger = ScrollTrigger.getById(ref.current?.dataset.triggerId || '');
            triggerRef.current = trigger ?? null;
          },
        },
      });
    };

    setup();

    const cleanup = () => {
      if (tweenRef.current) {
        tweenRef.current.kill();
        tweenRef.current = null;
      }
      if (triggerRef.current) {
        triggerRef.current.kill();
        triggerRef.current = null;
      }
    };

    return cleanup;
  }, [
    ref,
    options?.start,
    options?.end,
    options?.duration,
    options?.delay,
    options?.y,
    options?.markers,
  ]);
}

/**
 * Parallax scroll effect hook with cleanup
 */
export function useParallax(
  ref: RefObject<HTMLElement>,
  speed: number = 0.5,
  options?: {
    start?: string;
    end?: string;
  }
) {
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const setup = async () => {
      const { gsap, ScrollTrigger } = await loadGsap();

      if (!ref.current) return;

      tweenRef.current = gsap.to(ref.current, {
        y: `${speed * 100}%`,
        ease: 'none',
        scrollTrigger: {
          trigger: ref.current,
          start: options?.start ?? 'top bottom',
          end: options?.end ?? 'bottom top',
          scrub: true,
          onEnter: () => {
            const trigger = ScrollTrigger.getById(ref.current?.dataset.triggerId || '');
            triggerRef.current = trigger ?? null;
          },
        },
      });
    };

    setup();

    const cleanup = () => {
      if (tweenRef.current) {
        tweenRef.current.kill();
        tweenRef.current = null;
      }
      if (triggerRef.current) {
        triggerRef.current.kill();
        triggerRef.current = null;
      }
    };

    return cleanup;
  }, [ref, speed, options?.start, options?.end]);
}

/**
 * Stagger animation for lists of elements with cleanup
 */
export function useStaggerAnimation(
  containerRef: RefObject<HTMLElement>,
  childSelector: string,
  options?: {
    delay?: number;
    stagger?: number;
    duration?: number;
    y?: number;
    start?: string;
  }
) {
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const setup = async () => {
      const { gsap, ScrollTrigger } = await loadGsap();

      if (!containerRef.current) return;

      const children = containerRef.current.querySelectorAll(childSelector);
      if (children.length === 0) return;

      timelineRef.current = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: options?.start ?? 'top 80%',
          toggleActions: 'play none none reverse',
          onEnter: () => {
            const trigger = ScrollTrigger.getById(containerRef.current?.dataset.triggerId || '');
            triggerRef.current = trigger ?? null;
          },
        },
      });

      timelineRef.current.from(children, {
        y: options?.y ?? 30,
        opacity: 0,
        duration: options?.duration ?? 0.6,
        stagger: options?.stagger ?? 0.1,
        delay: options?.delay ?? 0,
      });
    };

    setup();

    const cleanup = () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
      if (triggerRef.current) {
        triggerRef.current.kill();
        triggerRef.current = null;
      }
    };

    return cleanup;
  }, [
    containerRef,
    childSelector,
    options?.delay,
    options?.stagger,
    options?.duration,
    options?.y,
    options?.start,
  ]);
}

/**
 * Global ScrollTrigger refresh utility
 * Call this when layout changes (e.g., after images load)
 */
export async function refreshScrollTrigger(): Promise<void> {
  const cached = getCachedGsap();
  if (cached) {
    cached.ScrollTrigger.refresh();
  }
}

/**
 * Kill all ScrollTriggers - useful for page transitions
 */
export async function killAllScrollTriggers(): Promise<void> {
  const cached = getCachedGsap();
  if (cached) {
    cached.ScrollTrigger.getAll().forEach((trigger: ScrollTrigger) => trigger.kill());
  }
}
