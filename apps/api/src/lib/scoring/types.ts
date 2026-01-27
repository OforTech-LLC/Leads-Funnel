/**
 * Lead Scoring Types
 *
 * Behind feature flag: lead_scoring_enabled (OFF by default)
 */

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface LeadScore {
  total: number; // 0-100
  breakdown: ScoringBreakdown;
  scoredAt: string; // ISO 8601
}

export interface ScoringBreakdown {
  completeness: number;
  quality: number;
  engagement: number;
}

// ---------------------------------------------------------------------------
// Scoring Rules (configurable weights)
// ---------------------------------------------------------------------------

export interface ScoringRule {
  name: string;
  category: 'completeness' | 'quality' | 'engagement';
  points: number;
  evaluator: (input: ScoringInput) => boolean;
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface ScoringInput {
  name?: string;
  email: string;
  phone?: string;
  message?: string;
  pageUrl?: string;
  referrer?: string;
  utm?: Record<string, string>;
  ipHash?: string;
  userAgent?: string;
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export interface ScoringResult {
  score: LeadScore;
  matchedRules: string[];
}
