'use client';

/**
 * Lead Capture Form Component
 * Handles lead submission with validation and Redux state management
 */

import { useState, useCallback, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  submitLead,
  resetLead,
  selectLeadStatus,
  selectIsSubmitting,
  selectIsSuccess,
  selectIsError,
  selectLeadError,
} from '@/store/leadSlice';
import { validateLeadForm, type LeadFormData, type FormErrors } from '@/lib/validators';
import { getBestUTMParams, getCurrentPageUrl, getReferrer } from '@/lib/utm';

/**
 * Lead Form Component
 */
export function LeadForm() {
  const t = useTranslations('form');
  const messagesT = useTranslations('messages');
  const dispatch = useAppDispatch();

  // Redux state
  const status = useAppSelector(selectLeadStatus);
  const isSubmitting = useAppSelector(selectIsSubmitting);
  const isSuccess = useAppSelector(selectIsSuccess);
  const isError = useAppSelector(selectIsError);
  const serverError = useAppSelector(selectLeadError);

  // Form state
  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  /**
   * Handle input change
   */
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));

      // Clear error when user starts typing
      if (errors[name as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    },
    [errors]
  );

  /**
   * Handle input blur for validation feedback
   */
  const handleBlur = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Validate form
      const validation = validateLeadForm(formData);

      if (!validation.isValid) {
        setErrors(validation.errors);
        // Mark all fields as touched
        setTouched({ name: true, email: true, phone: true, message: true });
        return;
      }

      // Get tracking data
      const utm = getBestUTMParams();
      const pageUrl = getCurrentPageUrl();
      const referrer = getReferrer();

      // Submit lead
      dispatch(
        submitLead({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          message: formData.message || undefined,
          pageUrl,
          referrer,
          utm,
        })
      );
    },
    [formData, dispatch]
  );

  /**
   * Reset form after successful submission
   */
  const handleReset = useCallback(() => {
    setFormData({ name: '', email: '', phone: '', message: '' });
    setErrors({});
    setTouched({});
    dispatch(resetLead());
  }, [dispatch]);

  // Auto-reset form after success (optional - remove if you want manual reset)
  useEffect(() => {
    if (isSuccess) {
      // Reset form data but keep success message visible
      setFormData({ name: '', email: '', phone: '', message: '' });
      setErrors({});
      setTouched({});
    }
  }, [isSuccess]);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{t('title')}</h2>
      <p style={styles.subtitle}>{t('subtitle')}</p>

      {/* Success Message */}
      {isSuccess && (
        <div style={styles.successMessage} role="alert">
          {messagesT('success')}
          <button onClick={handleReset} style={styles.resetButton}>
            Submit another
          </button>
        </div>
      )}

      {/* Error Message */}
      {isError && serverError && (
        <div style={styles.errorMessage} role="alert">
          {serverError.includes('Network') ? messagesT('networkError') : messagesT('error')}
        </div>
      )}

      {/* Form */}
      {!isSuccess && (
        <form onSubmit={handleSubmit} noValidate style={styles.form}>
          {/* Name Field */}
          <div style={styles.field}>
            <label htmlFor="name" style={styles.label}>
              {t('name.label')} *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={t('name.placeholder')}
              required
              disabled={isSubmitting}
              aria-invalid={touched.name && !!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
              style={{
                ...styles.input,
                ...(touched.name && errors.name ? styles.inputError : {}),
              }}
            />
            {touched.name && errors.name && (
              <span id="name-error" style={styles.fieldError}>
                {t('name.required')}
              </span>
            )}
          </div>

          {/* Email Field */}
          <div style={styles.field}>
            <label htmlFor="email" style={styles.label}>
              {t('email.label')} *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={t('email.placeholder')}
              required
              disabled={isSubmitting}
              aria-invalid={touched.email && !!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              style={{
                ...styles.input,
                ...(touched.email && errors.email ? styles.inputError : {}),
              }}
            />
            {touched.email && errors.email && (
              <span id="email-error" style={styles.fieldError}>
                {errors.email.includes('valid') ? t('email.invalid') : t('email.required')}
              </span>
            )}
          </div>

          {/* Phone Field (Optional) */}
          <div style={styles.field}>
            <label htmlFor="phone" style={styles.label}>
              {t('phone.label')}
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={t('phone.placeholder')}
              disabled={isSubmitting}
              aria-invalid={touched.phone && !!errors.phone}
              aria-describedby={errors.phone ? 'phone-error' : undefined}
              style={{
                ...styles.input,
                ...(touched.phone && errors.phone ? styles.inputError : {}),
              }}
            />
            {touched.phone && errors.phone && (
              <span id="phone-error" style={styles.fieldError}>
                {errors.phone}
              </span>
            )}
          </div>

          {/* Message Field (Optional) */}
          <div style={styles.field}>
            <label htmlFor="message" style={styles.label}>
              {t('message.label')}
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={t('message.placeholder')}
              disabled={isSubmitting}
              rows={4}
              aria-invalid={touched.message && !!errors.message}
              aria-describedby={errors.message ? 'message-error' : undefined}
              style={{
                ...styles.input,
                ...styles.textarea,
                ...(touched.message && errors.message ? styles.inputError : {}),
              }}
            />
            {touched.message && errors.message && (
              <span id="message-error" style={styles.fieldError}>
                {errors.message}
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...styles.submitButton,
              ...(isSubmitting ? styles.submitButtonDisabled : {}),
            }}
          >
            {isSubmitting ? t('submitting') : t('submit')}
          </button>
        </form>
      )}
    </div>
  );
}

/**
 * Minimal inline styles
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '24px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#111',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  input: {
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  textarea: {
    resize: 'vertical',
    minHeight: '100px',
    fontFamily: 'inherit',
  },
  fieldError: {
    fontSize: '12px',
    color: '#dc2626',
  },
  submitButton: {
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#0070f3',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    marginTop: '8px',
  },
  submitButtonDisabled: {
    backgroundColor: '#93c5fd',
    cursor: 'not-allowed',
  },
  successMessage: {
    padding: '16px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '4px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  errorMessage: {
    padding: '16px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '4px',
    marginBottom: '16px',
  },
  resetButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#166534',
    backgroundColor: 'transparent',
    border: '1px solid #166534',
    borderRadius: '4px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
};

export default LeadForm;
