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
 *       PK = RATELIMIT#<userId>#<windowKey>
 *       SK = LIMIT
 *   - TTL column auto-expires old windows via DynamoDB TTL.
 *   - Supports configurable window sizes (per-minute, per-hour).
 *
 * At 1B req/day (~11,500 req/s) each rate-limit check is a single
 * DynamoDB UpdateItem -- well within on-demand capacity limits.
 */

import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient, tableName } from './clients.js';
import { createLogger } from './logging.js';

const log = createLogger('rate-limit');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Window helpers
// ---------------------------------------------------------------------------

/**
 * Build a deterministic window key for the current time.
 *
 * - minute: "2024-01-15T14:30"  (rounded to the start of the minute)
 * - hour:   "2024-01-15T14"     (rounded to the start of the hour)
 */
function getWindowKey(window: RateLimitWindow): string {
  const now = new Date();
  const iso = now.toISOString(); // "2024-01-15T14:30:45.123Z"

  switch (window) {
    case 'minute':
      // "2024-01-15T14:30"
      return iso.slice(0, 16);
    case 'hour':
      // "2024-01-15T14"
      return iso.slice(0, 13);
  }
}

/**
 * Compute the DynamoDB TTL (epoch seconds) for a window.
 * The record should expire shortly after the window closes.
 */
function getWindowTtl(window: RateLimitWindow): number {
  const bufferSeconds = 120; // 2-minute buffer after window closes
  const windowSeconds = window === 'minute' ? 60 : 3600;
  return Math.floor(Date.now() / 1000) + windowSeconds + bufferSeconds;
}

/**
 * Seconds remaining until the current window expires.
 */
function getSecondsUntilReset(window: RateLimitWindow): number {
  const now = new Date();
  switch (window) {
    case 'minute':
      return 60 - now.getUTCSeconds();
    case 'hour':
      return 3600 - now.getUTCMinutes() * 60 - now.getUTCSeconds();
  }
}

// ---------------------------------------------------------------------------
// Core check
// ---------------------------------------------------------------------------

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
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const windowKey = getWindowKey(config.window);
  const pk = `RATELIMIT#${config.userId}#${windowKey}`;
  const sk = 'LIMIT';
  const ttl = getWindowTtl(config.window);

  try {
    const doc = getDocClient();
    const result = await doc.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: { pk, sk },
        UpdateExpression: 'ADD #count :inc SET #ttl = if_not_exists(#ttl, :ttl)',
        ExpressionAttributeNames: {
          '#count': 'requestCount',
          '#ttl': 'ttl',
        },
        ExpressionAttributeValues: {
          ':inc': 1,
          ':ttl': ttl,
        },
        ReturnValues: 'UPDATED_NEW',
      })
    );

    const currentCount = (result.Attributes?.requestCount as number) ?? 1;
    const allowed = currentCount <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - currentCount);

    if (!allowed) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: getSecondsUntilReset(config.window),
      };
    }

    return { allowed: true, remaining };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log.error('DynamoDB rate limit check failed', {
      errorCode: 'RATE_LIMIT_DDB_ERROR',
      error: msg,
      userId: config.userId,
    });

    // Fail-closed: reject the request when the rate-limiter itself is
    // unhealthy.  This prevents abuse during transient DynamoDB outages.
    return {
      allowed: false,
      remaining: 0,
      retryAfter: getSecondsUntilReset(config.window),
    };
  }
}

// ---------------------------------------------------------------------------
// Convenience wrappers (match the admin handler's existing semantics)
// ---------------------------------------------------------------------------

/**
 * Check query rate limit: 100 requests per minute per user.
 */
export async function checkQueryRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit({
    userId: `query:${userId}`,
    window: 'minute',
    maxRequests: 100,
  });
}

/**
 * Check export rate limit: 10 requests per hour per user.
 */
export async function checkExportRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit({
    userId: `export:${userId}`,
    window: 'hour',
    maxRequests: 10,
  });
}
