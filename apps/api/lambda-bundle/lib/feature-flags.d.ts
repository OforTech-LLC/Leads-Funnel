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
import { type FeatureFlagName } from './feature-flag-utils.js';
export type { FeatureFlagName };
/**
 * Check whether a single feature flag is enabled.
 *
 * @param flag - Type-safe flag name
 * @returns true if enabled, false otherwise
 */
export declare function isFeatureEnabled(flag: FeatureFlagName): Promise<boolean>;
/**
 * Return the full set of feature flags.
 * Useful for admin dashboard / debugging endpoints.
 */
export declare function getAllFlags(): Promise<Record<FeatureFlagName, boolean>>;
/**
 * Force-clear the in-memory cache (useful in tests).
 */
export declare function _resetCache(): void;
/**
 * Update a feature flag in SSM and invalidate cache.
 */
export declare function updateFeatureFlag(flag: FeatureFlagName, enabled: boolean): Promise<void>;
