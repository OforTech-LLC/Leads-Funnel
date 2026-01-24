// =============================================================================
// DynamoDBModels.swift
// LeadCaptureAPI/Models
// =============================================================================
// DynamoDB-specific models for single-table design.
// =============================================================================

import Foundation
import Shared

// MARK: - DynamoDB Item Protocol

/// Protocol for DynamoDB items with pk/sk
public protocol DynamoDBItem: Codable, Sendable {
    var pk: String { get }
    var sk: String { get }
    var entityType: String { get }
}

// MARK: - Lead DynamoDB Item

/// Lead item for DynamoDB storage
public struct LeadDynamoDBItem: DynamoDBItem {
    // Primary keys
    public let pk: String
    public let sk: String
    public let entityType: String

    // GSI keys
    public let gsi1pk: String
    public let gsi1sk: String

    // Lead data
    public let id: String
    public let email: String
    public let name: String?
    public let company: String?
    public let phone: String?
    public let notes: String?
    public let source: String
    public let status: String
    public let quarantineReasons: [String]?
    public let createdAt: String
    public let updatedAt: String
    public let ipAddress: String?
    public let userAgent: String?
    public let metadata: [String: String]?
    public let ttl: Int?

    public init(from lead: Lead) {
        self.pk = lead.pk
        self.sk = lead.sk
        self.entityType = EntityType.lead.rawValue
        self.gsi1pk = lead.gsi1pk
        self.gsi1sk = lead.gsi1sk

        self.id = lead.id
        self.email = lead.email
        self.name = lead.name
        self.company = lead.company
        self.phone = lead.phone
        self.notes = lead.notes
        self.source = lead.source.rawValue
        self.status = lead.status.rawValue
        self.quarantineReasons = lead.quarantineReasons
        self.createdAt = formatISO8601(lead.createdAt)
        self.updatedAt = formatISO8601(lead.updatedAt)
        self.ipAddress = lead.ipAddress
        self.userAgent = lead.userAgent
        self.metadata = lead.metadata
        self.ttl = lead.ttl
    }

    /// Convert back to Lead model
    public func toLead() -> Lead? {
        guard let source = LeadSource(rawValue: source),
              let status = LeadStatus(rawValue: status),
              let createdDate = parseISO8601(createdAt),
              let updatedDate = parseISO8601(updatedAt) else {
            return nil
        }

        return Lead(
            id: id,
            email: email,
            name: name,
            company: company,
            phone: phone,
            notes: notes,
            source: source,
            status: status,
            quarantineReasons: quarantineReasons,
            createdAt: createdDate,
            updatedAt: updatedDate,
            ipAddress: ipAddress,
            userAgent: userAgent,
            metadata: metadata,
            ttl: ttl
        )
    }
}

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

// MARK: - Idempotency Item

/// Idempotency key tracking for duplicate detection
public struct IdempotencyItem: DynamoDBItem {
    public let pk: String
    public let sk: String
    public let entityType: String

    /// The idempotency key
    public let idempotencyKey: String

    /// Lead ID created for this key
    public let leadId: String

    /// Response stored for replay
    public let response: String

    /// HTTP status code of original response
    public let statusCode: Int

    /// Hash of original request body for collision detection
    /// SECURITY: Used to detect when different requests use the same idempotency key
    public let requestHash: String?

    /// Creation timestamp
    public let createdAt: String

    /// TTL for automatic cleanup (24 hours)
    public let ttl: Int

    public init(
        idempotencyKey: String,
        leadId: String,
        response: String,
        statusCode: Int,
        requestHash: String? = nil,
        createdAt: Date = Date()
    ) {
        self.pk = "\(EntityType.idempotency.pkPrefix)\(idempotencyKey)"
        self.sk = "\(EntityType.idempotency.skPrefix)\(idempotencyKey)"
        self.entityType = EntityType.idempotency.rawValue
        self.idempotencyKey = idempotencyKey
        self.leadId = leadId
        self.response = response
        self.statusCode = statusCode
        self.requestHash = requestHash
        self.createdAt = formatISO8601(createdAt)
        self.ttl = Int(createdAt.timeIntervalSince1970) + ValidationLimits.Idempotency.windowSeconds
    }
}

// MARK: - Audit Log Item

/// Audit log entry for tracking changes
public struct AuditLogItem: DynamoDBItem {
    public let pk: String
    public let sk: String
    public let entityType: String

    /// Lead ID this log relates to
    public let leadId: String

    /// Type of action performed
    public let action: String

    /// Actor who performed the action (system, user ID, etc.)
    public let actor: String

    /// Previous state (JSON)
    public let previousState: String?

    /// New state (JSON)
    public let newState: String?

    /// Additional context
    public let context: [String: String]?

    /// Timestamp
    public let timestamp: String

    /// TTL for automatic cleanup (90 days)
    public let ttl: Int

    public init(
        leadId: String,
        action: String,
        actor: String = "system",
        previousState: String? = nil,
        newState: String? = nil,
        context: [String: String]? = nil,
        timestamp: Date = Date()
    ) {
        self.pk = "\(EntityType.auditLog.pkPrefix)\(leadId)"
        self.sk = "\(EntityType.auditLog.skPrefix)\(formatISO8601(timestamp))"
        self.entityType = EntityType.auditLog.rawValue
        self.leadId = leadId
        self.action = action
        self.actor = actor
        self.previousState = previousState
        self.newState = newState
        self.context = context
        self.timestamp = formatISO8601(timestamp)
        self.ttl = Int(timestamp.timeIntervalSince1970) + (90 * 24 * 60 * 60) // 90 days
    }
}
