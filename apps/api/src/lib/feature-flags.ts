/**
 * Feature Flag System
 *
 * Loads feature flags from SSM Parameter Store with 60-second in-memory
 * caching. Designed for 1B req/day throughput -- SSM calls are amortised
 * across thousands of Lambda invocations by the module-level cache.
 *
 * SSM path pattern:  /{project}/{env}/features/{flagName}
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
import {
  FLAG_DEFAULTS,
  normalizeFeatureFlags,
  type FeatureFlagName,
} from './feature-flag-utils.js';

export type { FeatureFlagName };

const log = createLogger('feature-flags');

// ---------------------------------------------------------------------------
// Flag defaults
// ---------------------------------------------------------------------------

const DEFAULT_FLAGS: Readonly<Record<FeatureFlagName, boolean>> = FLAG_DEFAULTS;

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
 * Uses FEATURE_FLAGS_SSM_PREFIX or FEATURE_FLAGS_SSM_PREFIXES when set,
 * otherwise falls back to /{PROJECT_NAME}/{ENVIRONMENT}/features and legacy paths.
 */
function resolveProjectEnv(): { project: string; env: string } {
  const project = process.env.PROJECT_NAME || 'kanjona';
  const env = process.env.ENVIRONMENT || process.env.STAGE || process.env.ENV || 'dev';
  return { project, env };
}

function ssmPrefixes(): string[] {
  const explicit = process.env.FEATURE_FLAGS_SSM_PREFIX?.trim();
  if (explicit) return [explicit];

  const explicitList = process.env.FEATURE_FLAGS_SSM_PREFIXES?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (explicitList && explicitList.length > 0) return explicitList;

  const { project, env } = resolveProjectEnv();
  return [
    `/${project}/${env}/features`,
    `/${project}/${env}/feature-flags`,
    `/${project}/${env}/flags`,
  ];
}

function primarySsmPrefix(): string {
  const prefixes = ssmPrefixes();
  return prefixes[0];
}

/**
 * Load all feature flags from SSM Parameter Store in a single API call
 * using GetParametersByPath.  This is more efficient than N individual
 * GetParameter calls and keeps the 1-second SSM read throughput low.
 */
async function loadFromSsm(): Promise<Record<FeatureFlagName, boolean>> {
  const prefixes = ssmPrefixes();
  const ssm = getSsmClient();
  const rawFlags: Record<string, unknown> = {};

  for (const prefix of prefixes) {
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
        // param.Name is the full path, e.g. /kanjona/dev/features/enable_admin_console
        // Extract the trailing segment as the flag name.
        const name = param.Name?.split('/').pop();
        if (!name || param.Value === undefined) continue;
        if (!(name in rawFlags)) {
          rawFlags[name] = param.Value;
        }
      }

      nextToken = result.NextToken;
    } while (nextToken);
  }

  return normalizeFeatureFlags(rawFlags);
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
  const prefix = primarySsmPrefix();
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
