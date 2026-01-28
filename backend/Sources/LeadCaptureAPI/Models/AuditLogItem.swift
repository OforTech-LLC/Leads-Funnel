// =============================================================================
// AuditLogItem.swift
// LeadCaptureAPI/Models
// =============================================================================
// DynamoDB item for audit log entries tracking changes.
// =============================================================================

import Foundation
import Shared

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
