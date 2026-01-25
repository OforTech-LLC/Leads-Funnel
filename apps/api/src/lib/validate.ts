/**
 * Validation utilities for lead submission
 */

import type { LeadRequestPayload, FieldErrors } from '@kanjona/shared';

// =============================================================================
// Validation Constants
// =============================================================================

const MAX_LENGTHS = {
  name: 120,
  email: 254,
  phone: 40,
  message: 2000,
  utm: 120,
} as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// =============================================================================
// Validation Result
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: FieldErrors;
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate the lead request payload
 */
export function validateLeadPayload(body: unknown): ValidationResult {
  const errors: FieldErrors = {};

  // Check if body is an object
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      errors: { _body: 'Request body must be a valid JSON object' },
    };
  }

  const payload = body as Partial<LeadRequestPayload>;

  // Validate required fields
  if (!payload.name || typeof payload.name !== 'string') {
    errors.name = 'Name is required';
  } else if (payload.name.trim().length === 0) {
    errors.name = 'Name cannot be empty';
  } else if (payload.name.length > MAX_LENGTHS.name) {
    errors.name = `Name must be ${MAX_LENGTHS.name} characters or less`;
  }

  if (!payload.email || typeof payload.email !== 'string') {
    errors.email = 'Email is required';
  } else if (payload.email.trim().length === 0) {
    errors.email = 'Email cannot be empty';
  } else if (payload.email.length > MAX_LENGTHS.email) {
    errors.email = `Email must be ${MAX_LENGTHS.email} characters or less`;
  } else if (!EMAIL_REGEX.test(payload.email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  // Validate optional fields
  if (payload.phone !== undefined) {
    if (typeof payload.phone !== 'string') {
      errors.phone = 'Phone must be a string';
    } else if (payload.phone.length > MAX_LENGTHS.phone) {
      errors.phone = `Phone must be ${MAX_LENGTHS.phone} characters or less`;
    }
  }

  if (payload.notes !== undefined) {
    if (typeof payload.notes !== 'string') {
      errors.notes = 'Message must be a string';
    } else if (payload.notes.length > MAX_LENGTHS.message) {
      errors.notes = `Message must be ${MAX_LENGTHS.message} characters or less`;
    }
  }

  // Validate UTM fields
  if (payload.utm !== undefined) {
    if (typeof payload.utm !== 'object' || payload.utm === null) {
      errors.utm = 'UTM must be an object';
    } else {
      const utmFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
      for (const field of utmFields) {
        const value = payload.utm[field];
        if (value !== undefined) {
          if (typeof value !== 'string') {
            errors[field] = `${field} must be a string`;
          } else if (value.length > MAX_LENGTHS.utm) {
            errors[field] = `${field} must be ${MAX_LENGTHS.utm} characters or less`;
          }
        }
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Parse JSON body safely
 */
export function parseJsonBody(body: string | null | undefined): { data: unknown; error?: string } {
  if (!body) {
    return { data: null, error: 'Request body is empty' };
  }

  try {
    const data = JSON.parse(body);
    return { data };
  } catch {
    return { data: null, error: 'Invalid JSON in request body' };
  }
}
