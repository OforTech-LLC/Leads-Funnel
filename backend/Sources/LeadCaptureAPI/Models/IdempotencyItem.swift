// =============================================================================
// IdempotencyItem.swift
// LeadCaptureAPI/Models
// =============================================================================
// DynamoDB item for idempotency key tracking and duplicate detection.
// =============================================================================

import Foundation
import Shared

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
