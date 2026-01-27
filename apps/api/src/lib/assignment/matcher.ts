/**
 * Assignment Rule Matching Engine
 *
 * Implements ZIP code longest-prefix matching algorithm for lead-to-rule
 * assignment. Rules are scored by ZIP match specificity (longer prefix = higher
 * score) and then sorted by priority (lower number = higher priority).
 *
 * Algorithm:
 * 1. Filter to active rules matching the lead's funnelId (or wildcard '*')
 * 2. For each rule, compute the longest ZIP prefix match score
 * 3. Sort by: ZIP match score DESC, then priority ASC
 * 4. Return the first match or null
 */

import type { AssignmentRule } from '../types/events.js';

// =============================================================================
// ZIP Pattern Matching
// =============================================================================

export interface ZipMatchResult {
  matched: boolean;
  matchLength: number;
}

/**
 * Match a ZIP code against a list of patterns using longest-prefix algorithm.
 *
 * Matching precedence:
 * - Exact match ("33101" matches "33101") => matchLength = 5
 * - Prefix match ("331" matches "33101") => matchLength = 3
 * - No match => matched = false, matchLength = 0
 *
 * @param zipCode - The lead's ZIP code to match
 * @param patterns - Array of ZIP patterns from the assignment rule
 * @returns Object with matched flag and longest match length for scoring
 */
export function matchZipPattern(zipCode: string, patterns: string[]): ZipMatchResult {
  if (!zipCode || patterns.length === 0) {
    return { matched: false, matchLength: 0 };
  }

  const normalizedZip = zipCode.trim();
  let longestMatch = 0;

  for (const pattern of patterns) {
    const normalizedPattern = pattern.trim();

    if (!normalizedPattern) {
      continue;
    }

    // Exact match - highest possible score
    if (normalizedZip === normalizedPattern) {
      return { matched: true, matchLength: normalizedPattern.length };
    }

    // Prefix match - pattern is a prefix of the ZIP code
    if (normalizedZip.startsWith(normalizedPattern)) {
      if (normalizedPattern.length > longestMatch) {
        longestMatch = normalizedPattern.length;
      }
    }
  }

  if (longestMatch > 0) {
    return { matched: true, matchLength: longestMatch };
  }

  return { matched: false, matchLength: 0 };
}

// =============================================================================
// Rule Matching
// =============================================================================

interface ScoredRule {
  rule: AssignmentRule;
  zipMatchScore: number;
}

/**
 * Match a lead to the best assignment rule based on funnelId and ZIP code.
 *
 * Scoring:
 * - ZIP match score (longer prefix = higher score, used as primary sort)
 * - Priority (lower number = higher priority, used as tiebreaker)
 *
 * @param funnelId - The lead's funnel identifier
 * @param zipCode - The lead's ZIP code
 * @param rules - All loaded assignment rules
 * @returns The best matching rule, or null if no rules match
 */
export function matchLeadToRule(
  funnelId: string,
  zipCode: string,
  rules: AssignmentRule[]
): AssignmentRule | null {
  if (!rules || rules.length === 0) {
    return null;
  }

  // Step 1: Filter to active rules matching this funnelId (or wildcard)
  const applicableRules = rules.filter((rule) => {
    if (!rule.active) {
      return false;
    }
    // Rule matches if funnelId matches exactly or rule uses wildcard
    return rule.funnelId === funnelId || rule.funnelId === '*';
  });

  if (applicableRules.length === 0) {
    return null;
  }

  // Step 2: Score each rule by ZIP match
  const scoredRules: ScoredRule[] = [];

  for (const rule of applicableRules) {
    // If the lead has no ZIP code, only match rules with no ZIP patterns
    // (effectively a catch-all rule)
    if (!zipCode || zipCode.trim() === '') {
      if (rule.zipPatterns.length === 0) {
        scoredRules.push({ rule, zipMatchScore: 0 });
      }
      continue;
    }

    // If rule has no ZIP patterns, it matches all ZIP codes (catch-all)
    if (rule.zipPatterns.length === 0) {
      scoredRules.push({ rule, zipMatchScore: 0 });
      continue;
    }

    const match = matchZipPattern(zipCode, rule.zipPatterns);
    if (match.matched) {
      scoredRules.push({ rule, zipMatchScore: match.matchLength });
    }
  }

  if (scoredRules.length === 0) {
    return null;
  }

  // Step 3: Sort by ZIP match score DESC, then priority ASC
  scoredRules.sort((a, b) => {
    // Higher ZIP match score first (more specific match wins)
    if (b.zipMatchScore !== a.zipMatchScore) {
      return b.zipMatchScore - a.zipMatchScore;
    }
    // Lower priority number first (higher priority wins)
    return a.rule.priority - b.rule.priority;
  });

  // Step 4: Return the best match
  return scoredRules[0].rule;
}
