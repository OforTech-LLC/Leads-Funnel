/**
 * Lead Scoring Types
 *
 * Behind feature flag: lead_scoring_enabled (OFF by default)
 */
export interface LeadScore {
    total: number;
    breakdown: ScoringBreakdown;
    scoredAt: string;
}
export interface ScoringBreakdown {
    completeness: number;
    quality: number;
    engagement: number;
}
export interface ScoringRule {
    name: string;
    category: 'completeness' | 'quality' | 'engagement';
    points: number;
    evaluator: (input: ScoringInput) => boolean;
}
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
export interface ScoringResult {
    score: LeadScore;
    matchedRules: string[];
}
