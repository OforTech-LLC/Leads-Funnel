'use client';

/**
 * Multi-Step Lead Capture Form
 * A 3-step form variant for A/B testing against the single-step LeadForm.
 *
 * Step 1: Service details (sub-category, urgency, ZIP code)
 * Step 2: Contact info (name, email, phone, best time to call)
 * Step 3: Additional details (message, referral source, consent)
 *
 * Features:
 * - Progress bar showing current step
 * - Back button on steps 2-3
 * - Per-step validation before proceeding
 * - Save/restore progress via sessionStorage
 * - Animated success screen after submission
 * - Includes A/B experiment variant tracking in payload
 */

import { useState, useCallback, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  submitLead,
  resetLead,
  selectIsSubmitting,
  selectIsSuccess,
  selectIsError,
  selectLeadError,
} from '@/store/leadSlice';
import { validateName, validateEmail, validatePhone, validateMessage } from '@/lib/validators';
import { getBestUTMParams, getCurrentPageUrl, getReferrer } from '@/lib/utm';
import { getAssignedExperiments } from '@/lib/experiments';
import { SuccessAnimation } from '@/components/animations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MultiStepFormProps {
  funnelId?: string;
  primaryColor?: string;
  /** Sub-category options for step 1 (from funnel config) */
  subCategories?: { value: string; label: string }[];
}

interface FormData {
  // Step 1
  subCategory: string;
  urgency: string;
  zipCode: string;
  // Step 2
  name: string;
  email: string;
  phone: string;
  bestTime: string;
  // Step 3
  message: string;
  referralSource: string;
  consent: boolean;
}

interface StepErrors {
  [key: string]: string | undefined;
}

const STORAGE_KEY = 'multistep_form_progress';
const TOTAL_STEPS = 3;

const DEFAULT_SUB_CATEGORIES = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'repair', label: 'Repair / Fix' },
  { value: 'installation', label: 'New Installation' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'other', label: 'Other' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MultiStepForm({
  funnelId,
  primaryColor = '#0070f3',
  subCategories,
}: MultiStepFormProps) {
  const t = useTranslations('multiStepForm');
  const messagesT = useTranslations('messages');
  const dispatch = useAppDispatch();

  const isSubmitting = useAppSelector(selectIsSubmitting);
  const isSuccess = useAppSelector(selectIsSuccess);
  const isError = useAppSelector(selectIsError);
  const serverError = useAppSelector(selectLeadError);

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<StepErrors>({});
  const [formData, setFormData] = useState<FormData>({
    subCategory: '',
    urgency: '',
    zipCode: '',
    name: '',
    email: '',
    phone: '',
    bestTime: '',
    message: '',
    referralSource: '',
    consent: false,
  });

  const categories = subCategories ?? DEFAULT_SUB_CATEGORIES;

  // -----------------------------------------------------------------------
  // SessionStorage persistence
  // -----------------------------------------------------------------------

  // Restore progress on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { step: number; data: FormData };
        setFormData(parsed.data);
        setCurrentStep(parsed.step);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save progress on every change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step: currentStep, data: formData }));
    } catch {
      // sessionStorage unavailable
    }
  }, [formData, currentStep]);

  // Clear on success
  useEffect(() => {
    if (isSuccess) {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, [isSuccess]);

  // -----------------------------------------------------------------------
  // Field handlers
  // -----------------------------------------------------------------------

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
      // Clear field error on change
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    },
    [errors]
  );

  // -----------------------------------------------------------------------
  // Validation per step
  // -----------------------------------------------------------------------

  const validateStep = useCallback(
    (step: number): boolean => {
      const newErrors: StepErrors = {};

      if (step === 1) {
        if (!formData.subCategory) newErrors.subCategory = t('errors.subCategoryRequired');
        if (!formData.urgency) newErrors.urgency = t('errors.urgencyRequired');
        if (!formData.zipCode.trim()) {
          newErrors.zipCode = t('errors.zipCodeRequired');
        } else if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode.trim())) {
          newErrors.zipCode = t('errors.zipCodeInvalid');
        }
      }

      if (step === 2) {
        const nameResult = validateName(formData.name);
        if (!nameResult.isValid) newErrors.name = nameResult.error;

        const emailResult = validateEmail(formData.email);
        if (!emailResult.isValid) newErrors.email = emailResult.error;

        if (formData.phone) {
          const phoneResult = validatePhone(formData.phone);
          if (!phoneResult.isValid) newErrors.phone = phoneResult.error;
        }
      }

      if (step === 3) {
        if (formData.message) {
          const msgResult = validateMessage(formData.message);
          if (!msgResult.isValid) newErrors.message = msgResult.error;
        }
        if (!formData.consent) {
          newErrors.consent = t('errors.consentRequired');
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [formData, t]
  );

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  const goNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
    }
  }, [currentStep, validateStep]);

  const goBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
    setErrors({});
  }, []);

  // -----------------------------------------------------------------------
  // Submission
  // -----------------------------------------------------------------------

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!validateStep(3)) return;

      const utm = getBestUTMParams();
      const pageUrl = getCurrentPageUrl();
      const referrer = getReferrer();
      const experiments = getAssignedExperiments();

      dispatch(
        submitLead({
          funnelId,
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone?.trim() || undefined,
          message: formData.message?.trim() || undefined,
          pageUrl,
          referrer,
          utm,
          customFields: {
            subCategory: formData.subCategory,
            urgency: formData.urgency,
            zipCode: formData.zipCode.trim(),
            bestTime: formData.bestTime,
            referralSource: formData.referralSource,
            ...(Object.keys(experiments).length > 0
              ? { experiments: JSON.stringify(experiments) }
              : {}),
          },
        })
      );
    },
    [formData, dispatch, funnelId, validateStep]
  );

  const handleReset = useCallback(() => {
    setFormData({
      subCategory: '',
      urgency: '',
      zipCode: '',
      name: '',
      email: '',
      phone: '',
      bestTime: '',
      message: '',
      referralSource: '',
      consent: false,
    });
    setCurrentStep(1);
    setErrors({});
    dispatch(resetLead());
  }, [dispatch]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (isSuccess) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <SuccessAnimation color={primaryColor} />
          <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#111', marginTop: '16px' }}>
            {messagesT('success')}
          </h3>
          <button
            onClick={handleReset}
            style={{ ...resetButtonStyle, color: primaryColor, borderColor: primaryColor }}
          >
            {t('submitAnother')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Progress Bar */}
      <div style={progressContainerStyle}>
        <div style={progressLabelStyle}>
          {t('stepOf', { current: currentStep, total: TOTAL_STEPS })}
        </div>
        <div style={progressBarBgStyle}>
          <motion.div
            style={{ ...progressBarFillStyle, backgroundColor: primaryColor }}
            initial={false}
            animate={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Error Message */}
      {isError && serverError && (
        <div style={errorBannerStyle} role="alert">
          {serverError.includes('Network') ? messagesT('networkError') : messagesT('error')}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <AnimatePresence mode="wait">
          {/* Step 1: Service Details */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <h3 style={stepTitleStyle}>{t('step1.title')}</h3>

              {/* Sub-category */}
              <div style={fieldStyle}>
                <label htmlFor="subCategory" style={labelStyle}>
                  {t('step1.subCategory')} *
                </label>
                <select
                  id="subCategory"
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleChange}
                  style={{ ...inputStyle, ...(errors.subCategory ? inputErrorStyle : {}) }}
                  aria-invalid={!!errors.subCategory}
                >
                  <option value="">{t('step1.selectOption')}</option>
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                {errors.subCategory && <span style={fieldErrorStyle}>{errors.subCategory}</span>}
              </div>

              {/* Urgency */}
              <div style={fieldStyle}>
                <label style={labelStyle}>{t('step1.urgency')} *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {['asap', 'within_week', 'exploring'].map((val) => (
                    <label key={val} style={radioLabelStyle}>
                      <input
                        type="radio"
                        name="urgency"
                        value={val}
                        checked={formData.urgency === val}
                        onChange={handleChange}
                        style={{ marginRight: '8px' }}
                      />
                      {t(`step1.urgencyOptions.${val}` as 'step1.urgencyOptions.asap')}
                    </label>
                  ))}
                </div>
                {errors.urgency && <span style={fieldErrorStyle}>{errors.urgency}</span>}
              </div>

              {/* ZIP Code */}
              <div style={fieldStyle}>
                <label htmlFor="zipCode" style={labelStyle}>
                  {t('step1.zipCode')} *
                </label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  placeholder={t('step1.zipCodePlaceholder')}
                  maxLength={10}
                  inputMode="numeric"
                  style={{ ...inputStyle, ...(errors.zipCode ? inputErrorStyle : {}) }}
                  aria-invalid={!!errors.zipCode}
                />
                {errors.zipCode && <span style={fieldErrorStyle}>{errors.zipCode}</span>}
              </div>

              <button
                type="button"
                onClick={goNext}
                style={{ ...navButtonStyle, backgroundColor: primaryColor }}
              >
                {t('next')}
              </button>
            </motion.div>
          )}

          {/* Step 2: Contact Info */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <h3 style={stepTitleStyle}>{t('step2.title')}</h3>

              {/* Name */}
              <div style={fieldStyle}>
                <label htmlFor="msf-name" style={labelStyle}>
                  {t('step2.name')} *
                </label>
                <input
                  type="text"
                  id="msf-name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t('step2.namePlaceholder')}
                  maxLength={100}
                  autoComplete="name"
                  style={{ ...inputStyle, ...(errors.name ? inputErrorStyle : {}) }}
                  aria-invalid={!!errors.name}
                />
                {errors.name && <span style={fieldErrorStyle}>{errors.name}</span>}
              </div>

              {/* Email */}
              <div style={fieldStyle}>
                <label htmlFor="msf-email" style={labelStyle}>
                  {t('step2.email')} *
                </label>
                <input
                  type="email"
                  id="msf-email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('step2.emailPlaceholder')}
                  maxLength={254}
                  autoComplete="email"
                  style={{ ...inputStyle, ...(errors.email ? inputErrorStyle : {}) }}
                  aria-invalid={!!errors.email}
                />
                {errors.email && <span style={fieldErrorStyle}>{errors.email}</span>}
              </div>

              {/* Phone */}
              <div style={fieldStyle}>
                <label htmlFor="msf-phone" style={labelStyle}>
                  {t('step2.phone')}
                </label>
                <input
                  type="tel"
                  id="msf-phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder={t('step2.phonePlaceholder')}
                  maxLength={20}
                  autoComplete="tel"
                  style={{ ...inputStyle, ...(errors.phone ? inputErrorStyle : {}) }}
                  aria-invalid={!!errors.phone}
                />
                {errors.phone && <span style={fieldErrorStyle}>{errors.phone}</span>}
              </div>

              {/* Best time to call */}
              <div style={fieldStyle}>
                <label htmlFor="bestTime" style={labelStyle}>
                  {t('step2.bestTime')}
                </label>
                <select
                  id="bestTime"
                  name="bestTime"
                  value={formData.bestTime}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="">{t('step2.bestTimeDefault')}</option>
                  <option value="morning">{t('step2.bestTimeOptions.morning')}</option>
                  <option value="afternoon">{t('step2.bestTimeOptions.afternoon')}</option>
                  <option value="evening">{t('step2.bestTimeOptions.evening')}</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={goBack} style={backButtonStyle}>
                  {t('back')}
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  style={{ ...navButtonStyle, backgroundColor: primaryColor, flex: 1 }}
                >
                  {t('next')}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Additional Details */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <h3 style={stepTitleStyle}>{t('step3.title')}</h3>

              {/* Message */}
              <div style={fieldStyle}>
                <label htmlFor="msf-message" style={labelStyle}>
                  {t('step3.message')}
                </label>
                <textarea
                  id="msf-message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder={t('step3.messagePlaceholder')}
                  rows={4}
                  maxLength={1000}
                  style={{
                    ...inputStyle,
                    resize: 'vertical' as const,
                    minHeight: '100px',
                    fontFamily: 'inherit',
                    ...(errors.message ? inputErrorStyle : {}),
                  }}
                  aria-invalid={!!errors.message}
                />
                {errors.message && <span style={fieldErrorStyle}>{errors.message}</span>}
              </div>

              {/* Referral source */}
              <div style={fieldStyle}>
                <label htmlFor="referralSource" style={labelStyle}>
                  {t('step3.referralSource')}
                </label>
                <select
                  id="referralSource"
                  name="referralSource"
                  value={formData.referralSource}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="">{t('step3.referralDefault')}</option>
                  <option value="search">{t('step3.referralOptions.search')}</option>
                  <option value="social">{t('step3.referralOptions.social')}</option>
                  <option value="friend">{t('step3.referralOptions.friend')}</option>
                  <option value="ad">{t('step3.referralOptions.ad')}</option>
                  <option value="other">{t('step3.referralOptions.other')}</option>
                </select>
              </div>

              {/* Consent */}
              <div style={fieldStyle}>
                <label style={{ ...radioLabelStyle, alignItems: 'flex-start' }}>
                  <input
                    type="checkbox"
                    name="consent"
                    checked={formData.consent}
                    onChange={handleChange}
                    style={{ marginRight: '8px', marginTop: '3px' }}
                  />
                  <span style={{ fontSize: '13px', color: '#555', lineHeight: 1.4 }}>
                    {t('step3.consentText')}
                  </span>
                </label>
                {errors.consent && <span style={fieldErrorStyle}>{errors.consent}</span>}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={goBack} style={backButtonStyle}>
                  {t('back')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    ...navButtonStyle,
                    backgroundColor: isSubmitting ? `${primaryColor}80` : primaryColor,
                    flex: 1,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmitting ? t('submitting') : t('submit')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const containerStyle: React.CSSProperties = {
  maxWidth: '500px',
  margin: '0 auto',
  padding: '24px',
  backgroundColor: '#fff',
  borderRadius: '8px',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
};

const progressContainerStyle: React.CSSProperties = {
  marginBottom: '24px',
};

const progressLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#888',
  marginBottom: '8px',
  textAlign: 'right',
};

const progressBarBgStyle: React.CSSProperties = {
  height: '6px',
  backgroundColor: '#e5e7eb',
  borderRadius: '3px',
  overflow: 'hidden',
};

const progressBarFillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: '3px',
  transition: 'width 0.3s ease',
};

const stepTitleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: '#111',
  marginBottom: '20px',
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  marginBottom: '16px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: '#333',
};

const inputStyle: React.CSSProperties = {
  padding: '12px',
  fontSize: '16px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  outline: 'none',
  transition: 'border-color 0.2s ease',
  width: '100%',
  boxSizing: 'border-box',
};

const inputErrorStyle: React.CSSProperties = {
  borderColor: '#dc2626',
};

const fieldErrorStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#dc2626',
};

const radioLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  fontSize: '14px',
  color: '#333',
  cursor: 'pointer',
};

const navButtonStyle: React.CSSProperties = {
  padding: '14px 24px',
  fontSize: '16px',
  fontWeight: 600,
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  marginTop: '8px',
  width: '100%',
};

const backButtonStyle: React.CSSProperties = {
  padding: '14px 24px',
  fontSize: '16px',
  fontWeight: 500,
  color: '#555',
  backgroundColor: '#f3f4f6',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  marginTop: '8px',
  minWidth: '100px',
};

const resetButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: '14px',
  backgroundColor: 'transparent',
  border: '1px solid',
  borderRadius: '4px',
  cursor: 'pointer',
  marginTop: '16px',
};

const errorBannerStyle: React.CSSProperties = {
  padding: '16px',
  backgroundColor: '#fee2e2',
  color: '#dc2626',
  borderRadius: '4px',
  marginBottom: '16px',
};

export default MultiStepForm;
