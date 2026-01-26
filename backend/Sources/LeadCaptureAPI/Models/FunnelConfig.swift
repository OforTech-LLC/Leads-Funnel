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

// MARK: - Custom Field Config

/// Configuration for a custom field in a funnel
public struct CustomFieldConfig: Content, Sendable {

    /// Field name/identifier
    public let name: String

    /// Display label
    public let label: String

    /// Field type
    public let type: FieldType

    /// Whether the field is required
    public let required: Bool

    /// Placeholder text
    public let placeholder: String?

    /// Default value
    public let defaultValue: String?

    /// Validation pattern (regex)
    public let pattern: String?

    /// Minimum length
    public let minLength: Int?

    /// Maximum length
    public let maxLength: Int?

    /// Options for select/radio fields
    public let options: [FieldOption]?

    /// Help text
    public let helpText: String?

    // MARK: - Field Type

    public enum FieldType: String, Codable, Sendable {
        case text
        case email
        case phone
        case number
        case date
        case select
        case radio
        case checkbox
        case textarea
        case url
        case hidden
    }

    // MARK: - Initialization

    public init(
        name: String,
        label: String,
        type: FieldType = .text,
        required: Bool = false,
        placeholder: String? = nil,
        defaultValue: String? = nil,
        pattern: String? = nil,
        minLength: Int? = nil,
        maxLength: Int? = nil,
        options: [FieldOption]? = nil,
        helpText: String? = nil
    ) {
        self.name = name
        self.label = label
        self.type = type
        self.required = required
        self.placeholder = placeholder
        self.defaultValue = defaultValue
        self.pattern = pattern
        self.minLength = minLength
        self.maxLength = maxLength
        self.options = options
        self.helpText = helpText
    }
}

// MARK: - Field Option

/// Option for select/radio fields
public struct FieldOption: Content, Sendable {
    /// Option value
    public let value: String

    /// Display label
    public let label: String

    /// Whether this is the default selection
    public let isDefault: Bool

    public init(value: String, label: String, isDefault: Bool = false) {
        self.value = value
        self.label = label
        self.isDefault = isDefault
    }
}

// MARK: - Funnel Stats

/// Statistics for a funnel
public struct FunnelStats: Content, Sendable {

    /// Funnel ID
    public let funnelId: String

    /// Total leads captured
    public let totalLeads: Int

    /// Leads captured today
    public let leadsToday: Int

    /// Leads captured this week
    public let leadsThisWeek: Int

    /// Leads captured this month
    public let leadsThisMonth: Int

    /// Conversion rate (if applicable)
    public let conversionRate: Double?

    /// Quarantine rate
    public let quarantineRate: Double

    /// Average spam score
    public let averageSpamScore: Double

    /// Top sources
    public let topSources: [SourceCount]

    /// Stats timestamp
    public let calculatedAt: Date
}

/// Source count for stats
public struct SourceCount: Content, Sendable {
    public let source: String
    public let count: Int
}

// MARK: - Funnel DynamoDB Item

/// DynamoDB item representation of funnel config
public struct FunnelConfigDynamoDBItem: Codable, Sendable {
    public let pk: String
    public let sk: String
    public let entityType: String

    public let funnelId: String
    public let name: String?
    public let description: String?
    public let rateLimitMaxRequests: Int
    public let rateLimitWindowSeconds: Int
    public let spamThreshold: Double
    public let allowedOrigins: [String]
    public let notificationEmail: String?
    public let slackWebhookUrl: String?
    public let redirectUrl: String?
    public let thankYouMessage: String?
    public let requiredFields: [String]
    public let isActive: Bool
    public let tags: [String]
    public let createdAt: String
    public let updatedAt: String

    public init(from config: FunnelConfig) {
        self.pk = config.pk
        self.sk = config.sk
        self.entityType = "FUNNEL_CONFIG"

        self.funnelId = config.funnelId
        self.name = config.name
        self.description = config.description
        self.rateLimitMaxRequests = config.rateLimitMaxRequests
        self.rateLimitWindowSeconds = config.rateLimitWindowSeconds
        self.spamThreshold = config.spamThreshold
        self.allowedOrigins = config.allowedOrigins
        self.notificationEmail = config.notificationEmail
        self.slackWebhookUrl = config.slackWebhookUrl
        self.redirectUrl = config.redirectUrl
        self.thankYouMessage = config.thankYouMessage
        self.requiredFields = config.requiredFields
        self.isActive = config.isActive
        self.tags = config.tags
        self.createdAt = formatISO8601(config.createdAt)
        self.updatedAt = formatISO8601(config.updatedAt)
    }

    public func toFunnelConfig() -> FunnelConfig? {
        guard let createdDate = parseISO8601(createdAt),
              let updatedDate = parseISO8601(updatedAt) else {
            return nil
        }

        return FunnelConfig(
            funnelId: funnelId,
            name: name,
            description: description,
            rateLimitMaxRequests: rateLimitMaxRequests,
            rateLimitWindowSeconds: rateLimitWindowSeconds,
            spamThreshold: spamThreshold,
            allowedOrigins: allowedOrigins,
            notificationEmail: notificationEmail,
            slackWebhookUrl: slackWebhookUrl,
            redirectUrl: redirectUrl,
            thankYouMessage: thankYouMessage,
            requiredFields: requiredFields,
            isActive: isActive,
            tags: tags,
            createdAt: createdDate,
            updatedAt: updatedDate
        )
    }
}
