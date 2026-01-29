import { describe, it, expect } from 'vitest';
import { generateTemporaryPassword } from './portal-users.js';

const hasUpper = (value: string) => /[A-Z]/.test(value);
const hasLower = (value: string) => /[a-z]/.test(value);
const hasNumber = (value: string) => /[0-9]/.test(value);
const hasSpecial = (value: string) => /[!@#$%^&*_=+\-]/.test(value);

describe('generateTemporaryPassword', () => {
  it('generates a password with expected length', () => {
    const password = generateTemporaryPassword(14);
    expect(password).toHaveLength(14);
  });

  it('includes upper, lower, number, and special characters', () => {
    const password = generateTemporaryPassword(16);
    expect(hasUpper(password)).toBe(true);
    expect(hasLower(password)).toBe(true);
    expect(hasNumber(password)).toBe(true);
    expect(hasSpecial(password)).toBe(true);
  });
});
