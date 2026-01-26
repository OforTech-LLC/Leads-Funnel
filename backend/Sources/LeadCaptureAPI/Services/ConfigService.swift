// =============================================================================
// ConfigService.swift
// LeadCaptureAPI/Services
// =============================================================================
// SSM Parameter Store configuration with 60-second caching.
// =============================================================================

import Foundation
import Vapor
import SotoSSM
import SotoCore
import Shared

// MARK: - Config Service

/// Service for loading configuration from AWS SSM Parameter Store with caching
public actor ConfigService {

    // MARK: - Types

    /// Feature flags that can be toggled
    public enum FeatureFlag: String, CaseIterable, Sendable {
        case voiceAgent = "voice_agent"
        case emailNotifications = "email_notifications"
        case slackNotifications = "slack_notifications"
        case advancedSpamDetection = "advanced_spam_detection"
        case webhooks = "webhooks"
        case analytics = "analytics"

        /// SSM parameter name for this feature
        public var parameterName: String {
            return "feature_\(rawValue)_enabled"
        }
    }

    /// Configuration parameter types
    public enum ConfigParameter: String, Sendable {
        // Rate limiting
        case rateLimitMaxRequests = "rate_limit_max_requests"
        case rateLimitWindowSeconds = "rate_limit_window_seconds"

        // Spam detection
        case spamThreshold = "spam_threshold"
        case honeypotEnabled = "honeypot_enabled"

        // Notifications
        case notificationEmail = "notification_email"
        case slackWebhookUrl = "slack_webhook_url"

        // Feature flags
        case voiceAgentEnabled = "feature_voice_agent_enabled"
        case webhooksEnabled = "feature_webhooks_enabled"

        // API configuration
        case corsAllowedOrigins = "cors_allowed_origins"
        case apiKeyRequired = "api_key_required"
    }

    /// Cached configuration value
    private struct CachedValue: Sendable {
        let value: String
        let fetchedAt: Date

        func isExpired(ttlSeconds: Int) -> Bool {
            return Date().timeIntervalSince(fetchedAt) > TimeInterval(ttlSeconds)
        }
    }

    // MARK: - Properties

    private let ssmClient: SSM?
    private let config: AppConfig
    private let parameterPrefix: String
    private let cacheTTLSeconds: Int

    /// In-memory cache for configuration values
    private var cache: [String: CachedValue] = [:]

    /// Default values for configuration parameters
    private let defaults: [String: String] = [
        "rate_limit_max_requests": "5",
        "rate_limit_window_seconds": "60",
        "spam_threshold": "0.7",
        "honeypot_enabled": "true",
        "feature_voice_agent_enabled": "false",
        "feature_email_notifications_enabled": "true",
        "feature_slack_notifications_enabled": "false",
        "feature_advanced_spam_detection_enabled": "false",
        "feature_webhooks_enabled": "false",
        "feature_analytics_enabled": "true",
        "api_key_required": "true"
    ]

    // MARK: - Initialization

    public init(
        awsClient: AWSClient?,
        config: AppConfig = .shared,
        cacheTTLSeconds: Int = 60
    ) {
        if let client = awsClient {
            self.ssmClient = SSM(client: client, region: .init(rawValue: config.awsRegion))
        } else {
            self.ssmClient = nil
        }
        self.config = config
        self.cacheTTLSeconds = cacheTTLSeconds

        // Build parameter prefix from environment
        let project = ProcessInfo.processInfo.environment["PROJECT"] ?? "kanjona"
        let environment = ProcessInfo.processInfo.environment["ENVIRONMENT"] ?? config.apiStage
        self.parameterPrefix = "/\(project)/\(environment)/"
    }

    /// Initialize without AWS client (uses defaults only)
    public init(config: AppConfig = .shared) {
        self.ssmClient = nil
        self.config = config
        self.cacheTTLSeconds = 60

        let project = ProcessInfo.processInfo.environment["PROJECT"] ?? "kanjona"
        let environment = ProcessInfo.processInfo.environment["ENVIRONMENT"] ?? config.apiStage
        self.parameterPrefix = "/\(project)/\(environment)/"
    }

    // MARK: - Feature Flags

    /// Check if a feature flag is enabled
    /// - Parameter feature: The feature to check
    /// - Returns: True if enabled
    public func isFeatureEnabled(_ feature: FeatureFlag) -> Bool {
        let value = getValue(feature.parameterName)
        return value.lowercased() == "true" || value == "1"
    }

    /// Get all feature flag states
    /// - Returns: Dictionary of feature flag states
    public func getAllFeatureFlags() -> [String: Bool] {
        var flags: [String: Bool] = [:]
        for feature in FeatureFlag.allCases {
            flags[feature.rawValue] = isFeatureEnabled(feature)
        }
        return flags
    }

    // MARK: - Configuration Values

    /// Get a configuration value with caching
    /// - Parameter parameter: The parameter to fetch
    /// - Returns: The parameter value or default
    public func getValue(_ parameter: String) -> String {
        // Check cache first
        if let cached = cache[parameter], !cached.isExpired(ttlSeconds: cacheTTLSeconds) {
            return cached.value
        }

        // Return default if no SSM client
        return defaults[parameter] ?? ""
    }

    /// Get a configuration value asynchronously from SSM
    /// - Parameter parameter: The parameter to fetch
    /// - Returns: The parameter value
    public func getValueAsync(_ parameter: String) async -> String {
        // Check cache first
        if let cached = cache[parameter], !cached.isExpired(ttlSeconds: cacheTTLSeconds) {
            return cached.value
        }

        // Fetch from SSM
        guard let ssmClient = ssmClient else {
            return defaults[parameter] ?? ""
        }

        let fullParameterName = parameterPrefix + parameter

        do {
            let request = SSM.GetParameterRequest(
                name: fullParameterName,
                withDecryption: true
            )

            let response = try await ssmClient.getParameter(request)

            if let value = response.parameter?.value {
                // Cache the value
                cache[parameter] = CachedValue(value: value, fetchedAt: Date())
                return value
            }
        } catch {
            SecureLogger.error("Failed to fetch SSM parameter", error: error, metadata: [
                "parameter": parameter
            ])
        }

        // Return default on error
        return defaults[parameter] ?? ""
    }

    /// Get an integer configuration value
    /// - Parameters:
    ///   - parameter: The parameter to fetch
    ///   - defaultValue: Default value if not found or invalid
    /// - Returns: The integer value
    public func getInt(_ parameter: String, default defaultValue: Int) async -> Int {
        let stringValue = await getValueAsync(parameter)
        return Int(stringValue) ?? defaultValue
    }

    /// Get a double configuration value
    /// - Parameters:
    ///   - parameter: The parameter to fetch
    ///   - defaultValue: Default value if not found or invalid
    /// - Returns: The double value
    public func getDouble(_ parameter: String, default defaultValue: Double) async -> Double {
        let stringValue = await getValueAsync(parameter)
        return Double(stringValue) ?? defaultValue
    }

    /// Get a boolean configuration value
    /// - Parameters:
    ///   - parameter: The parameter to fetch
    ///   - defaultValue: Default value if not found
    /// - Returns: The boolean value
    public func getBool(_ parameter: String, default defaultValue: Bool) async -> Bool {
        let stringValue = await getValueAsync(parameter)
        if stringValue.isEmpty {
            return defaultValue
        }
        return stringValue.lowercased() == "true" || stringValue == "1"
    }

    /// Get a list configuration value (comma-separated)
    /// - Parameter parameter: The parameter to fetch
    /// - Returns: Array of values
    public func getList(_ parameter: String) async -> [String] {
        let stringValue = await getValueAsync(parameter)
        if stringValue.isEmpty {
            return []
        }
        return stringValue.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
    }

    // MARK: - Batch Loading

    /// Load multiple parameters at once for efficiency
    /// - Parameter parameters: List of parameter names to load
    public func loadParameters(_ parameters: [String]) async {
        guard let ssmClient = ssmClient else { return }

        let fullNames = parameters.map { parameterPrefix + $0 }

        do {
            let request = SSM.GetParametersRequest(
                names: fullNames,
                withDecryption: true
            )

            let response = try await ssmClient.getParameters(request)

            // Cache all fetched values
            for param in response.parameters ?? [] {
                if let name = param.name, let value = param.value {
                    // Remove prefix to get the short name
                    let shortName = name.replacingOccurrences(of: parameterPrefix, with: "")
                    cache[shortName] = CachedValue(value: value, fetchedAt: Date())
                }
            }

            // Log invalid parameters
            for invalid in response.invalidParameters ?? [] {
                SecureLogger.warning("Invalid SSM parameter", metadata: ["parameter": invalid])
            }

        } catch {
            SecureLogger.error("Failed to batch fetch SSM parameters", error: error)
        }
    }

    // MARK: - Cache Management

    /// Invalidate the entire cache
    public func invalidateCache() {
        cache.removeAll()
    }

    /// Invalidate a specific cache entry
    /// - Parameter parameter: The parameter to invalidate
    public func invalidate(_ parameter: String) {
        cache.removeValue(forKey: parameter)
    }

    /// Get cache statistics
    public func getCacheStats() -> (size: Int, oldestEntry: Date?) {
        let oldest = cache.values.min(by: { $0.fetchedAt < $1.fetchedAt })?.fetchedAt
        return (cache.count, oldest)
    }

    // MARK: - Funnel Configuration

    /// Load funnel-specific configuration
    /// - Parameter funnelId: The funnel ID
    /// - Returns: Funnel configuration
    public func getFunnelConfig(_ funnelId: String) async -> FunnelConfig {
        let prefix = "funnel_\(funnelId)_"

        // Load funnel-specific parameters
        let parameters = [
            "\(prefix)rate_limit",
            "\(prefix)spam_threshold",
            "\(prefix)allowed_origins",
            "\(prefix)notification_email"
        ]

        await loadParameters(parameters)

        return FunnelConfig(
            funnelId: funnelId,
            rateLimitMaxRequests: await getInt("\(prefix)rate_limit", default: config.rateLimitMaxRequests),
            rateLimitWindowSeconds: config.rateLimitWindowSeconds,
            spamThreshold: await getDouble("\(prefix)spam_threshold", default: 0.7),
            allowedOrigins: await getList("\(prefix)allowed_origins"),
            notificationEmail: await getValueAsync("\(prefix)notification_email"),
            isActive: true
        )
    }
}

// MARK: - Vapor Storage Key

public struct ConfigServiceKey: Vapor.StorageKey {
    public typealias Value = ConfigService
}
