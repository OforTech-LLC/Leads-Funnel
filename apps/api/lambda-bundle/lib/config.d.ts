/**
 * SSM Parameter Store configuration loader with caching.
 *
 * Feature flags and dynamic configuration are stored in SSM
 * and cached for 60 seconds to minimise API calls.
 */
import { type FeatureFlagName } from './feature-flag-utils.js';
/**
 * Load a single SSM parameter value with caching.
 *
 * @param key  Full SSM parameter path, e.g. /kanjona/dev/feature-flags/enable_admin
 * @returns    Decrypted parameter value
 */
export declare function loadConfig(key: string): Promise<string>;
export type FeatureFlags = Record<FeatureFlagName, boolean>;
/**
 * Load all feature flags from SSM.
 * Stored as a single JSON parameter for atomic updates.
 */
export declare function loadFeatureFlags(): Promise<FeatureFlags>;
/**
 * Check if a specific feature flag is enabled.
 */
export declare function isFeatureEnabled(flag: keyof FeatureFlags): Promise<boolean>;
