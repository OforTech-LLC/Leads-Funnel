'use client';

/**
 * Glass UI Primitives
 * Glassmorphism / Liquid Glass Components
 */

import React, { forwardRef, useState } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { tokens } from './tokens';

// =============================================================================
// Types
// =============================================================================

export type GlassVariant = 'light' | 'medium' | 'heavy' | 'accent';
export type GlassSize = 'sm' | 'md' | 'lg' | 'xl';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';

// Size value maps with explicit typing
const glassSizePadding: Record<GlassSize, string> = {
  sm: '12px',
  md: '24px',
  lg: '32px',
  xl: '48px',
};

// =============================================================================
// CSS-in-JS Helpers
// =============================================================================

const getGlassStyles = (variant: GlassVariant = 'light') => {
  const preset = tokens.glassPresets[variant];
  return {
    background: preset.background,
    backdropFilter: preset.backdropFilter,
    WebkitBackdropFilter: preset.backdropFilter,
    border: preset.border,
    boxShadow: preset.boxShadow,
  };
};

// =============================================================================
// GlassCard
// =============================================================================

interface GlassCardProps extends HTMLMotionProps<'div'> {
  variant?: GlassVariant;
  padding?: GlassSize;
  hover?: boolean;
  glow?: boolean;
  children: React.ReactNode;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ variant = 'light', padding = 'md', hover = true, glow = false, children, style, ...props }, ref) => {
    const paddingValues: Record<GlassSize, string> = {
      sm: tokens.spacing[3],
      md: tokens.spacing[6],
      lg: tokens.spacing[8],
      xl: tokens.spacing[12],
    };

    const baseStyles: React.CSSProperties = {
      ...getGlassStyles(variant),
      borderRadius: tokens.radii.card,
      padding: paddingValues[padding as GlassSize],
      position: 'relative',
      overflow: 'hidden',
      ...style,
    };

    return (
      <motion.div
        ref={ref}
        style={baseStyles}
        whileHover={hover ? {
          scale: 1.02,
          boxShadow: glow ? tokens.shadows.glowPurpleStrong : tokens.shadows.glassHover,
        } : undefined}
        transition={{ duration: 0.2, ease: tokens.transitions.easing.default }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

// =============================================================================
// GlassButton
// =============================================================================

interface GlassButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: GlassSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth = false, loading = false, icon, children, style, disabled, ...props }, ref) => {
    const sizeStyles: Record<GlassSize, { padding: string; fontSize: string }> = {
      sm: { padding: '8px 16px', fontSize: tokens.typography.fontSize.sm },
      md: { padding: '12px 24px', fontSize: tokens.typography.fontSize.base },
      lg: { padding: '16px 32px', fontSize: tokens.typography.fontSize.lg },
      xl: { padding: '20px 40px', fontSize: tokens.typography.fontSize.xl },
    };

    const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
      primary: {
        background: `linear-gradient(135deg, ${tokens.colors.accent.primary} 0%, ${tokens.colors.accent.secondary} 100%)`,
        color: tokens.colors.text.primary,
        border: 'none',
        boxShadow: tokens.shadows.glowPurple,
      },
      secondary: {
        ...getGlassStyles('medium'),
        color: tokens.colors.text.primary,
      },
      ghost: {
        background: 'transparent',
        color: tokens.colors.text.secondary,
        border: 'none',
      },
      outline: {
        background: 'transparent',
        color: tokens.colors.accent.primary,
        border: `2px solid ${tokens.colors.accent.primary}`,
      },
    };

    const baseStyles: React.CSSProperties = {
      ...variantStyles[variant as ButtonVariant],
      ...sizeStyles[size as GlassSize],
      borderRadius: tokens.radii.button,
      fontWeight: tokens.typography.fontWeight.semibold,
      fontFamily: tokens.typography.fontFamily.sans,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled || loading ? 0.6 : 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.spacing[2],
      width: fullWidth ? '100%' : 'auto',
      transition: `all ${tokens.transitions.duration.fast} ${tokens.transitions.easing.default}`,
      ...style,
    };

    return (
      <motion.button
        ref={ref}
        style={baseStyles}
        whileHover={!disabled && !loading ? { scale: 1.02, boxShadow: variant === 'primary' ? tokens.shadows.glowPurpleStrong : tokens.shadows.glassHover } : undefined}
        whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ display: 'inline-block', width: '1em', height: '1em', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }}
          />
        ) : icon}
        {children}
      </motion.button>
    );
  }
);

GlassButton.displayName = 'GlassButton';

// =============================================================================
// GlassInput
// =============================================================================

interface GlassInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  size?: GlassSize;
  icon?: React.ReactNode;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ label, error, size = 'md', icon, style, className, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    const sizeStyles = {
      sm: { padding: '8px 12px', fontSize: tokens.typography.fontSize.sm },
      md: { padding: '12px 16px', fontSize: tokens.typography.fontSize.base },
      lg: { padding: '16px 20px', fontSize: tokens.typography.fontSize.lg },
      xl: { padding: '20px 24px', fontSize: tokens.typography.fontSize.xl },
    };

    const containerStyles: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: tokens.spacing[2],
      width: '100%',
    };

    const inputWrapperStyles: React.CSSProperties = {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    };

    const inputStyles: React.CSSProperties = {
      ...getGlassStyles('light'),
      ...sizeStyles[size],
      width: '100%',
      borderRadius: tokens.radii.input,
      color: tokens.colors.text.primary,
      fontFamily: tokens.typography.fontFamily.sans,
      outline: 'none',
      border: focused
        ? `1px solid ${tokens.colors.accent.primary}`
        : error
        ? `1px solid ${tokens.colors.status.error}`
        : `1px solid ${tokens.colors.surface.glassBorder}`,
      boxShadow: focused ? tokens.shadows.glowPurple : error ? tokens.shadows.glowPurple.replace('139, 92, 246', '239, 68, 68') : 'none',
      transition: `all ${tokens.transitions.duration.fast} ${tokens.transitions.easing.default}`,
      paddingLeft: icon ? '44px' : sizeStyles[size].padding.split(' ')[1],
      ...style,
    };

    const labelStyles: React.CSSProperties = {
      color: tokens.colors.text.secondary,
      fontSize: tokens.typography.fontSize.sm,
      fontWeight: tokens.typography.fontWeight.medium,
    };

    const errorStyles: React.CSSProperties = {
      color: tokens.colors.status.error,
      fontSize: tokens.typography.fontSize.sm,
    };

    const iconStyles: React.CSSProperties = {
      position: 'absolute',
      left: '16px',
      color: tokens.colors.text.muted,
      pointerEvents: 'none',
    };

    return (
      <div style={containerStyles}>
        {label && <label style={labelStyles}>{label}</label>}
        <div style={inputWrapperStyles}>
          {icon && <span style={iconStyles}>{icon}</span>}
          <input
            ref={ref}
            style={inputStyles}
            onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
            {...props}
          />
        </div>
        {error && <span style={errorStyles}>{error}</span>}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';

// =============================================================================
// GlassTextarea
// =============================================================================

interface GlassTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string;
  error?: string;
  size?: GlassSize;
}

export const GlassTextarea = forwardRef<HTMLTextAreaElement, GlassTextareaProps>(
  ({ label, error, size = 'md', style, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    const sizeStyles = {
      sm: { padding: '8px 12px', fontSize: tokens.typography.fontSize.sm },
      md: { padding: '12px 16px', fontSize: tokens.typography.fontSize.base },
      lg: { padding: '16px 20px', fontSize: tokens.typography.fontSize.lg },
      xl: { padding: '20px 24px', fontSize: tokens.typography.fontSize.xl },
    };

    const textareaStyles: React.CSSProperties = {
      ...getGlassStyles('light'),
      ...sizeStyles[size],
      width: '100%',
      minHeight: '120px',
      borderRadius: tokens.radii.input,
      color: tokens.colors.text.primary,
      fontFamily: tokens.typography.fontFamily.sans,
      outline: 'none',
      resize: 'vertical',
      border: focused
        ? `1px solid ${tokens.colors.accent.primary}`
        : error
        ? `1px solid ${tokens.colors.status.error}`
        : `1px solid ${tokens.colors.surface.glassBorder}`,
      boxShadow: focused ? tokens.shadows.glowPurple : 'none',
      transition: `all ${tokens.transitions.duration.fast} ${tokens.transitions.easing.default}`,
      ...style,
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2], width: '100%' }}>
        {label && (
          <label style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm, fontWeight: tokens.typography.fontWeight.medium }}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          style={textareaStyles}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          {...props}
        />
        {error && <span style={{ color: tokens.colors.status.error, fontSize: tokens.typography.fontSize.sm }}>{error}</span>}
      </div>
    );
  }
);

GlassTextarea.displayName = 'GlassTextarea';

// =============================================================================
// GlassSection
// =============================================================================

interface GlassSectionProps extends HTMLMotionProps<'section'> {
  variant?: GlassVariant;
  fullWidth?: boolean;
  centered?: boolean;
  padding?: GlassSize;
  children: React.ReactNode;
}

export const GlassSection = forwardRef<HTMLElement, GlassSectionProps>(
  ({ variant = 'light', fullWidth = false, centered = true, padding = 'lg', children, style, ...props }, ref) => {
    const paddingValues: Record<GlassSize, string> = {
      sm: `${tokens.spacing[8]} ${tokens.spacing[4]}`,
      md: `${tokens.spacing[12]} ${tokens.spacing[6]}`,
      lg: `${tokens.spacing[16]} ${tokens.spacing[8]}`,
      xl: `${tokens.spacing[24]} ${tokens.spacing[12]}`,
    };

    const sectionStyles: React.CSSProperties = {
      ...getGlassStyles(variant),
      padding: paddingValues[padding as GlassSize],
      borderRadius: fullWidth ? 0 : tokens.radii['2xl'],
      maxWidth: fullWidth ? '100%' : '1280px',
      margin: centered ? '0 auto' : undefined,
      position: 'relative',
      overflow: 'hidden',
      ...style,
    };

    return (
      <motion.section
        ref={ref}
        style={sectionStyles}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: tokens.transitions.easing.out }}
        {...props}
      >
        {children}
      </motion.section>
    );
  }
);

GlassSection.displayName = 'GlassSection';

// =============================================================================
// GlassDivider
// =============================================================================

interface GlassDividerProps {
  orientation?: 'horizontal' | 'vertical';
  glow?: boolean;
}

export const GlassDivider: React.FC<GlassDividerProps> = ({ orientation = 'horizontal', glow = false }) => {
  const styles: React.CSSProperties = orientation === 'horizontal'
    ? {
        width: '100%',
        height: '1px',
        background: glow
          ? `linear-gradient(90deg, transparent, ${tokens.colors.accent.primary}, transparent)`
          : tokens.colors.border.subtle,
        boxShadow: glow ? tokens.shadows.glowPurple : 'none',
      }
    : {
        width: '1px',
        height: '100%',
        background: glow
          ? `linear-gradient(180deg, transparent, ${tokens.colors.accent.primary}, transparent)`
          : tokens.colors.border.subtle,
        boxShadow: glow ? tokens.shadows.glowPurple : 'none',
      };

  return <div style={styles} />;
};

// =============================================================================
// GlassBadge
// =============================================================================

interface GlassBadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const GlassBadge: React.FC<GlassBadgeProps> = ({ variant = 'default', size = 'md', children }) => {
  const sizeStyles = {
    sm: { padding: '2px 8px', fontSize: tokens.typography.fontSize.xs },
    md: { padding: '4px 12px', fontSize: tokens.typography.fontSize.sm },
    lg: { padding: '6px 16px', fontSize: tokens.typography.fontSize.base },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      background: tokens.colors.surface.glass,
      color: tokens.colors.text.secondary,
      border: `1px solid ${tokens.colors.border.subtle}`,
    },
    success: {
      background: 'rgba(34, 197, 94, 0.1)',
      color: tokens.colors.status.success,
      border: `1px solid rgba(34, 197, 94, 0.3)`,
    },
    warning: {
      background: 'rgba(245, 158, 11, 0.1)',
      color: tokens.colors.status.warning,
      border: `1px solid rgba(245, 158, 11, 0.3)`,
    },
    error: {
      background: 'rgba(239, 68, 68, 0.1)',
      color: tokens.colors.status.error,
      border: `1px solid rgba(239, 68, 68, 0.3)`,
    },
    info: {
      background: 'rgba(59, 130, 246, 0.1)',
      color: tokens.colors.status.info,
      border: `1px solid rgba(59, 130, 246, 0.3)`,
    },
    accent: {
      background: 'rgba(139, 92, 246, 0.1)',
      color: tokens.colors.accent.primary,
      border: `1px solid rgba(139, 92, 246, 0.3)`,
    },
  };

  const styles: React.CSSProperties = {
    ...sizeStyles[size],
    ...variantStyles[variant],
    borderRadius: tokens.radii.full,
    fontWeight: tokens.typography.fontWeight.medium,
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacing[1],
  };

  return <span style={styles}>{children}</span>;
};

// =============================================================================
// TestimonialCard
// =============================================================================

interface TestimonialCardProps {
  quote: string;
  author: string;
  role?: string;
  avatar?: string;
  rating?: number;
}

export const TestimonialCard: React.FC<TestimonialCardProps> = ({ quote, author, role, avatar, rating }) => {
  return (
    <GlassCard variant="medium" padding="lg" glow>
      {rating && (
        <div style={{ display: 'flex', gap: tokens.spacing[1], marginBottom: tokens.spacing[4] }}>
          {[...Array(5)].map((_, i) => (
            <svg
              key={i}
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill={i < rating ? tokens.colors.accent.primary : tokens.colors.border.subtle}
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      )}
      <blockquote style={{ margin: 0, marginBottom: tokens.spacing[6] }}>
        <p style={{
          color: tokens.colors.text.primary,
          fontSize: tokens.typography.fontSize.lg,
          lineHeight: tokens.typography.lineHeight.relaxed,
          fontStyle: 'italic',
        }}>
          &ldquo;{quote}&rdquo;
        </p>
      </blockquote>
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[4] }}>
        {avatar && (
          <img
            src={avatar}
            alt={author}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: tokens.radii.full,
              objectFit: 'cover',
              border: `2px solid ${tokens.colors.border.accent}`,
            }}
          />
        )}
        <div>
          <div style={{ color: tokens.colors.text.primary, fontWeight: tokens.typography.fontWeight.semibold }}>
            {author}
          </div>
          {role && (
            <div style={{ color: tokens.colors.text.muted, fontSize: tokens.typography.fontSize.sm }}>
              {role}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

// =============================================================================
// FAQAccordion
// =============================================================================

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export const FAQAccordion: React.FC<FAQAccordionProps> = ({ items }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
      {items.map((item, index) => (
        <GlassCard
          key={index}
          variant="light"
          padding="md"
          hover={false}
          style={{ cursor: 'pointer' }}
          onClick={() => setOpenIndex(openIndex === index ? null : index)}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: tokens.spacing[4],
          }}>
            <h3 style={{
              margin: 0,
              color: tokens.colors.text.primary,
              fontSize: tokens.typography.fontSize.lg,
              fontWeight: tokens.typography.fontWeight.medium,
            }}>
              {item.question}
            </h3>
            <motion.span
              animate={{ rotate: openIndex === index ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ color: tokens.colors.accent.primary, flexShrink: 0 }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </motion.span>
          </div>
          <motion.div
            initial={false}
            animate={{
              height: openIndex === index ? 'auto' : 0,
              opacity: openIndex === index ? 1 : 0,
              marginTop: openIndex === index ? tokens.spacing[4] : 0,
            }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{
              margin: 0,
              color: tokens.colors.text.secondary,
              lineHeight: tokens.typography.lineHeight.relaxed,
            }}>
              {item.answer}
            </p>
          </motion.div>
        </GlassCard>
      ))}
    </div>
  );
};

// =============================================================================
// StickyCTA
// =============================================================================

interface StickyCTAProps {
  text: string;
  buttonText: string;
  onClick: () => void;
  show?: boolean;
}

export const StickyCTA: React.FC<StickyCTAProps> = ({ text, buttonText, onClick, show = true }) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: show ? 0 : 100, opacity: show ? 1 : 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: tokens.zIndex.sticky,
        ...getGlassStyles('heavy'),
        borderRadius: 0,
        borderTop: `1px solid ${tokens.colors.border.subtle}`,
        padding: `${tokens.spacing[4]} ${tokens.spacing[6]}`,
      }}
    >
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: tokens.spacing[4],
        flexWrap: 'wrap',
      }}>
        <p style={{ margin: 0, color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.base }}>
          {text}
        </p>
        <GlassButton variant="primary" size="md" onClick={onClick}>
          {buttonText}
        </GlassButton>
      </div>
    </motion.div>
  );
};

// =============================================================================
// GlassSelect
// =============================================================================

interface GlassSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  size?: GlassSize;
  options: { value: string; label: string }[];
}

export const GlassSelect = forwardRef<HTMLSelectElement, GlassSelectProps>(
  ({ label, error, size = 'md', options, style, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    const sizeStyles = {
      sm: { padding: '8px 12px', fontSize: tokens.typography.fontSize.sm },
      md: { padding: '12px 16px', fontSize: tokens.typography.fontSize.base },
      lg: { padding: '16px 20px', fontSize: tokens.typography.fontSize.lg },
      xl: { padding: '20px 24px', fontSize: tokens.typography.fontSize.xl },
    };

    const selectStyles: React.CSSProperties = {
      ...getGlassStyles('light'),
      ...sizeStyles[size],
      width: '100%',
      borderRadius: tokens.radii.input,
      color: tokens.colors.text.primary,
      fontFamily: tokens.typography.fontFamily.sans,
      outline: 'none',
      appearance: 'none',
      cursor: 'pointer',
      paddingRight: '40px',
      border: focused
        ? `1px solid ${tokens.colors.accent.primary}`
        : error
        ? `1px solid ${tokens.colors.status.error}`
        : `1px solid ${tokens.colors.surface.glassBorder}`,
      boxShadow: focused ? tokens.shadows.glowPurple : 'none',
      transition: `all ${tokens.transitions.duration.fast} ${tokens.transitions.easing.default}`,
      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a78bfa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
      backgroundPosition: 'right 12px center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '20px',
      ...style,
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2], width: '100%' }}>
        {label && (
          <label style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm, fontWeight: tokens.typography.fontWeight.medium }}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          style={selectStyles}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} style={{ background: tokens.colors.background.tertiary }}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <span style={{ color: tokens.colors.status.error, fontSize: tokens.typography.fontSize.sm }}>{error}</span>}
      </div>
    );
  }
);

GlassSelect.displayName = 'GlassSelect';

// =============================================================================
// Export Types (already exported at definition, this is for interface exports)
// =============================================================================

export type {
  GlassCardProps,
  GlassButtonProps,
  GlassInputProps,
  GlassTextareaProps,
  GlassSectionProps,
  TestimonialCardProps,
  FAQItem,
  FAQAccordionProps,
  StickyCTAProps,
  GlassSelectProps,
};
