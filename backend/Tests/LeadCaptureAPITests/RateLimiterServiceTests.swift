// =============================================================================
// RateLimiterServiceTests.swift
// LeadCaptureAPITests
// =============================================================================
// Tests for RateLimiterService using Swift Testing framework.
// =============================================================================

import Testing
import Foundation
@testable import LeadCaptureAPI
@testable import Shared

@Suite("Rate Limiter Service Tests")
struct RateLimiterServiceTests {

    // MARK: - Basic Rate Limiting Tests

    @Test("First request is always allowed")
    func firstRequestAllowed() async throws {
        let service = RateLimiterService(dynamoDBService: nil)

        let result = await service.checkRateLimit(
            identifier: "test-ip-\(UUID().uuidString)",
            maxRequests: 5,
            windowSeconds: 60
        )

        #expect(result.allowed, "First request should be allowed")
        #expect(result.count == 1, "Count should be 1")
        #expect(result.limit == 5, "Limit should be 5")
    }

    @Test("Multiple requests within limit are allowed")
    func multipleRequestsWithinLimit() async throws {
        let service = RateLimiterService(dynamoDBService: nil)
        let identifier = "test-ip-\(UUID().uuidString)"

        // Make 4 requests (under limit of 5)
        for i in 1...4 {
            let result = await service.checkRateLimit(
                identifier: identifier,
                maxRequests: 5,
                windowSeconds: 60
            )

            #expect(result.allowed, "Request \(i) should be allowed")
            #expect(result.count == i, "Count should be \(i)")
        }
    }

    @Test("Request exceeding limit is denied")
    func requestExceedingLimitDenied() async throws {
        let service = RateLimiterService(dynamoDBService: nil)
        let identifier = "test-ip-\(UUID().uuidString)"

        // Make 5 requests (at limit)
        for _ in 1...5 {
            let result = await service.checkRateLimit(
                identifier: identifier,
                maxRequests: 5,
                windowSeconds: 60
            )
            #expect(result.allowed)
        }

        // 6th request should be denied
        let result = await service.checkRateLimit(
            identifier: identifier,
            maxRequests: 5,
            windowSeconds: 60
        )

        #expect(!result.allowed, "6th request should be denied")
        #expect(result.retryAfter >= 0, "retryAfter should be non-negative")
    }

    @Test("Different identifiers have separate limits")
    func separateLimitsPerIdentifier() async throws {
        let service = RateLimiterService(dynamoDBService: nil)
        let identifier1 = "test-ip-1-\(UUID().uuidString)"
        let identifier2 = "test-ip-2-\(UUID().uuidString)"

        // Max out identifier1
        for _ in 1...5 {
            _ = await service.checkRateLimit(
                identifier: identifier1,
                maxRequests: 5,
                windowSeconds: 60
            )
        }

        // identifier2 should still be allowed
        let result = await service.checkRateLimit(
            identifier: identifier2,
            maxRequests: 5,
            windowSeconds: 60
        )

        #expect(result.allowed, "Different identifier should have separate limit")
        #expect(result.count == 1, "Count should be 1 for new identifier")
    }

    // MARK: - Peek Rate Limit Tests

    @Test("Peek does not increment counter")
    func peekDoesNotIncrement() async throws {
        let service = RateLimiterService(dynamoDBService: nil)
        let identifier = "test-ip-\(UUID().uuidString)"

        // Make one request
        _ = await service.checkRateLimit(
            identifier: identifier,
            maxRequests: 5,
            windowSeconds: 60
        )

        // Peek multiple times
        let peek1 = await service.peekRateLimit(
            identifier: identifier,
            maxRequests: 5,
            windowSeconds: 60
        )
        let peek2 = await service.peekRateLimit(
            identifier: identifier,
            maxRequests: 5,
            windowSeconds: 60
        )
        let peek3 = await service.peekRateLimit(
            identifier: identifier,
            maxRequests: 5,
            windowSeconds: 60
        )

        #expect(peek1.count == 1, "Peek should show count of 1")
        #expect(peek2.count == 1, "Second peek should still show 1")
        #expect(peek3.count == 1, "Third peek should still show 1")
    }

    @Test("Peek on unknown identifier returns zero count")
    func peekUnknownIdentifier() async throws {
        let service = RateLimiterService(dynamoDBService: nil)
        let identifier = "unknown-\(UUID().uuidString)"

        let result = await service.peekRateLimit(
            identifier: identifier,
            maxRequests: 5,
            windowSeconds: 60
        )

        #expect(result.allowed, "Unknown identifier should be allowed")
        #expect(result.count == 0, "Count should be 0 for unknown identifier")
    }

    // MARK: - Reset Tests

    @Test("Reset clears rate limit for identifier")
    func resetClearsRateLimit() async throws {
        let service = RateLimiterService(dynamoDBService: nil)
        let identifier = "test-ip-\(UUID().uuidString)"

        // Max out the limit
        for _ in 1...5 {
            _ = await service.checkRateLimit(
                identifier: identifier,
                maxRequests: 5,
                windowSeconds: 60
            )
        }

        // Verify denied
        var result = await service.checkRateLimit(
            identifier: identifier,
            maxRequests: 5,
            windowSeconds: 60
        )
        #expect(!result.allowed, "Should be denied before reset")

        // Reset
        await service.reset(identifier: identifier)

        // Should be allowed again
        result = await service.checkRateLimit(
            identifier: identifier,
            maxRequests: 5,
            windowSeconds: 60
        )
        #expect(result.allowed, "Should be allowed after reset")
        #expect(result.count == 1, "Count should be 1 after reset")
    }

    @Test("Clear all resets all identifiers")
    func clearAllResetsEverything() async throws {
        let service = RateLimiterService(dynamoDBService: nil)

        // Make requests for multiple identifiers
        for i in 1...3 {
            let identifier = "test-ip-\(i)-\(UUID().uuidString.prefix(8))"
            _ = await service.checkRateLimit(
                identifier: identifier,
                maxRequests: 5,
                windowSeconds: 60
            )
        }

        // Verify stats show entries
        let statsBefore = await service.getStats()
        #expect(statsBefore.cacheSize >= 3, "Should have at least 3 entries")

        // Clear all
        await service.clearAll()

        // Verify cleared
        let statsAfter = await service.getStats()
        #expect(statsAfter.cacheSize == 0, "Should have 0 entries after clear")
    }

    // MARK: - Burst Protection Tests

    @Test("Burst limit is enforced")
    func burstLimitEnforced() async throws {
        let service = RateLimiterService(dynamoDBService: nil)
        let identifier = "test-ip-\(UUID().uuidString)"

        // Make requests up to burst limit
        for i in 1...5 {
            let result = await service.checkBurstLimit(
                identifier: identifier,
                burstLimit: 5,
                burstWindowSeconds: 10
            )
            #expect(result, "Request \(i) should be allowed within burst limit")
        }

        // 6th request should be denied
        let result = await service.checkBurstLimit(
            identifier: identifier,
            burstLimit: 5,
            burstWindowSeconds: 10
        )
        #expect(!result, "6th burst request should be denied")
    }

    // MARK: - Statistics Tests

    @Test("Statistics are accurate")
    func statisticsAccurate() async throws {
        let service = RateLimiterService(dynamoDBService: nil)

        let statsBefore = await service.getStats()
        #expect(statsBefore.cacheSize == 0, "Initial cache should be empty")

        // Add some entries
        for i in 1...5 {
            let identifier = "stats-test-\(i)-\(UUID().uuidString.prefix(8))"
            _ = await service.checkRateLimit(
                identifier: identifier,
                maxRequests: 10,
                windowSeconds: 60
            )
        }

        let statsAfter = await service.getStats()
        #expect(statsAfter.cacheSize == 5, "Should have 5 entries")
        #expect(statsAfter.maxSize == 10000, "Max size should be 10000")
    }

    @Test("Get status returns correct info")
    func getStatusReturnsCorrectInfo() async throws {
        let service = RateLimiterService(dynamoDBService: nil)
        let identifier = "test-ip-\(UUID().uuidString)"

        // No status initially
        let statusBefore = await service.getStatus(identifier: identifier)
        #expect(statusBefore == nil, "Should have no status initially")

        // Make a request
        _ = await service.checkRateLimit(
            identifier: identifier,
            maxRequests: 5,
            windowSeconds: 60
        )

        // Check status
        let statusAfter = await service.getStatus(identifier: identifier)
        #expect(statusAfter != nil, "Should have status after request")
        #expect(statusAfter?.count == 1, "Count should be 1")
    }

    // MARK: - Concurrent Access Tests

    @Test("Concurrent requests are handled correctly")
    func concurrentRequests() async throws {
        let service = RateLimiterService(dynamoDBService: nil)
        let identifier = "concurrent-test-\(UUID().uuidString)"

        // Make concurrent requests
        await withTaskGroup(of: Bool.self) { group in
            for _ in 1...10 {
                group.addTask {
                    let result = await service.checkRateLimit(
                        identifier: identifier,
                        maxRequests: 5,
                        windowSeconds: 60
                    )
                    return result.allowed
                }
            }

            var allowedCount = 0
            var deniedCount = 0

            for await allowed in group {
                if allowed {
                    allowedCount += 1
                } else {
                    deniedCount += 1
                }
            }

            // Exactly 5 should be allowed
            #expect(allowedCount == 5, "Exactly 5 requests should be allowed")
            #expect(deniedCount == 5, "Exactly 5 requests should be denied")
        }
    }

    // MARK: - IP + Funnel Combination Tests

    @Test("IP and funnel combination creates unique key")
    func ipFunnelCombination() async throws {
        let service = RateLimiterService(dynamoDBService: nil)
        let ip = "192.168.1.1"
        let funnel1 = "funnel-a"
        let funnel2 = "funnel-b"

        let key1 = "\(ip):\(funnel1)"
        let key2 = "\(ip):\(funnel2)"

        // Max out key1
        for _ in 1...5 {
            _ = await service.checkRateLimit(
                identifier: key1,
                maxRequests: 5,
                windowSeconds: 60
            )
        }

        // key2 should still be allowed
        let result = await service.checkRateLimit(
            identifier: key2,
            maxRequests: 5,
            windowSeconds: 60
        )

        #expect(result.allowed, "Different funnel should have separate limit")
    }
}
