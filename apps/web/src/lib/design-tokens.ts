/**
 * Design Tokens
 * Industry-specific color palettes and typography system
 */

export const industryPalettes = {
  'real-estate': {
    primary: '#1E3A5F',
    primaryDark: '#152A45',
    secondary: '#D4AF37',
    accent: '#4ECDC4',
    background: '#FAFBFC',
    surface: '#FFFFFF',
    text: '#1A1A2E',
    textMuted: '#6B7280',
  },
  'insurance': {
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    secondary: '#10B981',
    accent: '#F59E0B',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#0F172A',
    textMuted: '#64748B',
  },
  'health': {
    primary: '#0D9488',
    primaryDark: '#0F766E',
    secondary: '#6366F1',
    accent: '#F472B6',
    background: '#F0FDFA',
    surface: '#FFFFFF',
    text: '#134E4A',
    textMuted: '#5EEAD4',
  },
  'home-services': {
    primary: '#EA580C',
    primaryDark: '#C2410C',
    secondary: '#1D4ED8',
    accent: '#84CC16',
    background: '#FFFBEB',
    surface: '#FFFFFF',
    text: '#1C1917',
    textMuted: '#78716C',
  },
  'legal': {
    primary: '#18181B',
    primaryDark: '#09090B',
    secondary: '#991B1B',
    accent: '#CA8A04',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#09090B',
    textMuted: '#71717A',
  },
  'business': {
    primary: '#4F46E5',
    primaryDark: '#4338CA',
    secondary: '#0EA5E9',
    accent: '#10B981',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#0F172A',
    textMuted: '#64748B',
  },
  'auto': {
    primary: '#DC2626',
    primaryDark: '#B91C1C',
    secondary: '#171717',
    accent: '#FACC15',
    background: '#FAFAF9',
    surface: '#FFFFFF',
    text: '#1C1917',
    textMuted: '#78716C',
  },
  'education': {
    primary: '#7C3AED',
    primaryDark: '#6D28D9',
    secondary: '#2563EB',
    accent: '#F472B6',
    background: '#FAF5FF',
    surface: '#FFFFFF',
    text: '#1E1B4B',
    textMuted: '#6B7280',
  },
  'events': {
    primary: '#DB2777',
    primaryDark: '#BE185D',
    secondary: '#7C3AED',
    accent: '#FBBF24',
    background: '#FDF2F8',
    surface: '#FFFFFF',
    text: '#1F2937',
    textMuted: '#6B7280',
  },
} as const;

export type IndustryPalette = keyof typeof industryPalettes;

/**
 * Map funnelId to industry palette
 */
export const funnelIndustryMap: Record<string, IndustryPalette> = {
  // Core Services
  'real-estate': 'real-estate',
  'life-insurance': 'insurance',
  'construction': 'home-services',
  'moving': 'home-services',
  'dentist': 'health',
  'plastic-surgeon': 'health',
  'roofing': 'home-services',
  'cleaning': 'home-services',

  // Home Services (19)
  'hvac': 'home-services',
  'plumbing': 'home-services',
  'electrician': 'home-services',
  'pest-control': 'home-services',
  'landscaping': 'home-services',
  'pool-service': 'home-services',
  'home-remodeling': 'home-services',
  'solar': 'home-services',
  'locksmith': 'home-services',
  'pressure-washing': 'home-services',
  'water-damage-restoration': 'home-services',
  'mold-remediation': 'home-services',
  'flooring': 'home-services',
  'painting': 'home-services',
  'windows-doors': 'home-services',
  'fencing': 'home-services',
  'concrete': 'home-services',
  'junk-removal': 'home-services',
  'appliance-repair': 'home-services',

  // Health & Beauty (7)
  'orthodontist': 'health',
  'dermatology': 'health',
  'medspa': 'health',
  'chiropractic': 'health',
  'physical-therapy': 'health',
  'hair-transplant': 'health',
  'cosmetic-dentistry': 'health',

  // Professional & Legal (5)
  'personal-injury-attorney': 'legal',
  'immigration-attorney': 'legal',
  'criminal-defense-attorney': 'legal',
  'tax-accounting': 'business',
  'business-consulting': 'business',

  // Business Services (4)
  'commercial-cleaning': 'business',
  'security-systems': 'business',
  'it-services': 'business',
  'marketing-agency': 'business',

  // Auto Services (4)
  'auto-repair': 'auto',
  'auto-detailing': 'auto',
  'towing': 'auto',
  'auto-glass': 'auto',
};

/**
 * Get palette for a funnel
 */
export function getFunnelPalette(funnelId: string) {
  const industry = funnelIndustryMap[funnelId] || 'business';
  return industryPalettes[industry];
}

/**
 * Typography scale
 */
export const typography = {
  fontFamily: {
    display: ['var(--font-display)', 'Inter', 'system-ui', 'sans-serif'],
    body: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
    mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
  },
  fontSize: {
    'hero-xl': ['clamp(3rem, 8vw, 6rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
    'hero-lg': ['clamp(2.5rem, 6vw, 4.5rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
    'section-title': ['clamp(2rem, 4vw, 3rem)', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
    'body-lg': ['1.25rem', { lineHeight: '1.6' }],
    'body': ['1rem', { lineHeight: '1.7' }],
    'small': ['0.875rem', { lineHeight: '1.5' }],
  },
} as const;

/**
 * Layout system
 */
export const layout = {
  maxWidth: {
    content: '1280px',
    text: '720px',
    form: '560px',
  },
  spacing: {
    section: 'clamp(4rem, 10vw, 8rem)',
    sectionMobile: 'clamp(3rem, 8vw, 5rem)',
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    full: '9999px',
  },
} as const;

/**
 * Animation durations
 */
export const animation = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
  verySlow: '800ms',
} as const;
