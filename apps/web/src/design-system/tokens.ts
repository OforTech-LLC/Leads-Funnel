/**
 * Design System Tokens
 * Glassmorphism / Liquid Glass Design System
 * Inspired by modern dark UI with purple/indigo accents
 */

// =============================================================================
// Color Palette
// =============================================================================

export const colors = {
  // Background colors (dark theme base)
  background: {
    primary: '#0a0a0f',      // Deep dark base
    secondary: '#12121a',    // Slightly lighter
    tertiary: '#1a1a2e',     // Card backgrounds
    elevated: '#222238',     // Elevated surfaces
  },

  // Surface colors (glass layers)
  surface: {
    glass: 'rgba(255, 255, 255, 0.03)',
    glassHover: 'rgba(255, 255, 255, 0.06)',
    glassActive: 'rgba(255, 255, 255, 0.08)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    glassBorderHover: 'rgba(255, 255, 255, 0.15)',
  },

  // Accent colors (purple/indigo spectrum)
  accent: {
    primary: '#8b5cf6',      // Vivid purple
    primaryHover: '#a78bfa', // Lighter purple
    secondary: '#6366f1',    // Indigo
    secondaryHover: '#818cf8',
    tertiary: '#ec4899',     // Pink accent
    gradient: {
      start: '#8b5cf6',
      mid: '#6366f1',
      end: '#ec4899',
    },
  },

  // Glow colors (for ambient effects)
  glow: {
    purple: 'rgba(139, 92, 246, 0.4)',
    purpleSubtle: 'rgba(139, 92, 246, 0.15)',
    indigo: 'rgba(99, 102, 241, 0.4)',
    indigoSubtle: 'rgba(99, 102, 241, 0.15)',
    pink: 'rgba(236, 72, 153, 0.3)',
    pinkSubtle: 'rgba(236, 72, 153, 0.1)',
  },

  // Text colors
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.5)',
    muted: 'rgba(255, 255, 255, 0.4)',
    inverse: '#0a0a0f',
  },

  // Status colors
  status: {
    success: '#22c55e',
    successGlow: 'rgba(34, 197, 94, 0.3)',
    error: '#ef4444',
    errorGlow: 'rgba(239, 68, 68, 0.3)',
    warning: '#f59e0b',
    warningGlow: 'rgba(245, 158, 11, 0.3)',
    info: '#3b82f6',
    infoGlow: 'rgba(59, 130, 246, 0.3)',
  },

  // Border colors
  border: {
    subtle: 'rgba(255, 255, 255, 0.06)',
    default: 'rgba(255, 255, 255, 0.1)',
    strong: 'rgba(255, 255, 255, 0.2)',
    accent: 'rgba(139, 92, 246, 0.5)',
  },
} as const;

// =============================================================================
// Blur Levels
// =============================================================================

export const blur = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  '3xl': '40px',
  glass: '12px',        // Standard glass blur
  glassHeavy: '20px',   // Heavy glass effect
  background: '100px',  // Background blur
} as const;

// =============================================================================
// Border Radius
// =============================================================================

export const radii = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  '3xl': '32px',
  full: '9999px',
  card: '16px',
  button: '12px',
  input: '10px',
} as const;

// =============================================================================
// Shadows
// =============================================================================

export const shadows = {
  // Subtle shadows
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px rgba(0, 0, 0, 0.4)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.6)',
  '2xl': '0 25px 50px rgba(0, 0, 0, 0.7)',

  // Glass shadows
  glass: '0 8px 32px rgba(0, 0, 0, 0.3)',
  glassHover: '0 12px 40px rgba(0, 0, 0, 0.4)',
  glassElevated: '0 16px 48px rgba(0, 0, 0, 0.5)',

  // Glow shadows
  glowPurple: '0 0 20px rgba(139, 92, 246, 0.3), 0 0 40px rgba(139, 92, 246, 0.1)',
  glowPurpleStrong: '0 0 30px rgba(139, 92, 246, 0.5), 0 0 60px rgba(139, 92, 246, 0.2)',
  glowIndigo: '0 0 20px rgba(99, 102, 241, 0.3), 0 0 40px rgba(99, 102, 241, 0.1)',
  glowPink: '0 0 20px rgba(236, 72, 153, 0.3), 0 0 40px rgba(236, 72, 153, 0.1)',

  // Inner glow (for glass effect)
  innerGlow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)',
  innerGlowStrong: 'inset 0 2px 4px rgba(255, 255, 255, 0.1)',
} as const;

// =============================================================================
// Spacing
// =============================================================================

export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
} as const;

// =============================================================================
// Typography
// =============================================================================

export const typography = {
  fontFamily: {
    sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: '"Cal Sans", "Inter", -apple-system, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", Consolas, monospace',
  },
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
    '6xl': '3.75rem',   // 60px
    '7xl': '4.5rem',    // 72px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// =============================================================================
// Transitions
// =============================================================================

export const transitions = {
  // Timing functions
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  // Durations
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '700ms',
    slowest: '1000ms',
  },
} as const;

// =============================================================================
// Z-Index Scale
// =============================================================================

export const zIndex = {
  behind: -1,
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// =============================================================================
// Breakpoints
// =============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// =============================================================================
// Glass Effect Presets
// =============================================================================

export const glassPresets = {
  // Light glass (subtle)
  light: {
    background: colors.surface.glass,
    backdropFilter: `blur(${blur.glass})`,
    border: `1px solid ${colors.surface.glassBorder}`,
    boxShadow: shadows.glass,
  },
  // Medium glass
  medium: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: `blur(${blur.lg})`,
    border: `1px solid ${colors.surface.glassBorder}`,
    boxShadow: `${shadows.glass}, ${shadows.innerGlow}`,
  },
  // Heavy glass
  heavy: {
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: `blur(${blur.glassHeavy})`,
    border: `1px solid ${colors.border.default}`,
    boxShadow: `${shadows.glassElevated}, ${shadows.innerGlowStrong}`,
  },
  // Accent glass (with glow)
  accent: {
    background: 'rgba(139, 92, 246, 0.1)',
    backdropFilter: `blur(${blur.glass})`,
    border: `1px solid ${colors.border.accent}`,
    boxShadow: shadows.glowPurple,
  },
} as const;

// =============================================================================
// Export all tokens
// =============================================================================

export const tokens = {
  colors,
  blur,
  radii,
  shadows,
  spacing,
  typography,
  transitions,
  zIndex,
  breakpoints,
  glassPresets,
} as const;

export default tokens;
