/**
 * Assignment Rule Matching Engine
 *
 * Implements a multi-strategy lead-to-rule matching system:
 *
 * 1. **ZIP code longest-prefix matching** (original)
 *    Rules are scored by ZIP match specificity (longer prefix = higher score)
 *    and then sorted by priority (lower number = higher priority).
 *
 * 2. **Geographic radius matching** (new)
 *    Rules with `radiusMiles` and `centerZip` use Haversine distance
 *    to match leads within a radius of the rule's center ZIP.
 *    Falls back to ZIP prefix matching when geo fields are absent.
 *
 * 3. **Round-robin distribution** (new)
 *    When multiple rules match with the same priority, round-robin rotates
 *    through matching orgs.  Tracked in DynamoDB for consistency across
 *    Lambda instances.  Gated by the `round_robin_enabled` feature flag.
 *
 * Scoring algorithm (unchanged sort order):
 *   Primary:  ZIP match score DESC (more specific = higher)
 *   Secondary: priority ASC (lower number = higher priority)
 */
import type { AssignmentRule } from '../types/events.js';
/**
 * Rules MAY carry optional geo fields.  These extend the canonical
 * AssignmentRule from lib/types/events.ts without breaking existing code.
 */
export interface GeoAssignmentRule extends AssignmentRule {
    radiusMiles?: number;
    centerZip?: string;
}
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
export declare function matchZipPattern(zipCode: string, patterns: string[]): ZipMatchResult;
/**
 * Match a lead to the best assignment rule based on funnelId and ZIP code.
 *
 * Scoring:
 * - ZIP match score (longer prefix = higher score, used as primary sort)
 * - Geo radius match score (6 if within radius, overrides prefix)
 * - Priority (lower number = higher priority, used as tiebreaker)
 * - Round-robin (if feature-flagged on, rotates within same-priority ties)
 *
 * @param funnelId - The lead's funnel identifier
 * @param zipCode - The lead's ZIP code
 * @param rules - All loaded assignment rules
 * @returns The best matching rule, or null if no rules match
 */
export declare function matchLeadToRule(funnelId: string, zipCode: string, rules: AssignmentRule[]): AssignmentRule | null;
/**
 * Async variant of matchLeadToRule that supports round-robin distribution.
 *
 * When `round_robin_enabled` is ON and multiple rules tie on both
 * zipMatchScore and priority, this function atomically rotates through
 * them using DynamoDB-backed round-robin.
 *
 * When the flag is OFF, behaviour is identical to the synchronous
 * `matchLeadToRule` -- the first rule in the sorted list wins.
 *
 * @param funnelId - The lead's funnel identifier
 * @param zipCode - The lead's ZIP code
 * @param rules - All loaded assignment rules
 * @returns The selected rule, or null if no rules match
 */
export declare function matchLeadToRuleAsync(funnelId: string, zipCode: string, rules: AssignmentRule[]): Promise<AssignmentRule | null>;
