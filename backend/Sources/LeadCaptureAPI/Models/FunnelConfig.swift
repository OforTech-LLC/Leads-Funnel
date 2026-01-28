// =============================================================================
// FunnelConfig.swift
// LeadCaptureAPI/Models
// =============================================================================
// Funnel configuration model for per-funnel settings.
// =============================================================================

import Foundation
import Vapor
import Shared

// MARK: - Funnel Config

/// Configuration for a specific lead capture funnel
public struct FunnelConfig: Content, Sendable {

    // MARK: - Properties

    /// Unique funnel identifier
    public let funnelId: String

    /// Human-readable name
    public var name: String?

    /// Description of the funnel
    public var description: String?

    /// Rate limiting - max requests per IP per window
    public var rateLimitMaxRequests: Int

    /// Rate limiting - window size in seconds
    public var rateLimitWindowSeconds: Int

    /// Spam detection threshold (0.0 - 1.0)
    public var spamThreshold: Double

    /// Allowed origins for CORS
    public var allowedOrigins: [String]

    /// Notification email for new leads
    public var notificationEmail: String?

    /// Slack webhook URL for notifications
    public var slackWebhookUrl: String?

    /// Custom redirect URL after submission
    public var redirectUrl: String?

    /// Custom thank you message
    public var thankYouMessage: String?

    /// Required fields beyond email
    public var requiredFields: [String]

    /// Custom fields to collect
    public var customFields: [CustomFieldConfig]

    /// Whether the funnel is active
    public var isActive: Bool

    /// Tags for categorization
    public var tags: [String]

    /// Created timestamp
    public let createdAt: Date

    /// Updated timestamp
    public var updatedAt: Date

    // MARK: - Initialization

    public init(
        funnelId: String,
        name: String? = nil,
        description: String? = nil,
        rateLimitMaxRequests: Int = 5,
        rateLimitWindowSeconds: Int = 60,
        spamThreshold: Double = 0.7,
        allowedOrigins: [String] = [],
        notificationEmail: String? = nil,
        slackWebhookUrl: String? = nil,
        redirectUrl: String? = nil,
        thankYouMessage: String? = nil,
        requiredFields: [String] = [],
        customFields: [CustomFieldConfig] = [],
        isActive: Bool = true,
        tags: [String] = [],
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.funnelId = funnelId
        self.name = name
        self.description = description
        self.rateLimitMaxRequests = rateLimitMaxRequests
        self.rateLimitWindowSeconds = rateLimitWindowSeconds
        self.spamThreshold = spamThreshold
        self.allowedOrigins = allowedOrigins
        self.notificationEmail = notificationEmail
        self.slackWebhookUrl = slackWebhookUrl
        self.redirectUrl = redirectUrl
        self.thankYouMessage = thankYouMessage
        self.requiredFields = requiredFields
        self.customFields = customFields
        self.isActive = isActive
        self.tags = tags
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    // MARK: - Default Configuration

    /// Default configuration for new funnels
    public static func defaultConfig(funnelId: String) -> FunnelConfig {
        return FunnelConfig(
            funnelId: funnelId,
            name: "Lead Capture Funnel",
            rateLimitMaxRequests: 5,
            rateLimitWindowSeconds: 60,
            spamThreshold: 0.7,
            requiredFields: ["email"],
            isActive: true
        )
    }

    // MARK: - Validation

    /// Validate funnel configuration
    /// - Returns: Array of validation errors
    public func validate() -> [String] {
        var errors: [String] = []

        if funnelId.isEmpty {
            errors.append("Funnel ID is required")
        }

        if rateLimitMaxRequests < 1 || rateLimitMaxRequests > 100 {
            errors.append("Rate limit must be between 1 and 100 requests")
        }

        if rateLimitWindowSeconds < 10 || rateLimitWindowSeconds > 3600 {
            errors.append("Rate limit window must be between 10 and 3600 seconds")
        }

        if spamThreshold < 0 || spamThreshold > 1 {
            errors.append("Spam threshold must be between 0 and 1")
        }

        if let email = notificationEmail, !email.isEmpty {
            if !ValidationLimits.isValidEmail(email) {
                errors.append("Invalid notification email format")
            }
        }

        if let redirectUrl = redirectUrl, !redirectUrl.isEmpty {
            if !redirectUrl.hasPrefix("http://") && !redirectUrl.hasPrefix("https://") {
                errors.append("Redirect URL must be a valid HTTP(S) URL")
            }
        }

        return errors
    }

    // MARK: - DynamoDB Keys

    /// Partition key for DynamoDB
    public var pk: String {
        return "FUNNEL#\(funnelId)"
    }

    /// Sort key for DynamoDB
    public var sk: String {
        return "CONFIG#\(funnelId)"
    }
}
