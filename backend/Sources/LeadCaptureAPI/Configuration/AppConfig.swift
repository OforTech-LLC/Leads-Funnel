// =============================================================================
// AppConfig.swift
// LeadCaptureAPI/Configuration
// =============================================================================
// Application configuration loaded from environment variables.
// =============================================================================

import Foundation

/// Application configuration
public struct AppConfig: Sendable {

    // MARK: - Singleton

    /// Shared configuration instance
    public static let shared = AppConfig()

    // MARK: - AWS Configuration

    /// AWS region
    public let awsRegion: String

    /// DynamoDB table name
    public let dynamoDBTableName: String

    /// EventBridge event bus name
    public let eventBusName: String

    /// EventBridge source identifier
    public let eventSource: String

    // MARK: - API Configuration

    /// API stage (dev, prod)
    public let apiStage: String

    /// Enable debug logging
    public let debugEnabled: Bool

    /// CORS allowed origins
    public let corsAllowedOrigins: [String]

    // MARK: - Rate Limiting

    /// Enable rate limiting
    public let rateLimitEnabled: Bool

    /// Maximum requests per IP per minute
    public let rateLimitMaxRequests: Int

    /// Rate limit window in seconds
    public let rateLimitWindowSeconds: Int

    // MARK: - Feature Flags

    /// Enable quarantine detection
    public let quarantineEnabled: Bool

    /// Enable EventBridge events
    public let eventsEnabled: Bool

    /// Enable X-Ray tracing
    public let xrayEnabled: Bool

    // MARK: - API Key Authentication

    /// Enable API key authentication
    public let apiKeyEnabled: Bool

    /// Valid API keys (comma-separated in environment)
    public let apiKeys: [String]

    // MARK: - Trusted Proxies

    /// List of trusted proxy IP addresses/CIDR ranges
    /// Only trust X-Forwarded-For from these sources
    public let trustedProxies: [String]

    // MARK: - Initialization

    private init() {
        // AWS Configuration
        self.awsRegion = Self.env("AWS_REGION", default: "us-east-1")
        self.dynamoDBTableName = Self.env("DYNAMODB_TABLE_NAME", default: "kanjona-leads-dev")
        self.eventBusName = Self.env("EVENT_BUS_NAME", default: "kanjona-leads-dev")
        self.eventSource = Self.env("EVENT_SOURCE", default: "com.kanjona.leads")

        // API Configuration
        self.apiStage = Self.env("API_STAGE", default: "dev")
        self.debugEnabled = Self.envBool("DEBUG_ENABLED", default: false)

        // SECURITY: CORS origins - no wildcard default in production
        // In production, CORS_ALLOWED_ORIGINS MUST be explicitly set
        let stage = Self.env("API_STAGE", default: "dev")
        let corsDefault = stage == "prod" ? [] : ["*"]  // Empty = reject all in prod if not configured
        self.corsAllowedOrigins = Self.envArray("CORS_ALLOWED_ORIGINS", default: corsDefault)

        // Rate Limiting
        self.rateLimitEnabled = Self.envBool("RATE_LIMIT_ENABLED", default: true)
        self.rateLimitMaxRequests = Self.envInt("RATE_LIMIT_MAX_REQUESTS", default: 10)
        self.rateLimitWindowSeconds = Self.envInt("RATE_LIMIT_WINDOW_SECONDS", default: 60)

        // Feature Flags
        self.quarantineEnabled = Self.envBool("QUARANTINE_ENABLED", default: true)
        self.eventsEnabled = Self.envBool("EVENTS_ENABLED", default: true)
        self.xrayEnabled = Self.envBool("XRAY_ENABLED", default: false)

        // API Key Authentication
        // SECURITY: API key auth is enabled by default in production
        self.apiKeyEnabled = Self.envBool("API_KEY_ENABLED", default: stage == "prod")
        self.apiKeys = Self.envArray("API_KEYS", default: [])

        // Trusted Proxies
        // SECURITY: Only trust X-Forwarded-For from these IPs
        // In AWS, this should include ALB/ELB IP ranges
        self.trustedProxies = Self.envArray("TRUSTED_PROXIES", default: [
            "127.0.0.1",      // Localhost
            "10.0.0.0/8",     // AWS VPC private range
            "172.16.0.0/12",  // AWS VPC private range
            "192.168.0.0/16"  // AWS VPC private range
        ])
    }

    // MARK: - Environment Helpers

    /// Get environment variable with default
    private static func env(_ key: String, default defaultValue: String) -> String {
        return ProcessInfo.processInfo.environment[key] ?? defaultValue
    }

    /// Get boolean environment variable
    private static func envBool(_ key: String, default defaultValue: Bool) -> Bool {
        guard let value = ProcessInfo.processInfo.environment[key] else {
            return defaultValue
        }
        return ["true", "1", "yes", "on"].contains(value.lowercased())
    }

    /// Get integer environment variable
    private static func envInt(_ key: String, default defaultValue: Int) -> Int {
        guard let value = ProcessInfo.processInfo.environment[key],
              let intValue = Int(value) else {
            return defaultValue
        }
        return intValue
    }

    /// Get array environment variable (comma-separated)
    private static func envArray(_ key: String, default defaultValue: [String]) -> [String] {
        guard let value = ProcessInfo.processInfo.environment[key] else {
            return defaultValue
        }
        return value.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
    }

    // MARK: - Derived Properties

    /// Whether running in production
    public var isProduction: Bool {
        return apiStage == "prod"
    }

    /// Whether running in development
    public var isDevelopment: Bool {
        return apiStage == "dev"
    }

    /// Log level based on configuration
    public var logLevel: String {
        return debugEnabled ? "debug" : "info"
    }
}

// MARK: - CustomStringConvertible

extension AppConfig: CustomStringConvertible {
    public var description: String {
        """
        AppConfig:
          AWS Region: \(awsRegion)
          DynamoDB Table: \(dynamoDBTableName)
          Event Bus: \(eventBusName)
          API Stage: \(apiStage)
          Debug: \(debugEnabled)
          Rate Limiting: \(rateLimitEnabled)
          Quarantine: \(quarantineEnabled)
          Events: \(eventsEnabled)
        """
    }
}
