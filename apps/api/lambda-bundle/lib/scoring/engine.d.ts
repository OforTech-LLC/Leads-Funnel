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
import type { ScoringInput, ScoringResult } from './types.js';
/**
 * Score a lead based on completeness, quality, and engagement.
 *
 * @param input - Lead data to score
 * @returns ScoringResult with total score (0-100), breakdown, and matched rules
 */
export declare function scoreLead(input: ScoringInput): ScoringResult;
/**
 * Get the maximum possible score (for documentation/UI).
 */
export declare function getMaxScore(): number;
/**
 * Get all scoring rule definitions (for admin UI).
 */
export declare function getScoringRules(): Array<{
    name: string;
    category: string;
    points: number;
}>;
