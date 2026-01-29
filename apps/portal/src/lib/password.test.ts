import { describe, it, expect, afterEach } from 'vitest';
import { cognitoRegionForTest } from './password';

afterEach(() => {
  delete process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
  delete process.env.NEXT_PUBLIC_COGNITO_REGION;
});

describe('cognitoRegionForTest', () => {
  it('parses region from hosted UI domain', () => {
    process.env.NEXT_PUBLIC_COGNITO_DOMAIN = 'https://example.auth.us-east-1.amazoncognito.com';
    expect(cognitoRegionForTest()).toBe('us-east-1');
  });

  it('falls back to configured region', () => {
    process.env.NEXT_PUBLIC_COGNITO_DOMAIN = '';
    process.env.NEXT_PUBLIC_COGNITO_REGION = 'us-west-2';
    expect(cognitoRegionForTest()).toBe('us-west-2');
  });
});
