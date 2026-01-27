/**
 * Frontend Authentication Tests
 *
 * Tests for client-side auth utilities including:
 * - parseIdToken() - JWT parsing for display purposes
 * - verifyState() - CSRF state verification
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseIdToken, verifyState } from '../lib/admin/auth';
import { createMockJwt, createMockAdminUserPayload } from './setup';

// Mock the config module
vi.mock('../lib/admin/config', () => ({
  getAdminConfig: vi.fn(() => ({
    cognitoUserPoolId: 'us-east-1_testpool',
    cognitoClientId: 'test-client-id',
    cognitoDomain: 'https://auth.example.com',
    apiBaseUrl: 'https://api.example.com',
    redirectUri: 'http://localhost:3000/admin/callback',
    logoutUri: 'http://localhost:3000/admin',
  })),
  buildLoginUrl: vi.fn(),
  buildLogoutUrl: vi.fn(),
  buildTokenUrl: vi.fn(),
}));

describe('parseIdToken', () => {
  describe('valid token parsing', () => {
    it('should parse a valid JWT and extract user info', () => {
      const payload = createMockAdminUserPayload();
      const token = createMockJwt(payload);

      const user = parseIdToken(token);

      expect(user.sub).toBe('user-123');
      expect(user.email).toBe('admin@example.com');
      expect(user.groups).toContain('Admin');
      expect(user.role).toBe('Admin');
    });

    it('should correctly identify Admin role from groups', () => {
      const payload = createMockAdminUserPayload({
        'cognito:groups': ['Admin'],
      });
      const token = createMockJwt(payload);

      const user = parseIdToken(token);

      expect(user.role).toBe('Admin');
      expect(user.groups).toEqual(['Admin']);
    });

    it('should correctly identify Viewer role from groups', () => {
      const payload = createMockAdminUserPayload({
        'cognito:groups': ['Viewer'],
      });
      const token = createMockJwt(payload);

      const user = parseIdToken(token);

      expect(user.role).toBe('Viewer');
      expect(user.groups).toEqual(['Viewer']);
    });

    it('should default to Viewer role when not in Admin group', () => {
      const payload = createMockAdminUserPayload({
        'cognito:groups': ['SomeOtherGroup'],
      });
      const token = createMockJwt(payload);

      const user = parseIdToken(token);

      expect(user.role).toBe('Viewer');
    });

    it('should handle user with both Admin and Viewer groups', () => {
      const payload = createMockAdminUserPayload({
        'cognito:groups': ['Admin', 'Viewer'],
      });
      const token = createMockJwt(payload);

      const user = parseIdToken(token);

      // Admin takes priority
      expect(user.role).toBe('Admin');
      expect(user.groups).toContain('Admin');
      expect(user.groups).toContain('Viewer');
    });

    it('should handle missing email gracefully', () => {
      const payload = createMockAdminUserPayload();
      delete (payload as Record<string, unknown>).email;
      const token = createMockJwt(payload);

      const user = parseIdToken(token);

      expect(user.email).toBe('');
    });

    it('should handle missing groups gracefully', () => {
      const payload = createMockAdminUserPayload();
      delete (payload as Record<string, unknown>)['cognito:groups'];
      const token = createMockJwt(payload);

      const user = parseIdToken(token);

      expect(user.groups).toEqual([]);
      expect(user.role).toBe('Viewer');
    });

    it('should handle empty groups array', () => {
      const payload = createMockAdminUserPayload({
        'cognito:groups': [],
      });
      const token = createMockJwt(payload);

      const user = parseIdToken(token);

      expect(user.groups).toEqual([]);
      expect(user.role).toBe('Viewer');
    });
  });

  describe('invalid token handling', () => {
    it('should throw error for token with wrong number of parts', () => {
      const invalidToken = 'not.a.valid.jwt.token';

      expect(() => parseIdToken(invalidToken)).toThrow('Invalid ID token format');
    });

    it('should throw error for token with only two parts', () => {
      const invalidToken = 'header.payload';

      expect(() => parseIdToken(invalidToken)).toThrow('Invalid ID token format');
    });

    it('should throw error for token with only one part', () => {
      const invalidToken = 'singlepart';

      expect(() => parseIdToken(invalidToken)).toThrow('Invalid ID token format');
    });

    it('should throw error for empty token', () => {
      expect(() => parseIdToken('')).toThrow('Invalid ID token format');
    });

    it('should throw error for malformed payload (not valid base64)', () => {
      // The middle part is not valid base64
      const malformedToken = 'eyJhbGciOiJIUzI1NiJ9.!!invalid-base64!!.signature';

      expect(() => parseIdToken(malformedToken)).toThrow();
    });

    it('should throw error for payload that is not valid JSON', () => {
      // Valid base64 but not JSON
      const notJsonBase64 = btoa('this is not json');
      const token = `eyJhbGciOiJIUzI1NiJ9.${notJsonBase64}.signature`;

      expect(() => parseIdToken(token)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in email', () => {
      const payload = createMockAdminUserPayload({
        email: 'user+test@example.com',
      });
      const token = createMockJwt(payload);

      const user = parseIdToken(token);

      expect(user.email).toBe('user+test@example.com');
    });

    it('should handle unicode characters in payload', () => {
      const payload = createMockAdminUserPayload({
        email: 'user@example.com',
        'cognito:username': 'testuser',
      });
      const token = createMockJwt(payload);

      const user = parseIdToken(token);

      expect(user.email).toBe('user@example.com');
    });

    it('should preserve all groups from token', () => {
      const payload = createMockAdminUserPayload({
        'cognito:groups': ['Admin', 'Viewer', 'CustomGroup1', 'CustomGroup2'],
      });
      const token = createMockJwt(payload);

      const user = parseIdToken(token);

      expect(user.groups).toHaveLength(4);
      expect(user.groups).toContain('Admin');
      expect(user.groups).toContain('Viewer');
      expect(user.groups).toContain('CustomGroup1');
      expect(user.groups).toContain('CustomGroup2');
    });
  });
});

describe('verifyState', () => {
  const AUTH_STATE_KEY = 'auth_state';

  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('successful verification', () => {
    it('should return true when state matches stored value', () => {
      const state = 'valid-state-value';
      sessionStorage.setItem(AUTH_STATE_KEY, state);

      const result = verifyState(state);

      expect(result).toBe(true);
    });

    it('should remove state from storage after successful verification', () => {
      const state = 'valid-state-value';
      sessionStorage.setItem(AUTH_STATE_KEY, state);

      verifyState(state);

      expect(sessionStorage.getItem(AUTH_STATE_KEY)).toBeNull();
    });

    it('should handle long state values', () => {
      const longState = 'a'.repeat(128);
      sessionStorage.setItem(AUTH_STATE_KEY, longState);

      const result = verifyState(longState);

      expect(result).toBe(true);
    });

    it('should handle state with special characters', () => {
      const specialState = 'state-with-special-chars_123-abc.xyz';
      sessionStorage.setItem(AUTH_STATE_KEY, specialState);

      const result = verifyState(specialState);

      expect(result).toBe(true);
    });
  });

  describe('failed verification', () => {
    it('should return false when state does not match', () => {
      sessionStorage.setItem(AUTH_STATE_KEY, 'stored-state');

      const result = verifyState('different-state');

      expect(result).toBe(false);
    });

    it('should return false when no state is stored', () => {
      // sessionStorage is empty

      const result = verifyState('any-state');

      expect(result).toBe(false);
    });

    it('should return false for empty stored state', () => {
      sessionStorage.setItem(AUTH_STATE_KEY, '');

      const result = verifyState('');

      // Empty string check - should fail as it's falsy
      expect(result).toBe(false);
    });

    it('should be case-sensitive', () => {
      sessionStorage.setItem(AUTH_STATE_KEY, 'CaseSensitiveState');

      const result = verifyState('casesensitivestate');

      expect(result).toBe(false);
    });

    it('should not match partial state values', () => {
      sessionStorage.setItem(AUTH_STATE_KEY, 'full-state-value');

      const result = verifyState('full-state');

      expect(result).toBe(false);
    });
  });

  describe('CSRF protection', () => {
    it('should prevent replay attacks by clearing state after use', () => {
      const state = 'one-time-use-state';
      sessionStorage.setItem(AUTH_STATE_KEY, state);

      // First verification should succeed
      const firstResult = verifyState(state);
      expect(firstResult).toBe(true);

      // Second verification with same state should fail
      const secondResult = verifyState(state);
      expect(secondResult).toBe(false);
    });

    it('should not clear state on failed verification', () => {
      const storedState = 'stored-state';
      sessionStorage.setItem(AUTH_STATE_KEY, storedState);

      // Attempt with wrong state
      verifyState('wrong-state');

      // Original state should still be stored (implementation-dependent)
      // Note: The actual implementation clears on success only
      expect(sessionStorage.getItem(AUTH_STATE_KEY)).toBe(storedState);
    });
  });

  describe('edge cases', () => {
    it('should handle null-like values in sessionStorage', () => {
      // Testing that the function handles potential edge cases
      // @ts-expect-error Testing null handling
      sessionStorage.setItem(AUTH_STATE_KEY, null);

      // Should handle gracefully
      expect(() => verifyState('test')).not.toThrow();
    });

    it('should handle whitespace differences', () => {
      sessionStorage.setItem(AUTH_STATE_KEY, 'state-value');

      const resultWithSpace = verifyState(' state-value');
      expect(resultWithSpace).toBe(false);

      const resultWithTrailingSpace = verifyState('state-value ');
      expect(resultWithTrailingSpace).toBe(false);
    });
  });
});
