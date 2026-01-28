// =============================================================================
// RateLimitItem.swift
// LeadCaptureAPI/Models
// =============================================================================
// DynamoDB item for rate limit tracking.
// =============================================================================

import Foundation
import Shared

// MARK: - Rate Limit Item

/// Rate limit tracking item for DynamoDB
public struct RateLimitItem: DynamoDBItem {
    public let pk: String
    public let sk: String
    public let entityType: String

    /// IP address or identifier being rate limited
    public let identifier: String

    /// Number of requests in current window
    public var requestCount: Int

    /// Window start timestamp (epoch seconds)
    public let windowStart: Int

    /// TTL for automatic cleanup
    public let ttl: Int

    public init(
        identifier: String,
        requestCount: Int = 1,
        windowStart: Date = Date(),
        windowSeconds: Int = 60
    ) {
        let windowStartEpoch = Int(windowStart.timeIntervalSince1970)
        self.pk = "\(EntityType.rateLimit.pkPrefix)\(identifier)"
        self.sk = "\(EntityType.rateLimit.skPrefix)\(windowStartEpoch)"
        self.entityType = EntityType.rateLimit.rawValue
        self.identifier = identifier
        self.requestCount = requestCount
        self.windowStart = windowStartEpoch
        self.ttl = windowStartEpoch + windowSeconds + 60 // Keep for 1 minute after window expires
    }

    /// Check if this window is still valid
    public func isValid(windowSeconds: Int) -> Bool {
        let now = Int(Date().timeIntervalSince1970)
        return now < windowStart + windowSeconds
    }
}
