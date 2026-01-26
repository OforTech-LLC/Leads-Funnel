// =============================================================================
// RateLimiterService.swift
// LeadCaptureAPI/Services
// =============================================================================
// Rate limiting service with 5 req/min/IP/funnel limiting.
// =============================================================================

import Foundation
import Vapor
import Shared

// MARK: - Rate Limiter Service

/// Service for rate limiting requests per IP and funnel
public actor RateLimiterService {

    // MARK: - Types

    /// Rate limit check result
    public struct RateLimitResult: Sendable {
        /// Whether the request is allowed
        public let allowed: Bool
        /// Current request count in window
        public let count: Int
        /// Seconds until rate limit resets
        public let retryAfter: Int
        /// Maximum allowed requests
        public let limit: Int
        /// Window start timestamp
        public let windowStart: Int
    }

    /// Rate limit entry in cache
    private struct RateLimitEntry: Sendable {
        var count: Int
        let windowStart: Int
        var lastUpdated: Date

        mutating func increment() {
            count += 1
            lastUpdated = Date()
        }

        func isExpired(windowSeconds: Int) -> Bool {
            let windowEnd = windowStart + windowSeconds
            return Int(Date().timeIntervalSince1970) >= windowEnd
        }
    }

    // MARK: - Properties

    private let dynamoDBService: DynamoDBService?
    private let config: AppConfig

    /// In-memory cache for rate limiting
    private var cache: [String: RateLimitEntry] = [:]

    /// Maximum cache size to prevent unbounded growth
    private let maxCacheSize: Int = 10000

    /// Last cleanup timestamp
    private var lastCleanup: Date = Date()

    /// Cleanup interval in seconds
    private let cleanupInterval: TimeInterval = 30

    // MARK: - Initialization

    public init(
        dynamoDBService: DynamoDBService? = nil,
        config: AppConfig = .shared
    ) {
        self.dynamoDBService = dynamoDBService
        self.config = config
    }

    // MARK: - Rate Limiting

    /// Check if a request is allowed under rate limits
    /// - Parameters:
    ///   - identifier: Unique identifier (typically IP:funnelId)
    ///   - maxRequests: Maximum requests allowed in window
    ///   - windowSeconds: Window size in seconds
    /// - Returns: Rate limit result
    public func checkRateLimit(
        identifier: String,
        maxRequests: Int,
        windowSeconds: Int
    ) async -> RateLimitResult {
        // Perform periodic cleanup
        await cleanupIfNeeded()

        let now = Int(Date().timeIntervalSince1970)
        let windowStart = (now / windowSeconds) * windowSeconds
        let retryAfter = windowStart + windowSeconds - now

        // Check local cache first (fast path)
        if let entry = cache[identifier] {
            // Same window?
            if entry.windowStart == windowStart {
                if entry.count >= maxRequests {
                    // Already at limit
                    return RateLimitResult(
                        allowed: false,
                        count: entry.count,
                        retryAfter: max(0, retryAfter),
                        limit: maxRequests,
                        windowStart: windowStart
                    )
                }

                // Increment local count
                var updatedEntry = entry
                updatedEntry.increment()
                cache[identifier] = updatedEntry

                // Fire-and-forget DynamoDB update for durability
                if let dynamoDBService = dynamoDBService {
                    Task.detached(priority: .utility) {
                        _ = try? await dynamoDBService.checkRateLimit(
                            identifier: identifier,
                            maxRequests: maxRequests,
                            windowSeconds: windowSeconds
                        )
                    }
                }

                return RateLimitResult(
                    allowed: true,
                    count: updatedEntry.count,
                    retryAfter: max(0, retryAfter),
                    limit: maxRequests,
                    windowStart: windowStart
                )
            }
        }

        // New window or cache miss - check DynamoDB if available
        if let dynamoDBService = dynamoDBService {
            do {
                let result = try await dynamoDBService.checkRateLimit(
                    identifier: identifier,
                    maxRequests: maxRequests,
                    windowSeconds: windowSeconds
                )

                // Update local cache
                cache[identifier] = RateLimitEntry(
                    count: result.count,
                    windowStart: windowStart,
                    lastUpdated: Date()
                )

                return RateLimitResult(
                    allowed: result.allowed,
                    count: result.count,
                    retryAfter: max(0, result.retryAfter),
                    limit: maxRequests,
                    windowStart: windowStart
                )
            } catch {
                SecureLogger.error("DynamoDB rate limit check failed", error: error)
                // Fall through to local-only rate limiting
            }
        }

        // Local-only rate limiting (no DynamoDB)
        let newEntry = RateLimitEntry(
            count: 1,
            windowStart: windowStart,
            lastUpdated: Date()
        )
        cache[identifier] = newEntry

        return RateLimitResult(
            allowed: true,
            count: 1,
            retryAfter: max(0, retryAfter),
            limit: maxRequests,
            windowStart: windowStart
        )
    }

    /// Check rate limit without incrementing (peek)
    /// - Parameters:
    ///   - identifier: Unique identifier
    ///   - maxRequests: Maximum requests allowed
    ///   - windowSeconds: Window size in seconds
    /// - Returns: Current rate limit status
    public func peekRateLimit(
        identifier: String,
        maxRequests: Int,
        windowSeconds: Int
    ) -> RateLimitResult {
        let now = Int(Date().timeIntervalSince1970)
        let windowStart = (now / windowSeconds) * windowSeconds
        let retryAfter = windowStart + windowSeconds - now

        if let entry = cache[identifier], entry.windowStart == windowStart {
            return RateLimitResult(
                allowed: entry.count < maxRequests,
                count: entry.count,
                retryAfter: max(0, retryAfter),
                limit: maxRequests,
                windowStart: windowStart
            )
        }

        return RateLimitResult(
            allowed: true,
            count: 0,
            retryAfter: max(0, retryAfter),
            limit: maxRequests,
            windowStart: windowStart
        )
    }

    /// Reset rate limit for an identifier
    /// - Parameter identifier: The identifier to reset
    public func reset(identifier: String) {
        cache.removeValue(forKey: identifier)
    }

    /// Clear all rate limit entries
    public func clearAll() {
        cache.removeAll()
    }

    // MARK: - Burst Protection

    /// Check burst rate limit (stricter short-term limit)
    /// - Parameters:
    ///   - identifier: Unique identifier
    ///   - burstLimit: Maximum requests in burst window
    ///   - burstWindowSeconds: Burst window size (typically 5-10 seconds)
    /// - Returns: Whether the request is allowed
    public func checkBurstLimit(
        identifier: String,
        burstLimit: Int = 5,
        burstWindowSeconds: Int = 10
    ) async -> Bool {
        let burstKey = "\(identifier):burst"
        let result = await checkRateLimit(
            identifier: burstKey,
            maxRequests: burstLimit,
            windowSeconds: burstWindowSeconds
        )
        return result.allowed
    }

    // MARK: - Statistics

    /// Get rate limiter statistics
    public func getStats() -> (cacheSize: Int, maxSize: Int) {
        return (cache.count, maxCacheSize)
    }

    /// Get current rate limit status for an identifier
    /// - Parameter identifier: The identifier to check
    /// - Returns: Current count and window info, or nil if not tracked
    public func getStatus(identifier: String) -> (count: Int, windowStart: Int)? {
        guard let entry = cache[identifier] else { return nil }
        return (entry.count, entry.windowStart)
    }

    // MARK: - Private Methods

    /// Perform cleanup if interval has passed
    private func cleanupIfNeeded() async {
        guard Date().timeIntervalSince(lastCleanup) > cleanupInterval else { return }

        lastCleanup = Date()

        // Remove expired entries
        let now = Int(Date().timeIntervalSince1970)
        let windowSeconds = config.rateLimitWindowSeconds

        cache = cache.filter { _, entry in
            let windowEnd = entry.windowStart + windowSeconds
            return now < windowEnd
        }

        // If still over capacity, remove oldest entries
        if cache.count > maxCacheSize {
            let entriesToRemove = cache.count - maxCacheSize + (maxCacheSize / 10)
            let sortedKeys = cache.sorted { $0.value.lastUpdated < $1.value.lastUpdated }
                .prefix(entriesToRemove)
                .map { $0.key }

            for key in sortedKeys {
                cache.removeValue(forKey: key)
            }
        }
    }
}

// MARK: - Vapor Storage Key

public struct RateLimiterServiceKey: Vapor.StorageKey {
    public typealias Value = RateLimiterService
}
