/**
 * Form validation utilities with integrated sanitization
 */

import {
  sanitizeName,
  sanitizeEmail,
  sanitizePhone,
  sanitizeInput,
  containsSuspiciousContent,
} from './sanitize';

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: string;
}

/**
 * Validate and sanitize required field
 */
export function validateRequired(value: string, fieldName: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }
  return { isValid: true, sanitizedValue: trimmed };
}

/**
 * Validate and sanitize email format
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: 'Email is required',
    };
  }

  // Sanitize the email
  const sanitized = sanitizeEmail(trimmed);

  if (!sanitized) {
    return {
      isValid: false,
      error: 'Please enter a valid email address',
    };
  }

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(sanitized)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address',
    };
  }

  return { isValid: true, sanitizedValue: sanitized };
}

/**
 * Validate and sanitize phone number (optional field)
 * Accepts various formats: +1-234-567-8900, (234) 567-8900, 2345678900, etc.
 */
export function validatePhone(phone: string): ValidationResult {
  const trimmed = phone.trim();

  // Phone is optional, so empty is valid
  if (!trimmed) {
    return { isValid: true, sanitizedValue: '' };
  }

  // Sanitize the phone number
  const sanitized = sanitizePhone(trimmed);

  // Remove common formatting characters for validation
  const digitsOnly = sanitized.replace(/[\s\-\(\)\+\.]/g, '');

  // Check if remaining characters are all digits
  if (!/^\d+$/.test(digitsOnly)) {
    return {
      isValid: false,
      error: 'Please enter a valid phone number',
    };
  }

  // Check reasonable length (7-15 digits)
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return {
      isValid: false,
      error: 'Phone number should be between 7 and 15 digits',
    };
  }

  return { isValid: true, sanitizedValue: sanitized };
}

/**
 * Validate and sanitize message field (optional, with max length)
 */
export function validateMessage(message: string, maxLength: number = 1000): ValidationResult {
  const trimmed = message.trim();

  // Message is optional, so empty is valid
  if (!trimmed) {
    return { isValid: true, sanitizedValue: '' };
  }

  // Check for suspicious content (potential XSS)
  if (containsSuspiciousContent(trimmed)) {
    // Log for monitoring but don't reject - just sanitize heavily
    console.warn('[Security] Suspicious content detected in message field');
  }

  // Sanitize the message
  const sanitized = sanitizeInput(trimmed, {
    maxLength,
    allowNewlines: true,
    stripHtml: true, // Strip HTML tags from messages
  });

  if (sanitized.length > maxLength) {
    return {
      isValid: false,
      error: `Message must be less than ${maxLength} characters`,
    };
  }

  return { isValid: true, sanitizedValue: sanitized };
}

/**
 * Validate and sanitize name field
 */
export function validateName(name: string): ValidationResult {
  const trimmed = name.trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: 'Name is required',
    };
  }

  // Check for suspicious content
  if (containsSuspiciousContent(trimmed)) {
    console.warn('[Security] Suspicious content detected in name field');
  }

  // Sanitize the name
  const sanitized = sanitizeName(trimmed);

  // Check minimum length
  if (sanitized.length < 2) {
    return {
      isValid: false,
      error: 'Name must be at least 2 characters',
    };
  }

  // Check maximum length
  if (sanitized.length > 100) {
    return {
      isValid: false,
      error: 'Name must be less than 100 characters',
    };
  }

  return { isValid: true, sanitizedValue: sanitized };
}

/**
 * Lead form data interface
 */
export interface LeadFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

/**
 * Sanitized lead form data (after validation)
 */
export interface SanitizedLeadFormData {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}

/**
 * Form validation errors interface
 */
export interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
}

/**
 * Validation result with sanitized data
 */
export interface LeadFormValidationResult {
  isValid: boolean;
  errors: FormErrors;
  sanitizedData?: SanitizedLeadFormData;
}

/**
 * Validate entire lead form with sanitization
 */
export function validateLeadForm(data: LeadFormData): LeadFormValidationResult {
  const errors: FormErrors = {};
  const sanitizedData: SanitizedLeadFormData = {
    name: '',
    email: '',
  };

  // Validate and sanitize name (required)
  const nameResult = validateName(data.name);
  if (!nameResult.isValid) {
    errors.name = nameResult.error;
  } else {
    sanitizedData.name = nameResult.sanitizedValue || '';
  }

  // Validate and sanitize email (required)
  const emailResult = validateEmail(data.email);
  if (!emailResult.isValid) {
    errors.email = emailResult.error;
  } else {
    sanitizedData.email = emailResult.sanitizedValue || '';
  }

  // Validate and sanitize phone (optional)
  const phoneResult = validatePhone(data.phone);
  if (!phoneResult.isValid) {
    errors.phone = phoneResult.error;
  } else if (phoneResult.sanitizedValue) {
    sanitizedData.phone = phoneResult.sanitizedValue;
  }

  // Validate and sanitize message (optional)
  const messageResult = validateMessage(data.message);
  if (!messageResult.isValid) {
    errors.message = messageResult.error;
  } else if (messageResult.sanitizedValue) {
    sanitizedData.message = messageResult.sanitizedValue;
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    sanitizedData: isValid ? sanitizedData : undefined,
  };
}

/**
 * Quick validation check without full sanitization
 * Use for real-time validation feedback
 */
export function quickValidate(fieldName: keyof LeadFormData, value: string): string | undefined {
  switch (fieldName) {
    case 'name':
      if (!value.trim()) return 'Name is required';
      if (value.trim().length < 2) return 'Name must be at least 2 characters';
      if (value.trim().length > 100) return 'Name must be less than 100 characters';
      return undefined;

    case 'email':
      if (!value.trim()) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        return 'Please enter a valid email address';
      }
      return undefined;

    case 'phone':
      if (!value.trim()) return undefined; // Optional
      const digits = value.replace(/[\s\-\(\)\+\.]/g, '');
      if (!/^\d+$/.test(digits)) return 'Please enter a valid phone number';
      if (digits.length < 7 || digits.length > 15) {
        return 'Phone number should be between 7 and 15 digits';
      }
      return undefined;

    case 'message':
      if (value.length > 1000) return 'Message must be less than 1000 characters';
      return undefined;

    default:
      return undefined;
  }
}
