/**
 * Security Module Tests
 *
 * Comprehensive tests for security analysis functions including:
 * - Disposable email detection
 * - Spam keyword detection
 * - URL counting
 * - Complete security analysis
 *
 * Note: Internal functions (isDisposableEmail, containsSpamKeywords, countUrls)
 * are tested through the public analyzeLeadSecurity function.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeLeadSecurity, extractClientIp } from '../lib/security.js';
import { generateNormalizedLead, DISPOSABLE_EMAIL_DOMAINS, SPAM_KEYWORDS } from './helpers.js';

// Mock the hash module since we want to test security logic, not hashing
vi.mock('../lib/hash.js', () => ({
  hashIp: vi.fn((ip: string, salt: string) => `hashed_${ip}_${salt}`),
  hashEmailWithSalt: vi.fn((email: string, _salt: string) => `hashed_${email}`),
  generateIdempotencyKey: vi.fn(
    (email: string, pageUrl: string | undefined, bucket: string) =>
      `idem_${email}_${pageUrl || 'nourl'}_${bucket}`
  ),
}));

// Mock the time module
vi.mock('../lib/time.js', () => ({
  getWindowBucket: vi.fn(() => '202401261200'),
}));

describe('analyzeLeadSecurity', () => {
  const defaultIp = '192.168.1.100';
  const defaultSalt = 'test-salt';
  const defaultWindowMinutes = 60;

  beforeEach(() => {
    vi.clearAllMocks();
    // Set required environment variable
    process.env.EMAIL_HASH_SALT = 'test-email-salt';
  });

  afterEach(() => {
    delete process.env.EMAIL_HASH_SALT;
  });

  // ===========================================================================
  // Disposable Email Detection Tests
  // ===========================================================================

  describe('disposable email detection', () => {
    it('should flag leads with mailinator.com email as suspicious', () => {
      const lead = generateNormalizedLead({ email: 'test@mailinator.com' });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons).toContain('disposable_email_domain');
    });

    it('should flag leads with 10minutemail.com email as suspicious', () => {
      const lead = generateNormalizedLead({ email: 'test@10minutemail.com' });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons).toContain('disposable_email_domain');
    });

    it('should flag leads with guerrillamail.com email as suspicious', () => {
      const lead = generateNormalizedLead({ email: 'test@guerrillamail.com' });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons).toContain('disposable_email_domain');
    });

    it('should flag leads with temp-mail.org email as suspicious', () => {
      const lead = generateNormalizedLead({ email: 'temp@temp-mail.org' });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons).toContain('disposable_email_domain');
    });

    it('should flag leads with yopmail.com email as suspicious', () => {
      const lead = generateNormalizedLead({ email: 'user@yopmail.com' });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons).toContain('disposable_email_domain');
    });

    it('should detect all known disposable email domains', () => {
      DISPOSABLE_EMAIL_DOMAINS.forEach((domain) => {
        const lead = generateNormalizedLead({ email: `test@${domain}` });
        const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

        expect(result.suspicious).toBe(true);
        expect(result.reasons).toContain('disposable_email_domain');
      });
    });

    it('should be case-insensitive for disposable email domains', () => {
      const lead = generateNormalizedLead({ email: 'test@MAILINATOR.COM' });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons).toContain('disposable_email_domain');
    });

    it('should not flag legitimate email domains', () => {
      const legitimateDomains = [
        'gmail.com',
        'outlook.com',
        'yahoo.com',
        'company.org',
        'example.com',
      ];

      legitimateDomains.forEach((domain) => {
        const lead = generateNormalizedLead({
          email: `test@${domain}`,
          message: undefined, // Ensure no spam keywords
        });
        const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

        expect(result.suspicious).toBe(false);
        expect(result.reasons).not.toContain('disposable_email_domain');
      });
    });
  });

  // ===========================================================================
  // Spam Keyword Detection Tests
  // ===========================================================================

  describe('spam keyword detection', () => {
    it('should flag message containing "backlinks"', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message: 'I can provide backlinks for your website',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons.some((r) => r.includes('spam_keywords'))).toBe(true);
      expect(result.reasons.some((r) => r.includes('backlinks'))).toBe(true);
    });

    it('should flag message containing "seo services"', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message: 'We offer the best seo services for your business',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons.some((r) => r.includes('seo services'))).toBe(true);
    });

    it('should flag message containing "crypto"', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message: 'Invest in crypto and make millions',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons.some((r) => r.includes('crypto'))).toBe(true);
    });

    it('should flag message containing "telegram"', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message: 'Contact me on telegram for more info',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons.some((r) => r.includes('telegram'))).toBe(true);
    });

    it('should flag message containing "whatsapp marketing"', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message: 'WhatsApp marketing is the best way to reach customers',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons.some((r) => r.includes('whatsapp marketing'))).toBe(true);
    });

    it('should flag message containing "buy followers"', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message: 'Buy followers and grow your Instagram fast',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons.some((r) => r.includes('buy followers'))).toBe(true);
    });

    it('should flag message containing "cheap traffic"', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message: 'Get cheap traffic to your website today',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons.some((r) => r.includes('cheap traffic'))).toBe(true);
    });

    it('should flag message containing "make money fast"', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message: 'Learn how to make money fast with this trick',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons.some((r) => r.includes('make money fast'))).toBe(true);
    });

    it('should flag message containing "work from home"', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message: 'Work from home and earn $5000/week',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons.some((r) => r.includes('work from home'))).toBe(true);
    });

    it('should flag message containing "guaranteed income"', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message: 'Guaranteed income every month!',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons.some((r) => r.includes('guaranteed income'))).toBe(true);
    });

    it('should detect multiple spam keywords', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message: 'Buy followers, get backlinks, and make money fast',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      const spamReason = result.reasons.find((r) => r.includes('spam_keywords'));
      expect(spamReason).toBeDefined();
      expect(spamReason).toContain('buy followers');
      expect(spamReason).toContain('backlinks');
      expect(spamReason).toContain('make money fast');
    });

    it('should be case-insensitive for spam keywords', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message: 'BACKLINKS and SEO SERVICES available',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons.some((r) => r.includes('backlinks'))).toBe(true);
      expect(result.reasons.some((r) => r.includes('seo services'))).toBe(true);
    });

    it('should not flag legitimate messages', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message:
          'I am interested in your roofing services. Please call me to schedule an estimate.',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });

    it('should handle undefined message', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message: undefined,
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(false);
    });

    it('should handle empty message', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message: '',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(false);
    });
  });

  // ===========================================================================
  // URL Detection Tests
  // ===========================================================================

  describe('URL counting', () => {
    it('should not flag message with zero URLs', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message: 'Please contact me about your services',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(false);
      expect(result.reasons.some((r) => r.includes('excessive_urls'))).toBe(false);
    });

    it('should not flag message with one URL', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message: 'Check out my website: https://mysite.com',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(false);
      expect(result.reasons.some((r) => r.includes('excessive_urls'))).toBe(false);
    });

    it('should flag message with two URLs', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message: 'Visit https://site1.com and https://site2.com',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons.some((r) => r.includes('excessive_urls: 2'))).toBe(true);
    });

    it('should flag message with multiple URLs', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message: 'Check these links: https://a.com https://b.com https://c.com https://d.com',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons.some((r) => r.includes('excessive_urls: 4'))).toBe(true);
    });

    it('should count both http and https URLs', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message: 'Visit http://site1.com and https://site2.com',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons.some((r) => r.includes('excessive_urls: 2'))).toBe(true);
    });

    it('should handle URLs with paths and query strings', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        message: 'Link 1: https://site.com/path?query=1 Link 2: https://other.com/page#section',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons.some((r) => r.includes('excessive_urls: 2'))).toBe(true);
    });
  });

  // ===========================================================================
  // Combined Analysis Tests
  // ===========================================================================

  describe('combined security analysis', () => {
    it('should flag lead with disposable email AND spam keywords', () => {
      const lead = generateNormalizedLead({
        email: 'test@mailinator.com',
        message: 'Buy backlinks from us!',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons).toContain('disposable_email_domain');
      expect(result.reasons.some((r) => r.includes('spam_keywords'))).toBe(true);
    });

    it('should flag lead with all suspicious indicators', () => {
      const lead = generateNormalizedLead({
        email: 'test@guerrillamail.com',
        message:
          'Get crypto gains at https://scam1.com and https://scam2.com for guaranteed income!',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(true);
      expect(result.reasons.length).toBeGreaterThanOrEqual(3);
      expect(result.reasons).toContain('disposable_email_domain');
      expect(result.reasons.some((r) => r.includes('spam_keywords'))).toBe(true);
      expect(result.reasons.some((r) => r.includes('excessive_urls'))).toBe(true);
    });

    it('should return clean analysis for legitimate lead', () => {
      const lead = generateNormalizedLead({
        email: 'john.smith@company.com',
        message: 'I am interested in getting a quote for your roofing services.',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.suspicious).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Hash Generation Tests
  // ===========================================================================

  describe('hash generation', () => {
    it('should generate IP hash', () => {
      const lead = generateNormalizedLead({ email: 'test@example.com' });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.ipHash).toBeDefined();
      expect(result.ipHash).toBe(`hashed_${defaultIp}_${defaultSalt}`);
    });

    it('should generate email hash', () => {
      const lead = generateNormalizedLead({ email: 'test@example.com' });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.emailHash).toBeDefined();
      expect(result.emailHash).toBe('hashed_test@example.com');
    });

    it('should generate idempotency key', () => {
      const lead = generateNormalizedLead({
        email: 'test@example.com',
        pageUrl: 'https://example.com/landing',
      });
      const result = analyzeLeadSecurity(lead, defaultIp, defaultSalt, defaultWindowMinutes);

      expect(result.idempotencyKey).toBeDefined();
      expect(result.idempotencyKey).toContain('test@example.com');
    });
  });
});

// =============================================================================
// extractClientIp Tests
// =============================================================================

describe('extractClientIp', () => {
  describe('X-Forwarded-For header handling', () => {
    it('should extract IP from X-Forwarded-For header', () => {
      const headers = { 'x-forwarded-for': '203.0.113.195' };
      const result = extractClientIp(headers);

      expect(result).toBe('203.0.113.195');
    });

    it('should extract first IP from comma-separated X-Forwarded-For', () => {
      const headers = { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' };
      const result = extractClientIp(headers);

      expect(result).toBe('203.0.113.195');
    });

    it('should handle X-Forwarded-For with spaces', () => {
      const headers = { 'x-forwarded-for': '  203.0.113.195  ,  70.41.3.18  ' };
      const result = extractClientIp(headers);

      expect(result).toBe('203.0.113.195');
    });

    it('should handle capitalized X-Forwarded-For header', () => {
      const headers = { 'X-Forwarded-For': '192.168.1.100' };
      const result = extractClientIp(headers);

      expect(result).toBe('192.168.1.100');
    });

    it('should prioritize x-forwarded-for over sourceIp', () => {
      const headers = { 'x-forwarded-for': '203.0.113.195' };
      const result = extractClientIp(headers, '10.0.0.1');

      expect(result).toBe('203.0.113.195');
    });
  });

  describe('fallback behavior', () => {
    it('should use sourceIp when X-Forwarded-For is missing', () => {
      const headers = {};
      const result = extractClientIp(headers, '192.168.1.50');

      expect(result).toBe('192.168.1.50');
    });

    it('should return "unknown" when no IP is available', () => {
      const headers = {};
      const result = extractClientIp(headers);

      expect(result).toBe('unknown');
    });

    it('should return "unknown" when X-Forwarded-For is empty', () => {
      const headers = { 'x-forwarded-for': '' };
      const result = extractClientIp(headers);

      expect(result).toBe('unknown');
    });

    it('should use sourceIp when X-Forwarded-For is undefined', () => {
      const headers = { 'x-forwarded-for': undefined };
      const result = extractClientIp(headers, '10.0.0.1');

      expect(result).toBe('10.0.0.1');
    });
  });

  describe('edge cases', () => {
    it('should handle IPv6 addresses in X-Forwarded-For', () => {
      const headers = { 'x-forwarded-for': '2001:db8:85a3::8a2e:370:7334' };
      const result = extractClientIp(headers);

      expect(result).toBe('2001:db8:85a3::8a2e:370:7334');
    });

    it('should handle mixed IPv4 and IPv6 in X-Forwarded-For', () => {
      const headers = { 'x-forwarded-for': '2001:db8::1, 192.168.1.1' };
      const result = extractClientIp(headers);

      expect(result).toBe('2001:db8::1');
    });

    it('should handle localhost IP', () => {
      const headers = { 'x-forwarded-for': '127.0.0.1' };
      const result = extractClientIp(headers);

      expect(result).toBe('127.0.0.1');
    });

    it('should handle private network IPs', () => {
      const privateIps = ['10.0.0.1', '172.16.0.1', '192.168.1.1'];

      privateIps.forEach((ip) => {
        const headers = { 'x-forwarded-for': ip };
        const result = extractClientIp(headers);

        expect(result).toBe(ip);
      });
    });
  });
});
