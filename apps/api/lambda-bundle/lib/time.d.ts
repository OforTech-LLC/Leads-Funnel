/**
 * Time utilities for rate limiting and TTL calculations
 */
/**
 * Get the current window bucket key (YYYYMMDDHHmm format)
 * Rounded down to the nearest window interval
 */
export declare function getWindowBucket(windowMinutes: number): string;
/**
 * Calculate TTL epoch seconds for rate limit records
 * Expires after window duration plus a small buffer
 */
export declare function getRateLimitTtl(windowMinutes: number): number;
/**
 * Calculate TTL epoch seconds for idempotency records
 */
export declare function getIdempotencyTtl(ttlHours: number): number;
/**
 * Get current ISO timestamp
 */
export declare function getIsoTimestamp(): string;
/**
 * Get elapsed milliseconds since a start time
 */
export declare function getElapsedMs(startTime: number): number;
