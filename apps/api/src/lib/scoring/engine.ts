/**
 * Lead Scoring Engine
 *
 * Scores leads 0-100 based on completeness, quality, and engagement signals.
 *
 * Scoring categories:
 * - Completeness: has phone (+15), has message (+10), has full name (+10)
 * - Quality: not disposable email (+20), not spam keywords (+15)
 * - Engagement: from organic search (+10), has UTM (+5), repeat visitor (+15)
 *
 * Behind feature flag: lead_scoring_enabled
 */

import type {
  ScoringInput,
  ScoringResult,
  ScoringRule,
  LeadScore,
  ScoringBreakdown,
} from './types.js';
import { createLogger } from '../logging.js';

const log = createLogger('lead-scoring');

// ---------------------------------------------------------------------------
// Disposable Email Domains (common throwaway email providers)
// ---------------------------------------------------------------------------

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  'throwaway.email',
  'yopmail.com',
  'temp-mail.org',
  'fakeinbox.com',
  'sharklasers.com',
  'guerrillamailblock.com',
  'grr.la',
  'dispostable.com',
  'trashmail.com',
  'maildrop.cc',
  'getnada.com',
  '10minutemail.com',
  'minutemail.com',
]);

// ---------------------------------------------------------------------------
// Spam Keywords
// ---------------------------------------------------------------------------

const SPAM_KEYWORDS = [
  'buy now',
  'click here',
  'limited time',
  'act now',
  'free money',
  'winner',
  'congratulations',
  'urgent',
  'nigerian prince',
  'viagra',
  'casino',
  'lottery',
  'make money fast',
  'crypto airdrop',
];

// ---------------------------------------------------------------------------
// Scoring Rules
// ---------------------------------------------------------------------------

const SCORING_RULES: ScoringRule[] = [
  // Completeness rules
  {
    name: 'has_phone',
    category: 'completeness',
    points: 15,
    evaluator: (input) => !!input.phone && input.phone.trim().length >= 7,
  },
  {
    name: 'has_message',
    category: 'completeness',
    points: 10,
    evaluator: (input) => !!input.message && input.message.trim().length >= 10,
  },
  {
    name: 'has_full_name',
    category: 'completeness',
    points: 10,
    evaluator: (input) => {
      if (!input.name) return false;
      const parts = input.name.trim().split(/\s+/);
      return parts.length >= 2 && parts.every((p) => p.length >= 2);
    },
  },

  // Quality rules
  {
    name: 'not_disposable_email',
    category: 'quality',
    points: 20,
    evaluator: (input) => {
      const domain = input.email.split('@')[1]?.toLowerCase();
      return !!domain && !DISPOSABLE_DOMAINS.has(domain);
    },
  },
  {
    name: 'no_spam_keywords',
    category: 'quality',
    points: 15,
    evaluator: (input) => {
      const textToCheck = [input.name || '', input.message || ''].join(' ').toLowerCase();
      return !SPAM_KEYWORDS.some((kw) => textToCheck.includes(kw));
    },
  },

  // Engagement rules
  {
    name: 'organic_search',
    category: 'engagement',
    points: 10,
    evaluator: (input) => {
      const referrer = (input.referrer || '').toLowerCase();
      return (
        referrer.includes('google.') ||
        referrer.includes('bing.') ||
        referrer.includes('duckduckgo.') ||
        referrer.includes('yahoo.')
      );
    },
  },
  {
    name: 'has_utm',
    category: 'engagement',
    points: 5,
    evaluator: (input) => {
      if (!input.utm) return false;
      return !!(input.utm.utm_source || input.utm.utm_campaign || input.utm.utm_medium);
    },
  },
  {
    name: 'repeat_visitor',
    category: 'engagement',
    points: 15,
    evaluator: (_input) => {
      // In production, this would check if the ipHash has been seen before.
      // For now, we cannot determine repeat visitor status without a lookup table.
      // This rule will be evaluated as false until the repeat-visitor tracking
      // is implemented (e.g., checking a DynamoDB counter keyed by ipHash).
      return false;
    },
  },
];

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Score a lead based on completeness, quality, and engagement.
 *
 * @param input - Lead data to score
 * @returns ScoringResult with total score (0-100), breakdown, and matched rules
 */
export function scoreLead(input: ScoringInput): ScoringResult {
  const breakdown: ScoringBreakdown = {
    completeness: 0,
    quality: 0,
    engagement: 0,
  };

  const matchedRules: string[] = [];

  for (const rule of SCORING_RULES) {
    try {
      if (rule.evaluator(input)) {
        breakdown[rule.category] += rule.points;
        matchedRules.push(rule.name);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      log.warn('scoring.rule.error', { rule: rule.name, error: msg });
    }
  }

  // Cap total at 100
  const rawTotal = breakdown.completeness + breakdown.quality + breakdown.engagement;
  const total = Math.min(rawTotal, 100);

  const score: LeadScore = {
    total,
    breakdown,
    scoredAt: new Date().toISOString(),
  };

  log.info('lead.scored', {
    email: input.email.slice(0, 3) + '***',
    total,
    matchedRules: matchedRules.length,
  });

  return { score, matchedRules };
}

/**
 * Get the maximum possible score (for documentation/UI).
 */
export function getMaxScore(): number {
  return SCORING_RULES.reduce((sum, rule) => sum + rule.points, 0);
}

/**
 * Get all scoring rule definitions (for admin UI).
 */
export function getScoringRules(): Array<{
  name: string;
  category: string;
  points: number;
}> {
  return SCORING_RULES.map((r) => ({
    name: r.name,
    category: r.category,
    points: r.points,
  }));
}
