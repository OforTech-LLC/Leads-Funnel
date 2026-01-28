// =============================================================================
// FunnelConfigDynamoDBItem.swift
// LeadCaptureAPI/Models
// =============================================================================
// DynamoDB item representation of funnel configuration.
// =============================================================================

import Foundation
import Shared

// MARK: - Funnel Config DynamoDB Item

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
