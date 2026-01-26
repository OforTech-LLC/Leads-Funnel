'use client';

/**
 * Lead Capture Form Component
 *
 * Customizable lead capture form for service landing pages.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassButton, GlassInput, GlassTextarea, GlassSelect, tokens } from '@/design-system';

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

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // Submit to API
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          serviceId,
          pageUrl: window.location.href,
          referrer: document.referrer,
        }),
      });

      if (!response.ok) throw new Error('Submission failed');

      setIsSuccess(true);
      onSuccess?.(formData);
    } catch (error) {
      setErrors({ submit: 'Something went wrong. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <GlassCard variant="accent" padding="xl" glow>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: tokens.radii.full,
                background: `${tokens.colors.status.success}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: `0 auto ${tokens.spacing[6]}`,
              }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke={tokens.colors.status.success}
                strokeWidth="3"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3
              style={{
                fontSize: tokens.typography.fontSize['2xl'],
                fontWeight: tokens.typography.fontWeight.bold,
                marginBottom: tokens.spacing[3],
                color: tokens.colors.text.primary,
              }}
            >
              Thank You!
            </h3>
            <p
              style={{
                fontSize: tokens.typography.fontSize.lg,
                color: tokens.colors.text.secondary,
                margin: 0,
              }}
            >
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
        <div style={{ textAlign: 'center', marginBottom: tokens.spacing[8] }}>
          <h2
            style={{
              fontSize: tokens.typography.fontSize['2xl'],
              fontWeight: tokens.typography.fontWeight.bold,
              marginBottom: tokens.spacing[2],
              color: tokens.colors.text.primary,
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              style={{
                fontSize: tokens.typography.fontSize.base,
                color: tokens.colors.text.secondary,
                margin: 0,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
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
              />
            );
          })}

          {/* Submit error */}
          {errors.submit && (
            <p style={{ color: tokens.colors.status.error, fontSize: tokens.typography.fontSize.sm, margin: 0 }}>
              {errors.submit}
            </p>
          )}

          {/* Submit button */}
          <GlassButton type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
            {submitText}
          </GlassButton>

          {/* Guarantee */}
          {showGuarantee && (
            <p
              style={{
                fontSize: tokens.typography.fontSize.sm,
                color: tokens.colors.text.muted,
                textAlign: 'center',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: tokens.spacing[2],
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

export default LeadCaptureForm;
