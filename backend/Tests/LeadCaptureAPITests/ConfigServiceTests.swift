// =============================================================================
// ConfigServiceTests.swift
// LeadCaptureAPITests
// =============================================================================
// Tests for ConfigService using Swift Testing framework.
// =============================================================================

import Testing
import Foundation
@testable import LeadCaptureAPI
@testable import Shared

@Suite("Config Service Tests")
struct ConfigServiceTests {

    // MARK: - Initialization Tests

    @Test("Config service initializes without AWS client")
    func initializesWithoutAWSClient() async throws {
        let service = ConfigService()

        // Should be able to get default values
        let value = await service.getValue("rate_limit_max_requests")
        #expect(!value.isEmpty, "Should return default value")
    }

    // MARK: - Default Values Tests

    @Test("Default values are returned when not configured")
    func defaultValuesReturned() async throws {
        let service = ConfigService()

        let rateLimitMax = await service.getValue("rate_limit_max_requests")
        #expect(rateLimitMax == "5", "Should return default rate limit of 5")

        let rateLimitWindow = await service.getValue("rate_limit_window_seconds")
        #expect(rateLimitWindow == "60", "Should return default window of 60")

        let spamThreshold = await service.getValue("spam_threshold")
        #expect(spamThreshold == "0.7", "Should return default spam threshold of 0.7")
    }

    @Test("Unknown parameter returns empty string")
    func unknownParameterReturnsEmpty() async throws {
        let service = ConfigService()

        let value = await service.getValue("unknown_parameter_that_does_not_exist")
        #expect(value.isEmpty, "Unknown parameter should return empty string")
    }

    // MARK: - Feature Flags Tests

    @Test("Voice agent feature is disabled by default")
    func voiceAgentDisabledByDefault() async throws {
        let service = ConfigService()

        let isEnabled = await service.isFeatureEnabled(.voiceAgent)
        #expect(!isEnabled, "Voice agent should be disabled by default")
    }

    @Test("Email notifications feature is enabled by default")
    func emailNotificationsEnabledByDefault() async throws {
        let service = ConfigService()

        let isEnabled = await service.isFeatureEnabled(.emailNotifications)
        #expect(isEnabled, "Email notifications should be enabled by default")
    }

    @Test("Analytics feature is enabled by default")
    func analyticsEnabledByDefault() async throws {
        let service = ConfigService()

        let isEnabled = await service.isFeatureEnabled(.analytics)
        #expect(isEnabled, "Analytics should be enabled by default")
    }

    @Test("Webhooks feature is disabled by default")
    func webhooksDisabledByDefault() async throws {
        let service = ConfigService()

        let isEnabled = await service.isFeatureEnabled(.webhooks)
        #expect(!isEnabled, "Webhooks should be disabled by default")
    }

    @Test("Advanced spam detection is disabled by default")
    func advancedSpamDetectionDisabledByDefault() async throws {
        let service = ConfigService()

        let isEnabled = await service.isFeatureEnabled(.advancedSpamDetection)
        #expect(!isEnabled, "Advanced spam detection should be disabled by default")
    }

    @Test("All feature flags can be retrieved")
    func allFeatureFlagsRetrieved() async throws {
        let service = ConfigService()

        let allFlags = await service.getAllFeatureFlags()

        // Should contain all feature flags
        #expect(allFlags["voice_agent"] != nil, "Should contain voice_agent")
        #expect(allFlags["email_notifications"] != nil, "Should contain email_notifications")
        #expect(allFlags["slack_notifications"] != nil, "Should contain slack_notifications")
        #expect(allFlags["advanced_spam_detection"] != nil, "Should contain advanced_spam_detection")
        #expect(allFlags["webhooks"] != nil, "Should contain webhooks")
        #expect(allFlags["analytics"] != nil, "Should contain analytics")

        // Total count should match enum cases
        #expect(allFlags.count == ConfigService.FeatureFlag.allCases.count,
               "Should have all feature flags")
    }

    // MARK: - Typed Value Tests

    @Test("Get integer value with default")
    func getIntegerValue() async throws {
        let service = ConfigService()

        let value = await service.getInt("rate_limit_max_requests", default: 10)
        #expect(value == 5, "Should return parsed integer from default")

        let unknownValue = await service.getInt("unknown_int", default: 42)
        #expect(unknownValue == 42, "Should return default for unknown parameter")
    }

    @Test("Get double value with default")
    func getDoubleValue() async throws {
        let service = ConfigService()

        let value = await service.getDouble("spam_threshold", default: 0.5)
        #expect(value == 0.7, "Should return parsed double from default")

        let unknownValue = await service.getDouble("unknown_double", default: 3.14)
        #expect(unknownValue == 3.14, "Should return default for unknown parameter")
    }

    @Test("Get boolean value with default")
    func getBooleanValue() async throws {
        let service = ConfigService()

        let trueValue = await service.getBool("honeypot_enabled", default: false)
        #expect(trueValue == true, "Should return parsed boolean from default")

        let unknownValue = await service.getBool("unknown_bool", default: true)
        #expect(unknownValue == true, "Should return default for unknown parameter")
    }

    @Test("Get list value")
    func getListValue() async throws {
        let service = ConfigService()

        let emptyList = await service.getList("unknown_list")
        #expect(emptyList.isEmpty, "Unknown list should return empty array")
    }

    // MARK: - Cache Tests

    @Test("Cache can be invalidated")
    func cacheCanBeInvalidated() async throws {
        let service = ConfigService()

        // Get a value (which may cache it)
        _ = await service.getValue("rate_limit_max_requests")

        // Invalidate cache
        await service.invalidateCache()

        let stats = await service.getCacheStats()
        #expect(stats.size == 0, "Cache should be empty after invalidation")
    }

    @Test("Single cache entry can be invalidated")
    func singleCacheEntryCanBeInvalidated() async throws {
        let service = ConfigService()

        // Get values (which may cache them)
        _ = await service.getValue("rate_limit_max_requests")
        _ = await service.getValue("spam_threshold")

        // Invalidate single entry
        await service.invalidate("rate_limit_max_requests")

        // Other entries should still work
        let value = await service.getValue("spam_threshold")
        #expect(value == "0.7", "Other cached values should still work")
    }

    @Test("Cache stats are accurate")
    func cacheStatsAccurate() async throws {
        let service = ConfigService()

        let initialStats = await service.getCacheStats()
        #expect(initialStats.size == 0, "Initial cache should be empty")
    }

    // MARK: - Funnel Configuration Tests

    @Test("Funnel config uses defaults when not configured")
    func funnelConfigDefaults() async throws {
        let service = ConfigService()

        let config = await service.getFunnelConfig("test-funnel")

        #expect(config.funnelId == "test-funnel", "Funnel ID should match")
        #expect(config.rateLimitMaxRequests > 0, "Rate limit should be positive")
        #expect(config.spamThreshold >= 0 && config.spamThreshold <= 1,
               "Spam threshold should be between 0 and 1")
        #expect(config.isActive, "Funnel should be active by default")
    }

    // MARK: - Parameter Prefix Tests

    @Test("Parameter prefix is built correctly")
    func parameterPrefixBuiltCorrectly() async throws {
        // This test verifies the prefix is constructed from environment variables
        // In tests, these will use defaults
        let service = ConfigService()

        // The service should initialize without error
        // Actual prefix testing would require environment variable setup
        let value = await service.getValue("rate_limit_max_requests")
        #expect(!value.isEmpty, "Service should work with default prefix")
    }

    // MARK: - Feature Flag Parameter Names Tests

    @Test("Feature flag parameter names are correct")
    func featureFlagParameterNames() async throws {
        #expect(ConfigService.FeatureFlag.voiceAgent.parameterName == "feature_voice_agent_enabled")
        #expect(ConfigService.FeatureFlag.emailNotifications.parameterName == "feature_email_notifications_enabled")
        #expect(ConfigService.FeatureFlag.slackNotifications.parameterName == "feature_slack_notifications_enabled")
        #expect(ConfigService.FeatureFlag.advancedSpamDetection.parameterName == "feature_advanced_spam_detection_enabled")
        #expect(ConfigService.FeatureFlag.webhooks.parameterName == "feature_webhooks_enabled")
        #expect(ConfigService.FeatureFlag.analytics.parameterName == "feature_analytics_enabled")
    }

    // MARK: - Concurrent Access Tests

    @Test("Concurrent access is thread-safe")
    func concurrentAccessThreadSafe() async throws {
        let service = ConfigService()

        // Make concurrent reads
        await withTaskGroup(of: String.self) { group in
            for _ in 1...100 {
                group.addTask {
                    return await service.getValue("rate_limit_max_requests")
                }
            }

            var results: [String] = []
            for await result in group {
                results.append(result)
            }

            // All results should be the same
            let uniqueResults = Set(results)
            #expect(uniqueResults.count == 1, "All concurrent reads should return same value")
        }
    }

    @Test("Concurrent feature flag checks are consistent")
    func concurrentFeatureFlagChecks() async throws {
        let service = ConfigService()

        await withTaskGroup(of: Bool.self) { group in
            for _ in 1...100 {
                group.addTask {
                    return await service.isFeatureEnabled(.voiceAgent)
                }
            }

            var results: [Bool] = []
            for await result in group {
                results.append(result)
            }

            // All results should be the same
            let uniqueResults = Set(results)
            #expect(uniqueResults.count == 1, "All concurrent checks should return same value")
        }
    }
}

// MARK: - FunnelConfig Tests

@Suite("Funnel Config Tests")
struct FunnelConfigTests {

    @Test("Funnel config validates correctly")
    func funnelConfigValidation() async throws {
        let config = FunnelConfig.defaultConfig(funnelId: "test")

        let errors = config.validate()
        #expect(errors.isEmpty, "Default config should be valid")
    }

    @Test("Empty funnel ID fails validation")
    func emptyFunnelIdFails() async throws {
        let config = FunnelConfig(funnelId: "")

        let errors = config.validate()
        #expect(errors.contains { $0.contains("Funnel ID") }, "Should fail for empty funnel ID")
    }

    @Test("Invalid rate limit fails validation")
    func invalidRateLimitFails() async throws {
        var config = FunnelConfig.defaultConfig(funnelId: "test")
        config.rateLimitMaxRequests = 0

        var errors = config.validate()
        #expect(errors.contains { $0.contains("Rate limit") }, "Should fail for zero rate limit")

        config.rateLimitMaxRequests = 200
        errors = config.validate()
        #expect(errors.contains { $0.contains("Rate limit") }, "Should fail for rate limit over 100")
    }

    @Test("Invalid spam threshold fails validation")
    func invalidSpamThresholdFails() async throws {
        var config = FunnelConfig.defaultConfig(funnelId: "test")
        config.spamThreshold = 1.5

        var errors = config.validate()
        #expect(errors.contains { $0.contains("Spam threshold") }, "Should fail for threshold > 1")

        config.spamThreshold = -0.5
        errors = config.validate()
        #expect(errors.contains { $0.contains("Spam threshold") }, "Should fail for threshold < 0")
    }

    @Test("Invalid notification email fails validation")
    func invalidNotificationEmailFails() async throws {
        var config = FunnelConfig.defaultConfig(funnelId: "test")
        config.notificationEmail = "invalid-email"

        let errors = config.validate()
        #expect(errors.contains { $0.contains("notification email") }, "Should fail for invalid email")
    }

    @Test("Invalid redirect URL fails validation")
    func invalidRedirectURLFails() async throws {
        var config = FunnelConfig.defaultConfig(funnelId: "test")
        config.redirectUrl = "not-a-url"

        let errors = config.validate()
        #expect(errors.contains { $0.contains("Redirect URL") }, "Should fail for invalid URL")
    }

    @Test("DynamoDB keys are generated correctly")
    func dynamoDBKeysGenerated() async throws {
        let config = FunnelConfig.defaultConfig(funnelId: "my-funnel")

        #expect(config.pk == "FUNNEL#my-funnel", "PK should be correct")
        #expect(config.sk == "CONFIG#my-funnel", "SK should be correct")
    }
}
