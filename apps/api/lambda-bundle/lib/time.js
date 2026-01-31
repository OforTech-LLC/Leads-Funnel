/**
 * Time utilities for rate limiting and TTL calculations
 */
/**
 * Get the current window bucket key (YYYYMMDDHHmm format)
 * Rounded down to the nearest window interval
 */
export function getWindowBucket(windowMinutes) {
    const now = new Date();
    const totalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const bucketMinutes = Math.floor(totalMinutes / windowMinutes) * windowMinutes;
    const hours = Math.floor(bucketMinutes / 60);
    const minutes = bucketMinutes % 60;
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hour = String(hours).padStart(2, '0');
    const min = String(minutes).padStart(2, '0');
    return `${year}${month}${day}${hour}${min}`;
}
/**
 * Calculate TTL epoch seconds for rate limit records
 * Expires after window duration plus a small buffer
 */
export function getRateLimitTtl(windowMinutes) {
    const bufferMinutes = 5;
    const ttlSeconds = (windowMinutes + bufferMinutes) * 60;
    return Math.floor(Date.now() / 1000) + ttlSeconds;
}
/**
 * Calculate TTL epoch seconds for idempotency records
 */
export function getIdempotencyTtl(ttlHours) {
    const ttlSeconds = ttlHours * 60 * 60;
    return Math.floor(Date.now() / 1000) + ttlSeconds;
}
/**
 * Get current ISO timestamp
 */
export function getIsoTimestamp() {
    return new Date().toISOString();
}
/**
 * Get elapsed milliseconds since a start time
 */
export function getElapsedMs(startTime) {
    return Date.now() - startTime;
}
//# sourceMappingURL=time.js.map