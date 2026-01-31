/**
 * DynamoDB-backed Distributed Rate Limiter
 *
 * Replaces the in-memory Map-based rate limiter in the admin handler
 * with an atomic DynamoDB counter that works correctly across all
 * Lambda instances.
 *
 * Design:
 *   - Single DynamoDB call per check (atomic ADD + conditional TTL).
 *   - Uses the existing single-table with a composite key:
 *       PK = RATELIMIT#<shard>#<userId>#<windowKey>
 *       SK = LIMIT
 *   - TTL column auto-expires old windows via DynamoDB TTL.
 *   - Supports configurable window sizes (per-minute, per-hour).
 *   - Partition key sharding (Issue #9): A deterministic shard prefix
 *     distributes counters across multiple DynamoDB partitions to avoid
 *     hot-partition throttling at high concurrency.
 *
 * At 1B req/day (~11,500 req/s) each rate-limit check is a single
 * DynamoDB UpdateItem -- well within on-demand capacity limits.
 */
export type RateLimitWindow = 'minute' | 'hour';
export interface RateLimitConfig {
    /** Unique identifier for the entity being limited (userId, IP hash, etc.). */
    userId: string;
    /** Sliding window granularity. */
    window: RateLimitWindow;
    /** Maximum requests allowed within the window. */
    maxRequests: number;
}
export interface RateLimitResult {
    /** Whether the request is allowed. */
    allowed: boolean;
    /** How many requests remain in the current window. */
    remaining: number;
    /** Seconds until the current window expires (present when rate-limited). */
    retryAfter?: number;
}
/**
 * Check and atomically increment a rate-limit counter.
 *
 * A single DynamoDB UpdateItem call handles the read + increment + TTL set
 * in one shot.  The counter is initialised on first access via
 * `if_not_exists`.  TTL is set unconditionally on every write so it is
 * always refreshed to the correct window expiry.
 *
 * Because DynamoDB UpdateItem returns the new attribute values
 * (ReturnValues = UPDATED_NEW), we can compare the count to the limit
 * **after** the write without a separate read.
 *
 * If the count exceeds the limit we still allow the increment to persist
 * (the window will TTL away) but report `allowed: false`.  This avoids
 * a more expensive conditional expression + retry loop while keeping the
 * implementation lock-free and branch-free.
 *
 * Partition key sharding (Issue #9):
 *   PK = RATELIMIT#<shard>#<userId>#<windowKey>
 *   The shard prefix distributes writes across multiple DynamoDB partitions.
 */
export declare function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult>;
/**
 * Check query rate limit: 100 requests per minute per user.
 */
export declare function checkQueryRateLimit(userId: string): Promise<RateLimitResult>;
/**
 * Check export rate limit: 10 requests per hour per user.
 */
export declare function checkExportRateLimit(userId: string): Promise<RateLimitResult>;
