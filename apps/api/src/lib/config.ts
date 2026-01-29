/**
 * SSM Parameter Store configuration loader with caching.
 *
 * Feature flags and dynamic configuration are stored in SSM
 * and cached for 60 seconds to minimise API calls.
 */

import { GetParameterCommand } from '@aws-sdk/client-ssm';
import { getSsmClient } from './clients.js';
import { getAllFlags } from './feature-flags.js';
import {
  FLAG_DEFAULTS,
  normalizeFeatureFlags,
  type FeatureFlagName,
} from './feature-flag-utils.js';

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const CONFIG_CACHE_MS = 60 * 1000; // 60 seconds
const cache = new Map<string, CacheEntry>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load a single SSM parameter value with caching.
 *
 * @param key  Full SSM parameter path, e.g. /kanjona/dev/feature-flags/enable_admin
 * @returns    Decrypted parameter value
 */
export async function loadConfig(key: string): Promise<string> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const ssm = getSsmClient();
  const response = await ssm.send(new GetParameterCommand({ Name: key, WithDecryption: true }));

  const value = response.Parameter?.Value || '';
  cache.set(key, { value, expiresAt: Date.now() + CONFIG_CACHE_MS });
  return value;
}

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

export type FeatureFlags = Record<FeatureFlagName, boolean>;

const DEFAULT_FLAGS: FeatureFlags = FLAG_DEFAULTS;

let _flagsCache: { flags: FeatureFlags; expiresAt: number } | null = null;

/**
 * Load all feature flags from SSM.
 * Stored as a single JSON parameter for atomic updates.
 */
export async function loadFeatureFlags(): Promise<FeatureFlags> {
  if (_flagsCache && _flagsCache.expiresAt > Date.now()) {
    return _flagsCache.flags;
  }

  const path = process.env.FEATURE_FLAGS_SSM_PATH || process.env.FEATURE_FLAG_SSM_PATH || '';
  if (!path) {
    const flags = await getAllFlags();
    _flagsCache = { flags, expiresAt: Date.now() + CONFIG_CACHE_MS };
    return flags;
  }

  try {
    const raw = await loadConfig(path);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const flags = normalizeFeatureFlags(parsed || {});
    _flagsCache = { flags, expiresAt: Date.now() + CONFIG_CACHE_MS };
    return flags;
  } catch {
    console.log(
      JSON.stringify({ level: 'warn', message: 'Failed to load feature flags, using defaults' })
    );
    _flagsCache = { flags: { ...DEFAULT_FLAGS }, expiresAt: Date.now() + CONFIG_CACHE_MS };
    return _flagsCache.flags;
  }
}

/**
 * Check if a specific feature flag is enabled.
 */
export async function isFeatureEnabled(flag: keyof FeatureFlags): Promise<boolean> {
  const flags = await loadFeatureFlags();
  return flags[flag] ?? false;
}
