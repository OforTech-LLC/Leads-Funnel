/**
 * Form validation utilities
 */

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate required field
 */
export function validateRequired(value: string, fieldName: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }
  return { isValid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: 'Email is required',
    };
  }

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address',
    };
  }

  return { isValid: true };
}

/**
 * Validate phone number (optional field)
 * Accepts various formats: +1-234-567-8900, (234) 567-8900, 2345678900, etc.
 */
export function validatePhone(phone: string): ValidationResult {
  const trimmed = phone.trim();

  // Phone is optional, so empty is valid
  if (!trimmed) {
    return { isValid: true };
  }

  // Remove common formatting characters for validation
  const digitsOnly = trimmed.replace(/[\s\-\(\)\+\.]/g, '');

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

  return { isValid: true };
}

/**
 * Validate message field (optional, with max length)
 */
export function validateMessage(message: string, maxLength: number = 1000): ValidationResult {
  const trimmed = message.trim();

  // Message is optional, so empty is valid
  if (!trimmed) {
    return { isValid: true };
  }

  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      error: `Message must be less than ${maxLength} characters`,
    };
  }

  return { isValid: true };
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
 * Form validation errors interface
 */
export interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
}

/**
 * Validate entire lead form
 */
export function validateLeadForm(data: LeadFormData): {
  isValid: boolean;
  errors: FormErrors;
} {
  const errors: FormErrors = {};

  // Validate name (required)
  const nameResult = validateRequired(data.name, 'Name');
  if (!nameResult.isValid) {
    errors.name = nameResult.error;
  }

  // Validate email (required)
  const emailResult = validateEmail(data.email);
  if (!emailResult.isValid) {
    errors.email = emailResult.error;
  }

  // Validate phone (optional)
  const phoneResult = validatePhone(data.phone);
  if (!phoneResult.isValid) {
    errors.phone = phoneResult.error;
  }

  // Validate message (optional)
  const messageResult = validateMessage(data.message);
  if (!messageResult.isValid) {
    errors.message = messageResult.error;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
