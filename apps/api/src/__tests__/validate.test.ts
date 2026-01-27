/**
 * Validation Module Tests
 *
 * Comprehensive tests for the validateLeadPayload and parseJsonBody functions.
 * Tests cover valid data, missing required fields, invalid formats, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { validateLeadPayload, parseJsonBody } from '../lib/validate.js';
import { generateLeadPayload, generateUtmParams } from './helpers.js';

describe('validateLeadPayload', () => {
  // ===========================================================================
  // Valid Data Tests
  // ===========================================================================

  describe('valid data', () => {
    it('should accept a complete valid payload', () => {
      const payload = generateLeadPayload();
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should accept payload with only required fields', () => {
      const payload = {
        name: 'John Doe',
        email: 'john@example.com',
      };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should accept payload with optional fields', () => {
      const payload = {
        name: 'Jane Smith',
        email: 'jane@company.org',
        phone: '+1-555-987-6543',
        notes: 'Looking for a quote',
      };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should accept payload with UTM parameters', () => {
      const payload = {
        name: 'Test User',
        email: 'test@domain.com',
        utm: generateUtmParams(),
      };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should accept payload with partial UTM parameters', () => {
      const payload = {
        name: 'Test User',
        email: 'test@domain.com',
        utm: {
          utm_source: 'facebook',
        },
      };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should accept various valid email formats', () => {
      const validEmails = [
        'simple@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'first.last@subdomain.domain.com',
        '123@example.com',
      ];

      validEmails.forEach((email) => {
        const payload = { name: 'Test', email };
        const result = validateLeadPayload(payload);
        expect(result.valid).toBe(true);
      });
    });
  });

  // ===========================================================================
  // Missing Required Fields Tests
  // ===========================================================================

  describe('missing required fields', () => {
    it('should reject null body', () => {
      const result = validateLeadPayload(null);

      expect(result.valid).toBe(false);
      expect(result.errors._body).toBeDefined();
    });

    it('should reject undefined body', () => {
      const result = validateLeadPayload(undefined);

      expect(result.valid).toBe(false);
      expect(result.errors._body).toBeDefined();
    });

    it('should reject non-object body', () => {
      const result = validateLeadPayload('not an object');

      expect(result.valid).toBe(false);
      expect(result.errors._body).toBe('Request body must be a valid JSON object');
    });

    it('should reject empty object', () => {
      const result = validateLeadPayload({});

      expect(result.valid).toBe(false);
      expect(result.errors.name).toBe('Name is required');
      expect(result.errors.email).toBe('Email is required');
    });

    it('should reject missing name', () => {
      const payload = { email: 'test@example.com' };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.name).toBe('Name is required');
    });

    it('should reject missing email', () => {
      const payload = { name: 'John Doe' };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.email).toBe('Email is required');
    });

    it('should reject null name', () => {
      const payload = { name: null, email: 'test@example.com' };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.name).toBe('Name is required');
    });

    it('should reject null email', () => {
      const payload = { name: 'John Doe', email: null };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.email).toBe('Email is required');
    });
  });

  // ===========================================================================
  // Invalid Email Format Tests
  // ===========================================================================

  describe('invalid email formats', () => {
    it('should reject email without @', () => {
      const payload = { name: 'Test', email: 'invalidemail.com' };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.email).toBe('Please enter a valid email address');
    });

    it('should reject email without domain', () => {
      const payload = { name: 'Test', email: 'test@' };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.email).toBe('Please enter a valid email address');
    });

    it('should reject email without local part', () => {
      const payload = { name: 'Test', email: '@example.com' };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.email).toBe('Please enter a valid email address');
    });

    it('should reject email with spaces', () => {
      const payload = { name: 'Test', email: 'test @example.com' };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.email).toBe('Please enter a valid email address');
    });

    it('should reject email without TLD', () => {
      const payload = { name: 'Test', email: 'test@example' };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.email).toBe('Please enter a valid email address');
    });

    it('should reject empty email string', () => {
      const payload = { name: 'Test', email: '' };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.email).toBe('Email is required');
    });

    it('should reject whitespace-only email', () => {
      const payload = { name: 'Test', email: '   ' };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.email).toBe('Email cannot be empty');
    });

    it('should reject non-string email', () => {
      const payload = { name: 'Test', email: 12345 };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.email).toBe('Email is required');
    });
  });

  // ===========================================================================
  // Invalid Phone Format Tests
  // ===========================================================================

  describe('invalid phone formats', () => {
    it('should reject non-string phone', () => {
      const payload = { name: 'Test', email: 'test@example.com', phone: 1234567890 };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.phone).toBe('Phone must be a string');
    });

    it('should accept valid phone strings', () => {
      const validPhones = ['+1-555-123-4567', '(555) 123-4567', '5551234567', '+44 20 7946 0958'];

      validPhones.forEach((phone) => {
        const payload = { name: 'Test', email: 'test@example.com', phone };
        const result = validateLeadPayload(payload);
        expect(result.valid).toBe(true);
      });
    });

    it('should allow empty phone (optional field)', () => {
      const payload = { name: 'Test', email: 'test@example.com', phone: '' };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(true);
    });
  });

  // ===========================================================================
  // Field Length Limits Tests
  // ===========================================================================

  describe('field length limits', () => {
    it('should reject name exceeding 120 characters', () => {
      const longName = 'A'.repeat(121);
      const payload = { name: longName, email: 'test@example.com' };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.name).toBe('Name must be 120 characters or less');
    });

    it('should accept name at exactly 120 characters', () => {
      const maxName = 'A'.repeat(120);
      const payload = { name: maxName, email: 'test@example.com' };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(true);
    });

    it('should reject email exceeding 254 characters', () => {
      const longLocal = 'a'.repeat(250);
      const longEmail = `${longLocal}@example.com`;
      const payload = { name: 'Test', email: longEmail };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.email).toBe('Email must be 254 characters or less');
    });

    it('should reject phone exceeding 40 characters', () => {
      const longPhone = '1'.repeat(41);
      const payload = { name: 'Test', email: 'test@example.com', phone: longPhone };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.phone).toBe('Phone must be 40 characters or less');
    });

    it('should accept phone at exactly 40 characters', () => {
      const maxPhone = '1'.repeat(40);
      const payload = { name: 'Test', email: 'test@example.com', phone: maxPhone };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(true);
    });

    it('should reject notes exceeding 2000 characters', () => {
      const longNotes = 'A'.repeat(2001);
      const payload = { name: 'Test', email: 'test@example.com', notes: longNotes };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.notes).toBe('Message must be 2000 characters or less');
    });

    it('should accept notes at exactly 2000 characters', () => {
      const maxNotes = 'A'.repeat(2000);
      const payload = { name: 'Test', email: 'test@example.com', notes: maxNotes };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(true);
    });

    it('should reject UTM parameter exceeding 120 characters', () => {
      const longUtm = 'a'.repeat(121);
      const payload = {
        name: 'Test',
        email: 'test@example.com',
        utm: {
          utm_source: longUtm,
        },
      };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.utm_source).toBe('utm_source must be 120 characters or less');
    });

    it('should validate all UTM field lengths independently', () => {
      const longUtm = 'a'.repeat(121);
      const payload = {
        name: 'Test',
        email: 'test@example.com',
        utm: {
          utm_source: 'google',
          utm_medium: longUtm,
          utm_campaign: 'test',
        },
      };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.utm_medium).toBe('utm_medium must be 120 characters or less');
    });
  });

  // ===========================================================================
  // Notes Validation Tests
  // ===========================================================================

  describe('notes validation', () => {
    it('should reject non-string notes', () => {
      const payload = { name: 'Test', email: 'test@example.com', notes: 12345 };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.notes).toBe('Message must be a string');
    });

    it('should accept empty notes', () => {
      const payload = { name: 'Test', email: 'test@example.com', notes: '' };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(true);
    });

    it('should accept notes with special characters', () => {
      const payload = {
        name: 'Test',
        email: 'test@example.com',
        notes: "Hello! I'm interested in <services> & more.",
      };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(true);
    });
  });

  // ===========================================================================
  // UTM Validation Tests
  // ===========================================================================

  describe('UTM validation', () => {
    it('should reject non-object UTM', () => {
      const payload = { name: 'Test', email: 'test@example.com', utm: 'not an object' };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.utm).toBe('UTM must be an object');
    });

    it('should reject null UTM', () => {
      const payload = { name: 'Test', email: 'test@example.com', utm: null };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.utm).toBe('UTM must be an object');
    });

    it('should reject non-string UTM field', () => {
      const payload = {
        name: 'Test',
        email: 'test@example.com',
        utm: {
          utm_source: 123,
        },
      };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.utm_source).toBe('utm_source must be a string');
    });

    it('should validate all UTM fields', () => {
      const utmFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

      utmFields.forEach((field) => {
        const payload = {
          name: 'Test',
          email: 'test@example.com',
          utm: {
            [field]: 123,
          },
        };
        const result = validateLeadPayload(payload);

        expect(result.valid).toBe(false);
        expect(result.errors[field]).toBe(`${field} must be a string`);
      });
    });

    it('should accept empty UTM object', () => {
      const payload = { name: 'Test', email: 'test@example.com', utm: {} };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(true);
    });
  });

  // ===========================================================================
  // Empty and Whitespace Tests
  // ===========================================================================

  describe('empty and whitespace handling', () => {
    it('should reject whitespace-only name', () => {
      const payload = { name: '   ', email: 'test@example.com' };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.name).toBe('Name cannot be empty');
    });

    it('should accept name with leading/trailing whitespace (will be trimmed later)', () => {
      const payload = { name: '  John Doe  ', email: 'test@example.com' };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(true);
    });

    it('should handle mixed valid and invalid fields', () => {
      const payload = {
        name: '',
        email: 'invalid-email',
        phone: 12345,
        notes: 'Valid note',
      };
      const result = validateLeadPayload(payload);

      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(3);
      expect(result.errors.name).toBeDefined();
      expect(result.errors.email).toBeDefined();
      expect(result.errors.phone).toBeDefined();
    });
  });
});

// =============================================================================
// parseJsonBody Tests
// =============================================================================

describe('parseJsonBody', () => {
  describe('valid JSON', () => {
    it('should parse valid JSON object', () => {
      const body = JSON.stringify({ name: 'Test', email: 'test@example.com' });
      const result = parseJsonBody(body);

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual({ name: 'Test', email: 'test@example.com' });
    });

    it('should parse valid JSON array', () => {
      const body = JSON.stringify([1, 2, 3]);
      const result = parseJsonBody(body);

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual([1, 2, 3]);
    });

    it('should parse valid JSON with nested objects', () => {
      const body = JSON.stringify({
        user: {
          name: 'Test',
          address: {
            city: 'New York',
          },
        },
      });
      const result = parseJsonBody(body);

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual({
        user: {
          name: 'Test',
          address: {
            city: 'New York',
          },
        },
      });
    });
  });

  describe('invalid JSON', () => {
    it('should return error for null body', () => {
      const result = parseJsonBody(null);

      expect(result.error).toBe('Request body is empty');
      expect(result.data).toBeNull();
    });

    it('should return error for undefined body', () => {
      const result = parseJsonBody(undefined);

      expect(result.error).toBe('Request body is empty');
      expect(result.data).toBeNull();
    });

    it('should return error for empty string', () => {
      const result = parseJsonBody('');

      expect(result.error).toBe('Request body is empty');
      expect(result.data).toBeNull();
    });

    it('should return error for invalid JSON syntax', () => {
      const result = parseJsonBody('{invalid json}');

      expect(result.error).toBe('Invalid JSON in request body');
      expect(result.data).toBeNull();
    });

    it('should return error for incomplete JSON', () => {
      const result = parseJsonBody('{"name": "Test"');

      expect(result.error).toBe('Invalid JSON in request body');
      expect(result.data).toBeNull();
    });

    it('should return error for trailing comma', () => {
      const result = parseJsonBody('{"name": "Test",}');

      expect(result.error).toBe('Invalid JSON in request body');
      expect(result.data).toBeNull();
    });
  });
});
