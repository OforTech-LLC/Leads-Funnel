/**
 * SSM Parameter Store configuration loader with caching.
 *
 * Feature flags and dynamic configuration are stored in SSM
 * and cached for 60 seconds to minimise API calls.
 */

import { GetParameterCommand } from '@aws-sdk/client-ssm';
import { getSsmClient } from './clients.js';

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

export interface FeatureFlags {
  enable_admin_console: boolean;
  enable_agent_portal: boolean;
  enable_assignment: boolean;
  enable_notifications: boolean;
  enable_email: boolean;
  enable_sms: boolean;
  enable_twilio: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  enable_admin_console: false,
  enable_agent_portal: false,
  enable_assignment: true,
  enable_notifications: true,
  enable_email: true,
  enable_sms: false,
  enable_twilio: false,
};

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
    _flagsCache = { flags: { ...DEFAULT_FLAGS }, expiresAt: Date.now() + CONFIG_CACHE_MS };
    return _flagsCache.flags;
  }

  try {
    const raw = await loadConfig(path);
    const parsed = JSON.parse(raw);
    const flags: FeatureFlags = { ...DEFAULT_FLAGS, ...parsed };
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
