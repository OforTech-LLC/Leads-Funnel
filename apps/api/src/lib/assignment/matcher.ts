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
import { isWithinRadius } from '../geo/zip-coords.js';
import { UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient } from '../clients.js';
import { getAssignmentRulesTableName } from '../db/table-names.js';
import { isFeatureEnabled } from '../feature-flags.js';

// =============================================================================
// Extended Rule Type
// =============================================================================

/**
 * Rules MAY carry optional geo fields.  These extend the canonical
 * AssignmentRule from lib/types/events.ts without breaking existing code.
 */
export interface GeoAssignmentRule extends AssignmentRule {
  radiusMiles?: number;
  centerZip?: string;
}

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
// Geographic Radius Matching
// =============================================================================

/**
 * Check if a lead's ZIP code is within the geo-fence defined by a rule's
 * centerZip and radiusMiles using the Haversine formula.
 *
 * Returns a match score:
 *   - 0 if not matched or fields are missing
 *   - 6 (higher than any 5-digit prefix) to give geo rules priority
 *     over prefix rules that only match a few digits
 */
function matchGeoRadius(zipCode: string, rule: GeoAssignmentRule): number {
  if (!rule.radiusMiles || !rule.centerZip || !zipCode) {
    return 0;
  }

  const within = isWithinRadius(zipCode.trim(), rule.centerZip.trim(), rule.radiusMiles);
  // Score 6 = higher than a 5-digit exact ZIP match (5), so geo rules
  // with an explicit radius take precedence when configured.
  return within ? 6 : 0;
}

// =============================================================================
// Round-Robin Distribution
// =============================================================================

/**
 * Select the next rule from a tie-group using atomic round-robin rotation
 * tracked in DynamoDB.
 *
 * DynamoDB key:
 *   PK = ROUNDROBIN#<funnelId>#<priority>
 *   SK = LAST
 *
 * The `lastIndex` attribute is atomically incremented and modded by the
 * group size to produce a deterministic rotation.
 *
 * @param funnelId - The lead's funnel ID
 * @param priority - The shared priority of the tie-group
 * @param tiedRules - Array of rules sharing the same priority
 * @returns The selected rule from the tie-group
 */
async function roundRobinSelect(
  funnelId: string,
  priority: number,
  tiedRules: AssignmentRule[]
): Promise<AssignmentRule> {
  if (tiedRules.length === 1) {
    return tiedRules[0];
  }

  const pk = `ROUNDROBIN#${funnelId}#${priority}`;
  const sk = 'LAST';
  const table = getAssignmentRulesTableName();

  // If no table is configured (e.g. tests), fall back to first rule
  if (!table) {
    return tiedRules[0];
  }

  const doc = getDocClient();

  try {
    const result = await doc.send(
      new UpdateCommand({
        TableName: table,
        Key: { pk, sk },
        UpdateExpression: 'ADD #idx :inc SET #ttl = if_not_exists(#ttl, :ttl)',
        ExpressionAttributeNames: {
          '#idx': 'lastIndex',
          '#ttl': 'ttl',
        },
        ExpressionAttributeValues: {
          ':inc': 1,
          // TTL: 30 days -- counters auto-expire if rules change
          ':ttl': Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        },
        ReturnValues: 'UPDATED_NEW',
      })
    );

    const lastIndex = (result.Attributes?.lastIndex as number) ?? 0;
    const selectedIndex = Math.abs(lastIndex) % tiedRules.length;
    return tiedRules[selectedIndex];
  } catch {
    // If DynamoDB fails, fall back to first rule (priority-based)
    return tiedRules[0];
  }
}

// =============================================================================
// Rule Matching
// =============================================================================

interface ScoredRule {
  rule: GeoAssignmentRule;
  zipMatchScore: number;
}

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

  // Step 2: Score each rule by ZIP match and geo match
  const scoredRules: ScoredRule[] = [];

  for (const rule of applicableRules) {
    const geoRule = rule as GeoAssignmentRule;

    // Try geo radius match first
    const geoScore = matchGeoRadius(zipCode, geoRule);
    if (geoScore > 0) {
      scoredRules.push({ rule: geoRule, zipMatchScore: geoScore });
      continue;
    }

    // Fall back to ZIP prefix matching
    // If the lead has no ZIP code, only match rules with no ZIP patterns
    // (effectively a catch-all rule)
    if (!zipCode || zipCode.trim() === '') {
      if (rule.zipPatterns.length === 0) {
        scoredRules.push({ rule: geoRule, zipMatchScore: 0 });
      }
      continue;
    }

    // If rule has no ZIP patterns, it matches all ZIP codes (catch-all)
    if (rule.zipPatterns.length === 0) {
      scoredRules.push({ rule: geoRule, zipMatchScore: 0 });
      continue;
    }

    const match = matchZipPattern(zipCode, rule.zipPatterns);
    if (match.matched) {
      scoredRules.push({ rule: geoRule, zipMatchScore: match.matchLength });
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
export async function matchLeadToRuleAsync(
  funnelId: string,
  zipCode: string,
  rules: AssignmentRule[]
): Promise<AssignmentRule | null> {
  if (!rules || rules.length === 0) {
    return null;
  }

  // Step 1: Filter to active rules matching this funnelId (or wildcard)
  const applicableRules = rules.filter((rule) => {
    if (!rule.active) {
      return false;
    }
    return rule.funnelId === funnelId || rule.funnelId === '*';
  });

  if (applicableRules.length === 0) {
    return null;
  }

  // Step 2: Score each rule
  const scoredRules: ScoredRule[] = [];

  for (const rule of applicableRules) {
    const geoRule = rule as GeoAssignmentRule;

    const geoScore = matchGeoRadius(zipCode, geoRule);
    if (geoScore > 0) {
      scoredRules.push({ rule: geoRule, zipMatchScore: geoScore });
      continue;
    }

    if (!zipCode || zipCode.trim() === '') {
      if (rule.zipPatterns.length === 0) {
        scoredRules.push({ rule: geoRule, zipMatchScore: 0 });
      }
      continue;
    }

    if (rule.zipPatterns.length === 0) {
      scoredRules.push({ rule: geoRule, zipMatchScore: 0 });
      continue;
    }

    const match = matchZipPattern(zipCode, rule.zipPatterns);
    if (match.matched) {
      scoredRules.push({ rule: geoRule, zipMatchScore: match.matchLength });
    }
  }

  if (scoredRules.length === 0) {
    return null;
  }

  // Step 3: Sort by ZIP match score DESC, then priority ASC
  scoredRules.sort((a, b) => {
    if (b.zipMatchScore !== a.zipMatchScore) {
      return b.zipMatchScore - a.zipMatchScore;
    }
    return a.rule.priority - b.rule.priority;
  });

  // Step 4: Check for round-robin
  const roundRobinEnabled = await isFeatureEnabled('round_robin_enabled');

  if (roundRobinEnabled) {
    // Find the tie-group: rules with the same top score and priority
    const topScore = scoredRules[0].zipMatchScore;
    const topPriority = scoredRules[0].rule.priority;

    const tiedRules = scoredRules
      .filter((s) => s.zipMatchScore === topScore && s.rule.priority === topPriority)
      .map((s) => s.rule);

    if (tiedRules.length > 1) {
      return roundRobinSelect(funnelId, topPriority, tiedRules);
    }
  }

  return scoredRules[0].rule;
}
