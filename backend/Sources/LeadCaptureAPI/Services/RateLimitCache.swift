// =============================================================================
// RateLimitCache.swift
// LeadCaptureAPI/Services
// =============================================================================
// In-memory cache for rate limiting to reduce DynamoDB calls.
// =============================================================================

import Foundation

// MARK: - Rate Limit Cache

/// Thread-safe in-memory cache for rate limiting
/// Reduces DynamoDB calls by caching rate limit state locally
public actor RateLimitCache {

    // MARK: - Types

    private struct CacheEntry {
        let count: Int
        let windowStart: Int
        let expiresAt: Date

        var isExpired: Bool {
            Date() > expiresAt
        }
    }

    // MARK: - Properties

    /// Cache storage: identifier -> entry
    private var cache: [String: CacheEntry] = [:]

    /// Maximum cache size to prevent unbounded growth
    private let maxCacheSize: Int

    /// Cache TTL in seconds (should match rate limit window)
    private let cacheTTLSeconds: Int

    /// Last cleanup time
    private var lastCleanup: Date = Date()

    /// Cleanup interval in seconds
    private let cleanupIntervalSeconds: TimeInterval = 60

    // MARK: - Singleton

    /// Shared cache instance
    public static let shared = RateLimitCache()

    // MARK: - Initialization

    public init(maxCacheSize: Int = 10000, cacheTTLSeconds: Int = 60) {
        self.maxCacheSize = maxCacheSize
        self.cacheTTLSeconds = cacheTTLSeconds
    }

    // MARK: - Cache Operations

    /// Get cached rate limit count for an identifier
    /// - Parameter identifier: IP address or other identifier
    /// - Returns: Cached count and window start, or nil if not cached/expired
    public func get(identifier: String) -> (count: Int, windowStart: Int)? {
        guard let entry = cache[identifier], !entry.isExpired else {
            return nil
        }
        return (entry.count, entry.windowStart)
    }

    /// Update cached rate limit count
    /// - Parameters:
    ///   - identifier: IP address or other identifier
    ///   - count: Current request count
    ///   - windowStart: Start of the rate limit window
    public func update(identifier: String, count: Int, windowStart: Int) {
        // Periodic cleanup to prevent memory bloat
        if Date().timeIntervalSince(lastCleanup) > cleanupIntervalSeconds {
            cleanup()
        }

        // Evict if at capacity (simple LRU-like eviction)
        if cache.count >= maxCacheSize {
            evictOldest()
        }

        cache[identifier] = CacheEntry(
            count: count,
            windowStart: windowStart,
            expiresAt: Date().addingTimeInterval(TimeInterval(cacheTTLSeconds))
        )
    }

    /// Increment cached count if entry exists
    /// - Parameter identifier: IP address or other identifier
    /// - Returns: New count if entry existed, nil otherwise
    public func increment(identifier: String) -> Int? {
        guard let entry = cache[identifier], !entry.isExpired else {
            return nil
        }

        let newCount = entry.count + 1
        cache[identifier] = CacheEntry(
            count: newCount,
            windowStart: entry.windowStart,
            expiresAt: entry.expiresAt
        )
        return newCount
    }

    /// Invalidate cache entry for an identifier
    /// - Parameter identifier: IP address or other identifier
    public func invalidate(identifier: String) {
        cache.removeValue(forKey: identifier)
    }

    /// Clear all cached entries
    public func clear() {
        cache.removeAll()
    }

    // MARK: - Private Methods

    /// Remove expired entries
    private func cleanup() {
        cache = cache.filter { !$0.value.isExpired }
        lastCleanup = Date()
    }

    /// Evict entries when at capacity using O(n) random sampling
    /// This avoids the O(n log n) cost of sorting the entire cache
    private func evictOldest() {
        let entriesToRemove = max(1, cache.count / 10)
        var removed = 0

        // First pass: remove any expired entries (free cleanup)
        let expiredKeys = cache.filter { $0.value.isExpired }.map { $0.key }
        for key in expiredKeys.prefix(entriesToRemove) {
            cache.removeValue(forKey: key)
            removed += 1
        }

        // If we still need to remove more, use random sampling
        // This is O(n) instead of O(n log n) for sorting
        if removed < entriesToRemove {
            let remainingToRemove = entriesToRemove - removed
            let keys = Array(cache.keys)

            // Sample random keys to remove (probabilistically fair)
            for i in 0..<min(remainingToRemove, keys.count) {
                let randomIndex = Int.random(in: 0..<keys.count)
                let keyToRemove = keys[randomIndex]
                // Prefer removing entries closer to expiration
                if let entry = cache[keyToRemove] {
                    let remainingTTL = entry.expiresAt.timeIntervalSinceNow
                    // Remove if less than half TTL remaining or just remove it
                    if remainingTTL < Double(cacheTTLSeconds) / 2.0 || i >= remainingToRemove / 2 {
                        cache.removeValue(forKey: keyToRemove)
                        removed += 1
                    }
                }
            }
        }

        // Fallback: if still at capacity, just remove first entries found
        if cache.count >= maxCacheSize {
            let keysToRemove = Array(cache.keys.prefix(entriesToRemove - removed))
            for key in keysToRemove {
                cache.removeValue(forKey: key)
            }
        }
    }

    // MARK: - Stats

    /// Current cache size
    public var count: Int {
        cache.count
    }

    /// Cache hit/miss statistics (for monitoring)
    public struct Stats {
        public let size: Int
        public let maxSize: Int
        public let utilizationPercent: Double
    }

    public var stats: Stats {
        Stats(
            size: cache.count,
            maxSize: maxCacheSize,
            utilizationPercent: Double(cache.count) / Double(maxCacheSize) * 100
        )
    }
}
