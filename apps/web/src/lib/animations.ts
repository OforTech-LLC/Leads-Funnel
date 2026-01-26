/**
 * Animation Utilities
 * GSAP and scroll animation hooks
 */

'use client';

import { useEffect, useRef, RefObject } from 'react';

/**
 * Lazy load GSAP and plugins
 */
export async function loadGsap() {
  const gsap = (await import('gsap')).default;
  const ScrollTrigger = (await import('gsap/ScrollTrigger')).default;
  gsap.registerPlugin(ScrollTrigger);
  return { gsap, ScrollTrigger };
}

/**
 * Split text animation hook
 * Animates text characters with stagger effect
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

  useEffect(() => {
    if (hasAnimated.current) return;

    const animate = async () => {
      const { gsap } = await loadGsap();
      const element = document.querySelector(selector);
      if (!element) return;

      const text = element.textContent || '';
      const words = text.split(' ');

      element.innerHTML = words
        .map(
          (word) =>
            `<span class="word" style="display: inline-block; overflow: hidden;"><span class="word-inner" style="display: inline-block;">${word}</span></span>`
        )
        .join('<span style="display: inline-block;">&nbsp;</span>');

      gsap.from(`${selector} .word-inner`, {
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
    return () => clearTimeout(timer);
  }, [selector, options]);
}

/**
 * Scroll-triggered fade up animation
 */
export function useScrollFadeUp(
  selector: string,
  options?: {
    y?: number;
    duration?: number;
    start?: string;
    ease?: string;
  }
) {
  useEffect(() => {
    let scrollTriggerInstance: unknown;

    const animate = async () => {
      const { gsap, ScrollTrigger } = await loadGsap();

      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) return;

      elements.forEach((element) => {
        const trigger = gsap.from(element, {
          y: options?.y ?? 60,
          opacity: 0,
          duration: options?.duration ?? 0.7,
          ease: options?.ease ?? 'power3.out',
          scrollTrigger: {
            trigger: element,
            start: options?.start ?? 'top 85%',
            toggleActions: 'play none none none',
          },
        });

        scrollTriggerInstance = trigger;
      });
    };

    animate();

    return () => {
      loadGsap().then(({ ScrollTrigger }) => {
        ScrollTrigger.getAll().forEach((t) => t.kill());
      });
    };
  }, [selector, options]);
}

/**
 * Stagger reveal animation for multiple elements
 */
export function useStaggerReveal(
  containerSelector: string,
  childSelector: string,
  options?: {
    y?: number;
    stagger?: number;
    duration?: number;
    start?: string;
  }
) {
  useEffect(() => {
    const animate = async () => {
      const { gsap, ScrollTrigger } = await loadGsap();

      const container = document.querySelector(containerSelector);
      if (!container) return;

      gsap.from(`${containerSelector} ${childSelector}`, {
        y: options?.y ?? 80,
        opacity: 0,
        duration: options?.duration ?? 0.8,
        stagger: options?.stagger ?? 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: container,
          start: options?.start ?? 'top 80%',
        },
      });
    };

    animate();

    return () => {
      loadGsap().then(({ ScrollTrigger }) => {
        ScrollTrigger.getAll().forEach((t) => t.kill());
      });
    };
  }, [containerSelector, childSelector, options]);
}

/**
 * Counter animation hook
 * Animates a number counting up
 */
export function useCountUp(
  targetValue: number,
  duration: number = 2000,
  options?: {
    prefix?: string;
    suffix?: string;
    locale?: string;
    decimals?: number;
  }
): RefObject<HTMLSpanElement | null> {
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || hasAnimated.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            animateCount();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(element);

    const animateCount = () => {
      const startTime = performance.now();
      const startValue = 0;

      const update = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic for natural deceleration
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (targetValue - startValue) * easeProgress;

        const formattedValue =
          options?.decimals !== undefined
            ? new Intl.NumberFormat(options?.locale ?? 'en-US', {
                minimumFractionDigits: options.decimals,
                maximumFractionDigits: options.decimals,
              }).format(currentValue)
            : new Intl.NumberFormat(options?.locale ?? 'en-US').format(
                Math.floor(currentValue)
              );

        if (element) {
          element.textContent = `${options?.prefix ?? ''}${formattedValue}${options?.suffix ?? ''}`;
        }

        if (progress < 1) {
          requestAnimationFrame(update);
        }
      };

      requestAnimationFrame(update);
    };

    return () => observer.disconnect();
  }, [targetValue, duration, options]);

  return ref;
}

/**
 * Parallax scroll effect hook
 */
export function useParallax(
  ref: RefObject<HTMLElement>,
  speed: number = 0.3
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const animate = async () => {
      const { gsap, ScrollTrigger } = await loadGsap();

      gsap.to(element, {
        y: () => window.innerHeight * speed,
        ease: 'none',
        scrollTrigger: {
          trigger: element,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    };

    animate();

    return () => {
      loadGsap().then(({ ScrollTrigger }) => {
        ScrollTrigger.getAll().forEach((t) => t.kill());
      });
    };
  }, [ref, speed]);
}

/**
 * Scroll progress indicator hook
 */
export function useScrollProgress(): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

      element.style.width = `${progress}%`;
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();

    return () => window.removeEventListener('scroll', updateProgress);
  }, []);

  return ref;
}
