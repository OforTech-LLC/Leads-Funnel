'use client';

/**
 * Lead Capture Form Component
 *
 * Customizable lead capture form for service landing pages.
 * Performance optimized with:
 * - Debounced validation
 * - Memoized handlers
 * - Extracted styles
 * - Input sanitization for XSS prevention
 *
 * Accessibility:
 * - Decorative SVGs (lock icon, success checkmark) have aria-hidden="true"
 * - Submit error message has role="alert" for screen reader announcement
 * - Guarantee text uses text.tertiary (not text.muted) for WCAG AA contrast
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  GlassCard,
  GlassButton,
  GlassInput,
  GlassTextarea,
  GlassSelect,
  tokens,
} from '@/design-system';
import {
  sanitizeInput,
  sanitizeEmail,
  sanitizePhone,
  sanitizeName,
  containsSuspiciousContent,
} from '@/lib/sanitize';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

interface LeadCaptureFormProps {
  title: string;
  subtitle?: string;
  fields: FormField[];
  submitText: string;
  serviceId: string;
  onSuccess?: (data: Record<string, string>) => void;
  accentColor?: string;
  showGuarantee?: boolean;
  guaranteeText?: string;
}

// Debounce utility
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Sanitize form value based on field type
 */
function sanitizeFieldValue(value: string, fieldType: string): string {
  switch (fieldType) {
    case 'email':
      return sanitizeEmail(value);
    case 'tel':
      return sanitizePhone(value);
    case 'text':
      return sanitizeName(value);
    case 'textarea':
      return sanitizeInput(value, { maxLength: 2000, allowNewlines: true, stripHtml: true });
    case 'select':
      // For select, just escape any HTML that might have been injected
      return sanitizeInput(value, { maxLength: 200, stripHtml: true });
    default:
      return sanitizeInput(value, { maxLength: 1000 });
  }
}

export const LeadCaptureForm: React.FC<LeadCaptureFormProps> = ({
  title,
  subtitle,
  fields,
  submitText,
  serviceId,
  onSuccess,
  accentColor = tokens.colors.accent.primary,
  showGuarantee = true,
  guaranteeText = 'Your information is secure and will never be shared.',
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Debounce form data for validation (300ms delay)
  const debouncedFormData = useDebounce(formData, 300);

  // Memoized change handler to prevent re-renders
  const handleChange = useCallback((name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error immediately for better UX
    setErrors((prev) => {
      if (prev[name]) {
        const { [name]: _, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  }, []);

  // Debounced validation effect
  useEffect(() => {
    // Only validate fields that have been touched
    const touchedFields = Object.keys(debouncedFormData);
    if (touchedFields.length === 0) return;

    // Validate in background without blocking UI
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      const value = debouncedFormData[field.name]?.trim() || '';

      // Skip validation for untouched fields
      if (!(field.name in debouncedFormData)) return;

      if (field.required && !value) {
        // Don't show required errors while typing
        return;
      }

      if (value) {
        // Check for suspicious content
        if (containsSuspiciousContent(value)) {
          console.warn(`[Security] Suspicious content in field: ${field.name}`);
        }

        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors[field.name] = 'Please enter a valid email';
        }
        if (field.type === 'tel' && value.length > 5 && !/^[\d\s\-\(\)\+]{10,20}$/.test(value)) {
          newErrors[field.name] = 'Please enter a valid phone number';
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
    }
  }, [debouncedFormData, fields]);

  // Memoized full validation for submit
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      const value = formData[field.name]?.trim() || '';

      if (field.required && !value) {
        newErrors[field.name] = `${field.label} is required`;
        return;
      }

      if (value) {
        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors[field.name] = 'Please enter a valid email';
        }
        if (field.type === 'tel' && !/^[\d\s\-\(\)\+]{10,20}$/.test(value)) {
          newErrors[field.name] = 'Please enter a valid phone number';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [fields, formData]);

  // Memoized submit handler with sanitization
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) return;

      setIsSubmitting(true);

      try {
        // Sanitize all form data before submission
        const sanitizedData: Record<string, string> = {};
        fields.forEach((field) => {
          const value = formData[field.name] || '';
          sanitizedData[field.name] = sanitizeFieldValue(value, field.type);
        });

        // Submit to API with sanitized data
        const response = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...sanitizedData,
            serviceId,
            pageUrl: typeof window !== 'undefined' ? window.location.href : '',
            referrer: typeof document !== 'undefined' ? document.referrer : '',
          }),
        });

        if (!response.ok) throw new Error('Submission failed');

        setIsSuccess(true);
        onSuccess?.(sanitizedData);
      } catch (error) {
        setErrors({ submit: 'Something went wrong. Please try again.' });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, serviceId, onSuccess, validate, fields]
  );

  // Memoized animation variants
  const containerVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: 30 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: 'easeOut' },
      },
    }),
    []
  );

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <GlassCard variant="accent" padding="xl" glow>
          <div style={successStyles.container}>
            <div style={successStyles.iconWrapper}>
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke={tokens.colors.status.success}
                strokeWidth="3"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 style={successStyles.title}>Thank You!</h3>
            <p style={successStyles.message}>
              We&apos;ve received your request and will contact you shortly.
            </p>
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <GlassCard variant="medium" padding="xl" glow>
        {/* Header */}
        <div style={formStyles.header}>
          <h2 style={formStyles.title}>{title}</h2>
          {subtitle && <p style={formStyles.subtitle}>{subtitle}</p>}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={formStyles.form} aria-label={title}>
          {fields.map((field) => {
            if (field.type === 'textarea') {
              return (
                <GlassTextarea
                  key={field.name}
                  label={field.label}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  error={errors[field.name]}
                  required={field.required}
                  maxLength={2000}
                  name={field.name}
                  id={field.name}
                />
              );
            }

            if (field.type === 'select' && field.options) {
              return (
                <GlassSelect
                  key={field.name}
                  label={field.label}
                  options={field.options}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  error={errors[field.name]}
                  required={field.required}
                  name={field.name}
                  id={field.name}
                />
              );
            }

            return (
              <GlassInput
                key={field.name}
                type={field.type}
                label={field.label}
                placeholder={field.placeholder}
                value={formData[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                error={errors[field.name]}
                required={field.required}
                maxLength={field.type === 'email' ? 254 : field.type === 'tel' ? 20 : 200}
                autoComplete={
                  field.type === 'email'
                    ? 'email'
                    : field.type === 'tel'
                      ? 'tel'
                      : field.name === 'name'
                        ? 'name'
                        : undefined
                }
                name={field.name}
                id={field.name}
              />
            );
          })}

          {/* Submit error */}
          {errors.submit && (
            <p role="alert" aria-live="assertive" style={formStyles.error}>
              {errors.submit}
            </p>
          )}

          {/* Submit button */}
          <GlassButton type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
            {submitText}
          </GlassButton>

          {/* Guarantee */}
          {showGuarantee && (
            <p style={formStyles.guarantee}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              {guaranteeText}
            </p>
          )}
        </form>
      </GlassCard>
    </motion.div>
  );
};

// ============================================================================
// Extracted Styles (prevents new object creation on each render)
// ============================================================================

const formStyles = {
  header: {
    textAlign: 'center' as const,
    marginBottom: tokens.spacing[8],
  },
  title: {
    fontSize: tokens.typography.fontSize['2xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    marginBottom: tokens.spacing[2],
    color: tokens.colors.text.primary,
  },
  subtitle: {
    fontSize: tokens.typography.fontSize.base,
    color: tokens.colors.text.secondary,
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing[4],
  },
  error: {
    color: tokens.colors.status.error,
    fontSize: tokens.typography.fontSize.sm,
    margin: 0,
  },
  // Use text.tertiary instead of text.muted for WCAG AA contrast
  guarantee: {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.text.tertiary,
    textAlign: 'center' as const,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing[2],
  },
};

const successStyles = {
  container: {
    textAlign: 'center' as const,
  },
  iconWrapper: {
    width: '80px',
    height: '80px',
    borderRadius: tokens.radii.full,
    background: `${tokens.colors.status.success}20`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: `0 auto ${tokens.spacing[6]}`,
  },
  title: {
    fontSize: tokens.typography.fontSize['2xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    marginBottom: tokens.spacing[3],
    color: tokens.colors.text.primary,
  },
  message: {
    fontSize: tokens.typography.fontSize.lg,
    color: tokens.colors.text.secondary,
    margin: 0,
  },
};

export default LeadCaptureForm;
