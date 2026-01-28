/**
 * Feature Flag System
 *
 * Loads feature flags from SSM Parameter Store with 60-second in-memory
 * caching. Designed for 1B req/day throughput -- SSM calls are amortised
 * across thousands of Lambda invocations by the module-level cache.
 *
 * SSM path pattern:  /kanjona/${STAGE}/flags/${flagName}
 *
 * Each flag is stored as a separate SSM parameter so individual flags can
 * be toggled without redeploying.  A single bulk load fetches all flags
 * via GetParametersByPath (one API call) and refreshes the cache.
 *
 * Fail-safe behaviour:
 * - If SSM is unreachable, the last-known cached values are returned.
 * - If no cache exists (cold start + SSM down), safe defaults are used.
 */

import { GetParametersByPathCommand, PutParameterCommand } from '@aws-sdk/client-ssm';
import { getSsmClient } from './clients.js';
import { createLogger } from './logging.js';

const log = createLogger('feature-flags');

// ---------------------------------------------------------------------------
// Flag names & defaults
// ---------------------------------------------------------------------------

/**
 * Exhaustive union of every supported flag name.
 * Keeps callers type-safe -- passing a typo is a compile error.
 */
export type FeatureFlagName =
  | 'billing_enabled'
  | 'calendar_enabled'
  | 'slack_enabled'
  | 'teams_enabled'
  | 'webhooks_enabled'
  | 'lead_scoring_enabled'
  | 'round_robin_enabled'
  | 'enable_ai_analysis'
  | 'enable_admin_console'
  | 'enable_agent_portal'
  | 'enable_assignment'
  | 'enable_notifications'
  | 'enable_email'
  | 'enable_sms'
  | 'enable_twilio'
  | 'enable_waf'
  | 'enable_rate_limiting'
  | 'enable_deduplication'
  | 'enable_debug'
  | 'enable_elevenlabs'
  | 'enable_sns_sms';

/**
 * Fail-safe default values used when SSM is unavailable AND the cache
 * is empty (i.e. Lambda cold-start with no connectivity).
 *
 * Conservative defaults: new/experimental features default OFF,
 * core pipeline features default ON.
 */
const DEFAULT_FLAGS: Readonly<Record<FeatureFlagName, boolean>> = {
  billing_enabled: false,
  calendar_enabled: false,
  slack_enabled: false,
  teams_enabled: false,
  webhooks_enabled: true,
  lead_scoring_enabled: true,
  round_robin_enabled: true,
  enable_ai_analysis: false,
  enable_admin_console: false,
  enable_agent_portal: false,
  enable_assignment: true,
  enable_notifications: true,
  enable_email: true,
  enable_sms: false,
  enable_twilio: false,
  enable_waf: true,
  enable_rate_limiting: true,
  enable_deduplication: true,
  enable_debug: false,
  enable_elevenlabs: false,
  enable_sns_sms: false,
} as const;

/** Full set of recognised flag names for iteration. */
const ALL_FLAG_NAMES: readonly FeatureFlagName[] = Object.keys(DEFAULT_FLAGS) as FeatureFlagName[];

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 60_000; // 60 seconds

interface FlagCache {
  flags: Record<FeatureFlagName, boolean>;
  expiresAt: number;
}

let _cache: FlagCache | null = null;

// ---------------------------------------------------------------------------
// SSM loading
// ---------------------------------------------------------------------------

/**
 * Resolve the SSM path prefix for feature flags.
 *
 * Uses FEATURE_FLAGS_SSM_PREFIX when set explicitly, otherwise falls back
 * to building the path from STAGE (or ENV).
 */
function ssmPrefix(): string {
  if (process.env.FEATURE_FLAGS_SSM_PREFIX) {
    return process.env.FEATURE_FLAGS_SSM_PREFIX;
  }
  const stage = process.env.STAGE || process.env.ENV || 'dev';
  return `/kanjona/${stage}/flags`;
}

/**
 * Load all feature flags from SSM Parameter Store in a single API call
 * using GetParametersByPath.  This is more efficient than N individual
 * GetParameter calls and keeps the 1-second SSM read throughput low.
 */
async function loadFromSsm(): Promise<Record<FeatureFlagName, boolean>> {
  const prefix = ssmPrefix();
  const ssm = getSsmClient();
  const flags: Record<string, boolean> = {};

  let nextToken: string | undefined;
  do {
    const result = await ssm.send(
      new GetParametersByPathCommand({
        Path: prefix,
        Recursive: false,
        WithDecryption: true,
        ...(nextToken ? { NextToken: nextToken } : {}),
      })
    );

    for (const param of result.Parameters ?? []) {
      // param.Name is the full path, e.g. /kanjona/dev/flags/billing_enabled
      // Extract the trailing segment as the flag name.
      const name = param.Name?.split('/').pop();
      if (name && param.Value !== undefined) {
        flags[name] = param.Value === 'true' || param.Value === '1';
      }
    }

    nextToken = result.NextToken;
  } while (nextToken);

  // Merge with defaults so that any flag NOT present in SSM gets its safe
  // default rather than becoming undefined.
  const merged: Record<FeatureFlagName, boolean> = { ...DEFAULT_FLAGS };
  for (const key of ALL_FLAG_NAMES) {
    if (key in flags) {
      merged[key] = flags[key];
    }
  }

  return merged;
}

/**
 * Internal: return all flags with caching.  This is the single code-path
 * used by both `isFeatureEnabled` and `getAllFlags`.
 */
async function resolveFlags(): Promise<Record<FeatureFlagName, boolean>> {
  const now = Date.now();

  // Fast path: cache hit
  if (_cache && now < _cache.expiresAt) {
    return _cache.flags;
  }

  try {
    const flags = await loadFromSsm();
    _cache = { flags, expiresAt: now + CACHE_TTL_MS };
    return flags;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to load feature flags from SSM', {
      errorCode: 'SSM_FLAGS_LOAD_ERROR',
      error: msg,
    });

    // Return stale cache if available (better than nothing)
    if (_cache) {
      log.warn('Returning stale feature flag cache');
      return _cache.flags;
    }

    // Last resort: safe defaults
    log.warn('No cached flags available, returning defaults');
    return { ...DEFAULT_FLAGS };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether a single feature flag is enabled.
 *
 * @param flag - Type-safe flag name
 * @returns true if enabled, false otherwise
 */
export async function isFeatureEnabled(flag: FeatureFlagName): Promise<boolean> {
  const flags = await resolveFlags();
  return flags[flag] ?? DEFAULT_FLAGS[flag] ?? false;
}

/**
 * Return the full set of feature flags.
 * Useful for admin dashboard / debugging endpoints.
 */
export async function getAllFlags(): Promise<Record<FeatureFlagName, boolean>> {
  return resolveFlags();
}

/**
 * Force-clear the in-memory cache (useful in tests).
 */
export function _resetCache(): void {
  _cache = null;
}

/**
 * Update a feature flag in SSM and invalidate cache.
 */
export async function updateFeatureFlag(flag: FeatureFlagName, enabled: boolean): Promise<void> {
  const prefix = ssmPrefix();
  const ssm = getSsmClient();
  const path = `${prefix}/${flag}`;

  await ssm.send(
    new PutParameterCommand({
      Name: path,
      Value: enabled ? 'true' : 'false',
      Type: 'String',
      Overwrite: true,
    })
  );

  _resetCache();
}
