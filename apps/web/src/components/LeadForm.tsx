'use client';

/**
 * Lead Capture Form Component
 * Handles lead submission with validation, sanitization, and Redux state management.
 *
 * Form Abandonment Recovery (Task 4):
 * - Saves partial form data to sessionStorage on each field change
 * - Restores from sessionStorage on page load if data exists
 * - Shows a "We saved your progress" message when restoring
 * - Clears sessionStorage on successful submission
 * - Tracks field abandonment and field completion data
 *
 * Accessibility:
 * - role="alert" and aria-live="assertive" on error messages
 * - aria-describedby linking fields to their error messages
 * - aria-invalid on fields with errors
 */

import { useState, useCallback, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  submitLead,
  resetLead,
  selectIsSubmitting,
  selectIsSuccess,
  selectIsError,
  selectLeadError,
} from '@/store/leadSlice';
import { validateLeadForm, type LeadFormData, type FormErrors } from '@/lib/validators';
import { getBestUTMParams, getCurrentPageUrl, getReferrer } from '@/lib/utm';
import { getAssignedExperiments } from '@/lib/experiments';
import { trackFormSubmission } from '@/components/GoogleAnalytics';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FORM_STORAGE_KEY = 'lead_form_progress';

// ---------------------------------------------------------------------------
// GA4 Tracking Helpers
// ---------------------------------------------------------------------------

function trackFieldCompletion(fieldName: string, action: 'focus' | 'complete' | 'abandon'): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== 'function') return;

  gtag('event', 'form_field_interaction', {
    event_category: 'Lead Form',
    event_label: fieldName,
    field_action: action,
    non_interaction: action === 'focus',
  });
}

function trackFormAbandonment(lastField: string): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== 'function') return;

  gtag('event', 'form_abandonment', {
    event_category: 'Lead Form',
    event_label: lastField,
    non_interaction: true,
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface LeadFormProps {
  /** Optional funnel ID for service-specific submissions */
  funnelId?: string;
  /** Optional primary color for theming */
  primaryColor?: string;
}

/**
 * Lead Form Component
 */
export function LeadForm({ funnelId, primaryColor = '#0070f3' }: LeadFormProps) {
  const t = useTranslations('form');
  const messagesT = useTranslations('messages');
  const recoveryT = useTranslations('formRecovery');
  const dispatch = useAppDispatch();

  // Redux state
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
  const [showRestored, setShowRestored] = useState(false);

  // Track which field the user was last interacting with (for abandonment tracking)
  const lastActiveField = useRef<string>('');

  // -----------------------------------------------------------------------
  // Form abandonment recovery: restore from sessionStorage
  // -----------------------------------------------------------------------

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(FORM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as LeadFormData;
        const hasData = Object.values(parsed).some((v) => v.trim() !== '');
        if (hasData) {
          setFormData(parsed);
          setShowRestored(true);
          // Auto-hide restored message after 4 seconds
          const timer = setTimeout(() => setShowRestored(false), 4000);
          return () => clearTimeout(timer);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save form data to sessionStorage on every change
  useEffect(() => {
    try {
      sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
    } catch {
      // sessionStorage unavailable
    }
  }, [formData]);

  // Clear on success + track form submission in GA4
  useEffect(() => {
    if (isSuccess) {
      try {
        sessionStorage.removeItem(FORM_STORAGE_KEY);
      } catch {
        // ignore
      }
      // Track successful form submission in Google Analytics
      trackFormSubmission(funnelId || 'general');
      setFormData({ name: '', email: '', phone: '', message: '' });
      setErrors({});
      setTouched({});
    }
  }, [isSuccess, funnelId]);

  // Track abandonment on unmount / page leave
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (lastActiveField.current && !isSuccess) {
        trackFormAbandonment(lastActiveField.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also track if component unmounts without submission
      if (lastActiveField.current && !isSuccess) {
        trackFormAbandonment(lastActiveField.current);
      }
    };
  }, [isSuccess]);

  // -----------------------------------------------------------------------
  // Field handlers
  // -----------------------------------------------------------------------

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

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    lastActiveField.current = name;
    trackFieldCompletion(name, 'focus');
  }, []);

  const handleBlur = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    // Track field completion (if field has value) or abandonment (if empty and required)
    if (value.trim()) {
      trackFieldCompletion(name, 'complete');
    }
  }, []);

  /**
   * Handle form submission with sanitization
   */
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Validate and sanitize form data
      const validation = validateLeadForm(formData);

      if (!validation.isValid || !validation.sanitizedData) {
        setErrors(validation.errors);
        // Mark all fields as touched
        setTouched({ name: true, email: true, phone: true, message: true });
        return;
      }

      // Use sanitized data for submission
      const { sanitizedData } = validation;

      // Get tracking data
      const utm = getBestUTMParams();
      const pageUrl = getCurrentPageUrl();
      const referrer = getReferrer();
      const experiments = getAssignedExperiments();

      // Submit lead with sanitized data
      dispatch(
        submitLead({
          funnelId,
          name: sanitizedData.name,
          email: sanitizedData.email,
          phone: sanitizedData.phone || undefined,
          message: sanitizedData.message || undefined,
          pageUrl,
          referrer,
          utm,
          customFields:
            Object.keys(experiments).length > 0
              ? { experiments: JSON.stringify(experiments) }
              : undefined,
        })
      );
    },
    [formData, dispatch, funnelId]
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

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{t('title')}</h2>
      <p style={styles.subtitle}>{t('subtitle')}</p>

      {/* Progress restored notification */}
      {showRestored && (
        <div style={styles.restoredMessage} role="status">
          {recoveryT('progressRestored')}
        </div>
      )}

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
        <div style={styles.errorMessage} role="alert" aria-live="assertive">
          {serverError.includes('Network') ? messagesT('networkError') : messagesT('error')}
        </div>
      )}

      {/* Form */}
      {!isSuccess && (
        <form onSubmit={handleSubmit} noValidate style={styles.form} aria-label={t('title')}>
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
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={t('name.placeholder')}
              required
              disabled={isSubmitting}
              autoComplete="name"
              maxLength={100}
              aria-invalid={touched.name && !!errors.name}
              aria-describedby={touched.name && errors.name ? 'name-error' : undefined}
              style={{
                ...styles.input,
                ...(touched.name && errors.name ? styles.inputError : {}),
              }}
            />
            {touched.name && errors.name && (
              <span id="name-error" role="alert" aria-live="assertive" style={styles.fieldError}>
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
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={t('email.placeholder')}
              required
              disabled={isSubmitting}
              autoComplete="email"
              maxLength={254}
              aria-invalid={touched.email && !!errors.email}
              aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
              style={{
                ...styles.input,
                ...(touched.email && errors.email ? styles.inputError : {}),
              }}
            />
            {touched.email && errors.email && (
              <span id="email-error" role="alert" aria-live="assertive" style={styles.fieldError}>
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
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={t('phone.placeholder')}
              disabled={isSubmitting}
              autoComplete="tel"
              maxLength={20}
              aria-invalid={touched.phone && !!errors.phone}
              aria-describedby={touched.phone && errors.phone ? 'phone-error' : undefined}
              style={{
                ...styles.input,
                ...(touched.phone && errors.phone ? styles.inputError : {}),
              }}
            />
            {touched.phone && errors.phone && (
              <span id="phone-error" role="alert" aria-live="assertive" style={styles.fieldError}>
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
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={t('message.placeholder')}
              disabled={isSubmitting}
              rows={4}
              maxLength={1000}
              aria-invalid={touched.message && !!errors.message}
              aria-describedby={touched.message && errors.message ? 'message-error' : undefined}
              style={{
                ...styles.input,
                ...styles.textarea,
                ...(touched.message && errors.message ? styles.inputError : {}),
              }}
            />
            {touched.message && errors.message && (
              <span id="message-error" role="alert" aria-live="assertive" style={styles.fieldError}>
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
              backgroundColor: isSubmitting ? `${primaryColor}80` : primaryColor,
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
 * Styles
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
  restoredMessage: {
    padding: '12px 16px',
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: 500,
  },
};

export default LeadForm;
