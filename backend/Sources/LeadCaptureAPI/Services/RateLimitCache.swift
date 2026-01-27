// =============================================================================
// RateLimitCache.swift
// LeadCaptureAPI/Services
// =============================================================================
// In-memory cache for rate limiting with O(1) LRU eviction.
// Uses a doubly linked list + hash map for constant time operations.
// =============================================================================

import Foundation

// MARK: - Doubly Linked List Node

/// Node for the doubly linked list used in LRU cache
private final class CacheNode {
    let key: String
    var count: Int
    var windowStart: Int
    var expiresAt: Date
    var prev: CacheNode?
    var next: CacheNode?

    init(key: String, count: Int, windowStart: Int, expiresAt: Date) {
        self.key = key
        self.count = count
        self.windowStart = windowStart
        self.expiresAt = expiresAt
    }

    var isExpired: Bool {
        Date() > expiresAt
    }
}

// MARK: - Rate Limit Cache

/// Thread-safe in-memory LRU cache for rate limiting
/// Uses doubly linked list + hash map for O(1) operations:
/// - O(1) get
/// - O(1) put/update
/// - O(1) eviction (LRU)
public actor RateLimitCache {

    // MARK: - Properties

    /// Hash map for O(1) key lookup
    private var cache: [String: CacheNode] = [:]

    /// Dummy head node (most recently used is after head)
    private let head: CacheNode

    /// Dummy tail node (least recently used is before tail)
    private let tail: CacheNode

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

        // Initialize dummy head and tail nodes for the doubly linked list
        // This simplifies edge case handling
        self.head = CacheNode(key: "", count: 0, windowStart: 0, expiresAt: Date.distantFuture)
        self.tail = CacheNode(key: "", count: 0, windowStart: 0, expiresAt: Date.distantFuture)
        head.next = tail
        tail.prev = head
    }

    // MARK: - Linked List Operations (O(1))

    /// Remove a node from the linked list - O(1)
    private func removeNode(_ node: CacheNode) {
        let prev = node.prev
        let next = node.next
        prev?.next = next
        next?.prev = prev
        node.prev = nil
        node.next = nil
    }

    /// Add a node right after head (most recently used) - O(1)
    private func addToFront(_ node: CacheNode) {
        node.prev = head
        node.next = head.next
        head.next?.prev = node
        head.next = node
    }

    /// Move an existing node to front (mark as most recently used) - O(1)
    private func moveToFront(_ node: CacheNode) {
        removeNode(node)
        addToFront(node)
    }

    /// Remove the least recently used node (before tail) - O(1)
    private func removeLRU() -> CacheNode? {
        guard let lru = tail.prev, lru !== head else {
            return nil
        }
        removeNode(lru)
        return lru
    }

    // MARK: - Cache Operations

    /// Get cached rate limit count for an identifier - O(1)
    /// - Parameter identifier: IP address or other identifier
    /// - Returns: Cached count and window start, or nil if not cached/expired
    public func get(identifier: String) -> (count: Int, windowStart: Int)? {
        guard let node = cache[identifier] else {
            return nil
        }

        // Check if expired
        if node.isExpired {
            // Remove expired entry - O(1)
            removeNode(node)
            cache.removeValue(forKey: identifier)
            return nil
        }

        // Move to front (mark as recently used) - O(1)
        moveToFront(node)

        return (node.count, node.windowStart)
    }

    /// Update cached rate limit count - O(1)
    /// - Parameters:
    ///   - identifier: IP address or other identifier
    ///   - count: Current request count
    ///   - windowStart: Start of the rate limit window
    public func update(identifier: String, count: Int, windowStart: Int) {
        // Periodic cleanup to prevent memory bloat
        if Date().timeIntervalSince(lastCleanup) > cleanupIntervalSeconds {
            cleanup()
        }

        let expiresAt = Date().addingTimeInterval(TimeInterval(cacheTTLSeconds))

        if let existingNode = cache[identifier] {
            // Update existing entry - O(1)
            existingNode.count = count
            existingNode.windowStart = windowStart
            existingNode.expiresAt = expiresAt
            moveToFront(existingNode)
        } else {
            // Add new entry - O(1)
            let newNode = CacheNode(
                key: identifier,
                count: count,
                windowStart: windowStart,
                expiresAt: expiresAt
            )

            cache[identifier] = newNode
            addToFront(newNode)

            // Evict LRU if at capacity - O(1)
            if cache.count > maxCacheSize {
                if let lru = removeLRU() {
                    cache.removeValue(forKey: lru.key)
                }
            }
        }
    }

    /// Increment cached count if entry exists - O(1)
    /// - Parameter identifier: IP address or other identifier
    /// - Returns: New count if entry existed, nil otherwise
    public func increment(identifier: String) -> Int? {
        guard let node = cache[identifier] else {
            return nil
        }

        if node.isExpired {
            // Remove expired entry - O(1)
            removeNode(node)
            cache.removeValue(forKey: identifier)
            return nil
        }

        node.count += 1
        moveToFront(node)
        return node.count
    }

    /// Invalidate cache entry for an identifier - O(1)
    /// - Parameter identifier: IP address or other identifier
    public func invalidate(identifier: String) {
        if let node = cache[identifier] {
            removeNode(node)
            cache.removeValue(forKey: identifier)
        }
    }

    /// Clear all cached entries - O(n) but only called on reset
    public func clear() {
        cache.removeAll()
        head.next = tail
        tail.prev = head
    }

    // MARK: - Private Methods

    /// Remove expired entries - O(n) but called infrequently
    /// This scans the entire list but only runs every cleanupIntervalSeconds
    private func cleanup() {
        var current = head.next
        while let node = current, node !== tail {
            let next = node.next
            if node.isExpired {
                removeNode(node)
                cache.removeValue(forKey: node.key)
            }
            current = next
        }
        lastCleanup = Date()
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
