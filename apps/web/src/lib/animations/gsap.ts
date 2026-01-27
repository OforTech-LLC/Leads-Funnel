/**
 * GSAP Animation Utilities
 * Page transitions, sleep animations, and ambient effects
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// =============================================================================
// Types
// =============================================================================

interface SleepAnimationConfig {
  elements: string | Element[];
  duration?: number;
  idleTimeout?: number;
  onStart?: () => void;
  onStop?: () => void;
}

interface PageTransitionConfig {
  container: string | Element;
  duration?: number;
  ease?: string;
}

// =============================================================================
// Utility: Check for reduced motion preference
// =============================================================================

export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// =============================================================================
// Utility: Check if tab is visible
// =============================================================================

export const isTabVisible = (): boolean => {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible';
};

// =============================================================================
// Page Transition: Hero to Content
// =============================================================================

export const createHeroToContentTransition = (config: PageTransitionConfig): gsap.core.Timeline => {
  const { container, duration = 1, ease = 'power2.out' } = config;

  const tl = gsap.timeline({ paused: true });

  // Video fade out
  tl.to('.hero-video-container', {
    opacity: 0,
    scale: 1.1,
    filter: 'blur(20px)',
    duration: duration * 0.6,
    ease,
  });

  // Content reveal
  tl.fromTo(
    container,
    {
      opacity: 0,
      y: 50,
    },
    {
      opacity: 1,
      y: 0,
      duration: duration * 0.8,
      ease,
    },
    '-=0.3'
  );

  return tl;
};

// =============================================================================
// Stagger Reveal Animation
// =============================================================================

export const createStaggerReveal = (
  selector: string,
  options?: {
    stagger?: number;
    duration?: number;
    y?: number;
    delay?: number;
  }
): gsap.core.Tween | null => {
  if (prefersReducedMotion()) return null;

  const { stagger = 0.1, duration = 0.6, y = 30, delay = 0 } = options || {};

  return gsap.fromTo(
    selector,
    {
      opacity: 0,
      y,
    },
    {
      opacity: 1,
      y: 0,
      duration,
      stagger,
      delay,
      ease: 'power2.out',
    }
  );
};

// =============================================================================
// Scroll-triggered reveal
// =============================================================================

export const createScrollReveal = (
  selector: string,
  options?: {
    start?: string;
    end?: string;
    scrub?: boolean | number;
    markers?: boolean;
  }
): ScrollTrigger[] | null => {
  if (prefersReducedMotion()) return null;

  const { start = 'top 80%', end = 'bottom 20%', scrub = false, markers = false } = options || {};

  const elements = document.querySelectorAll(selector);
  const triggers: ScrollTrigger[] = [];

  elements.forEach((element) => {
    const trigger = ScrollTrigger.create({
      trigger: element,
      start,
      end,
      scrub,
      markers,
      onEnter: () => {
        gsap.to(element, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
        });
      },
    });

    // Set initial state
    gsap.set(element, { opacity: 0, y: 30 });

    triggers.push(trigger);
  });

  return triggers;
};

// =============================================================================
// Sleep Animation Manager
// =============================================================================

export class SleepAnimationManager {
  private timeline: gsap.core.Timeline | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private config: SleepAnimationConfig;
  private isActive = false;
  private visibilityHandler: (() => void) | null = null;
  private activityHandler: (() => void) | null = null;

  constructor(config: SleepAnimationConfig) {
    this.config = {
      duration: 4,
      idleTimeout: 5000,
      ...config,
    };
  }

  // Initialize and start watching for idle
  init(): void {
    if (prefersReducedMotion()) return;

    this.setupVisibilityListener();
    this.setupActivityListeners();
    this.startIdleTimer();
  }

  // Create the ambient animation timeline
  private createTimeline(): gsap.core.Timeline {
    const { elements, duration } = this.config;
    const tl = gsap.timeline({ repeat: -1, yoyo: true });

    // Gentle floating animation
    tl.to(elements, {
      y: '+=10',
      x: '+=5',
      rotation: '+=2',
      duration: duration,
      ease: 'sine.inOut',
      stagger: {
        each: 0.5,
        from: 'random',
      },
    });

    // Subtle glow pulse
    tl.to(
      elements,
      {
        filter: 'brightness(1.1) blur(0.5px)',
        duration: duration! / 2,
        ease: 'sine.inOut',
        stagger: 0.3,
      },
      0
    );

    return tl;
  }

  // Start the sleep animation
  private start(): void {
    if (this.isActive || prefersReducedMotion() || !isTabVisible()) return;

    this.isActive = true;
    this.timeline = this.createTimeline();
    this.config.onStart?.();
  }

  // Stop the sleep animation
  private stop(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.timeline?.kill();
    this.timeline = null;

    // Reset elements to original state
    gsap.to(this.config.elements, {
      y: 0,
      x: 0,
      rotation: 0,
      filter: 'brightness(1) blur(0)',
      duration: 0.3,
      ease: 'power2.out',
    });

    this.config.onStop?.();
  }

  // Start idle timer
  private startIdleTimer(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      this.start();
    }, this.config.idleTimeout);
  }

  // Clear idle timer
  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  // Handle user activity
  private handleActivity = (): void => {
    this.stop();
    this.startIdleTimer();
  };

  // Setup visibility listener
  private setupVisibilityListener(): void {
    this.visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        this.stop();
        this.clearIdleTimer();
      } else {
        this.startIdleTimer();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  // Setup activity listeners
  private setupActivityListeners(): void {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

    this.activityHandler = this.handleActivity.bind(this);

    events.forEach((event) => {
      document.addEventListener(event, this.activityHandler!, { passive: true });
    });
  }

  // Cleanup
  destroy(): void {
    this.stop();
    this.clearIdleTimer();

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }

    if (this.activityHandler) {
      const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
      events.forEach((event) => {
        document.removeEventListener(event, this.activityHandler!);
      });
    }
  }
}

// =============================================================================
// Background Glow Animation
// =============================================================================

export const createBackgroundGlowAnimation = (
  selector: string,
  options?: {
    colors?: string[];
    duration?: number;
  }
): gsap.core.Timeline | null => {
  if (prefersReducedMotion()) return null;

  const {
    colors = ['rgba(139, 92, 246, 0.3)', 'rgba(99, 102, 241, 0.3)', 'rgba(236, 72, 153, 0.2)'],
    duration = 8,
  } = options || {};

  const elements = document.querySelectorAll(selector);
  const tl = gsap.timeline({ repeat: -1 });

  elements.forEach((element, i) => {
    const color = colors[i % colors.length];

    tl.to(
      element,
      {
        background: `radial-gradient(circle at ${50 + Math.sin(i) * 30}% ${50 + Math.cos(i) * 30}%, ${color} 0%, transparent 70%)`,
        x: `+=${Math.sin(i * 0.5) * 50}`,
        y: `+=${Math.cos(i * 0.5) * 50}`,
        scale: 1 + Math.sin(i) * 0.2,
        duration: duration,
        ease: 'sine.inOut',
      },
      i * 0.5
    );
  });

  return tl;
};

// =============================================================================
// Parallax Effect
// =============================================================================

export const createParallaxEffect = (
  selector: string,
  options?: {
    speed?: number;
    direction?: 'vertical' | 'horizontal';
  }
): ScrollTrigger | null => {
  if (prefersReducedMotion()) return null;

  const { speed = 0.5, direction = 'vertical' } = options || {};

  return ScrollTrigger.create({
    trigger: selector,
    start: 'top bottom',
    end: 'bottom top',
    scrub: true,
    onUpdate: (self) => {
      const progress = self.progress;
      const movement = (progress - 0.5) * 100 * speed;

      gsap.set(selector, {
        [direction === 'vertical' ? 'y' : 'x']: movement,
      });
    },
  });
};

// =============================================================================
// Text Reveal Animation (XSS-safe version)
// =============================================================================

export const createTextReveal = (
  selector: string,
  options?: {
    type?: 'chars' | 'words' | 'lines';
    duration?: number;
    stagger?: number;
  }
): gsap.core.Tween | null => {
  if (prefersReducedMotion()) return null;

  const { type = 'words', duration = 0.8, stagger = 0.05 } = options || {};

  const element = document.querySelector(selector);
  if (!element) return null;

  const text = element.textContent || '';
  let parts: string[];

  switch (type) {
    case 'chars':
      parts = text.split('');
      break;
    case 'lines':
      parts = text.split('\n');
      break;
    default:
      parts = text.split(' ');
  }

  // Clear existing content safely
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }

  // Build DOM elements safely using textContent (prevents XSS)
  parts.forEach((part, index) => {
    const span = document.createElement('span');
    span.className = 'text-reveal-part';
    span.style.display = 'inline-block';
    span.style.opacity = '0';
    span.textContent = part; // Safe: textContent escapes HTML

    // Add space after words (except last)
    if (type === 'words' && index < parts.length - 1) {
      span.textContent = part + '\u00A0'; // Non-breaking space
    }

    element.appendChild(span);
  });

  return gsap.to(`${selector} .text-reveal-part`, {
    opacity: 1,
    y: 0,
    duration,
    stagger,
    ease: 'power2.out',
  });
};

// =============================================================================
// Magnetic Button Effect
// =============================================================================

export const createMagneticEffect = (
  selector: string,
  options?: {
    strength?: number;
    radius?: number;
  }
): (() => void) | null => {
  if (prefersReducedMotion()) return null;

  const { strength = 0.3, radius = 100 } = options || {};
  const elements = document.querySelectorAll(selector);

  const handlers: Array<{
    element: Element;
    handler: (e: MouseEvent) => void;
    leaveHandler: () => void;
  }> = [];

  elements.forEach((element) => {
    const handler = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance < radius) {
        const factor = 1 - distance / radius;
        gsap.to(element, {
          x: deltaX * strength * factor,
          y: deltaY * strength * factor,
          duration: 0.3,
          ease: 'power2.out',
        });
      }
    };

    const leaveHandler = () => {
      gsap.to(element, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)',
      });
    };

    element.addEventListener('mousemove', handler as EventListener);
    element.addEventListener('mouseleave', leaveHandler);
    handlers.push({ element, handler, leaveHandler });
  });

  // Return cleanup function
  return () => {
    handlers.forEach(({ element, handler, leaveHandler }) => {
      element.removeEventListener('mousemove', handler as EventListener);
      element.removeEventListener('mouseleave', leaveHandler);
    });
  };
};

// =============================================================================
// Cleanup utility
// =============================================================================

export const cleanupAnimations = (): void => {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  gsap.killTweensOf('*');
};

// =============================================================================
// Export defaults
// =============================================================================

export default {
  prefersReducedMotion,
  isTabVisible,
  createHeroToContentTransition,
  createStaggerReveal,
  createScrollReveal,
  SleepAnimationManager,
  createBackgroundGlowAnimation,
  createParallaxEffect,
  createTextReveal,
  createMagneticEffect,
  cleanupAnimations,
};
