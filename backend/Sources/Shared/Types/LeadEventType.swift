// =============================================================================
// LeadEventType.swift
// Shared/Types
// =============================================================================
// Types of events emitted to EventBridge for lead lifecycle.
// =============================================================================

import Foundation

// MARK: - Lead Event Type

/// Types of events emitted to EventBridge
public enum LeadEventType: String, Codable, Sendable {
    case created = "lead.created"
    case updated = "lead.updated"
    case statusChanged = "lead.status_changed"
    case quarantined = "lead.quarantined"
    case converted = "lead.converted"
    case deleted = "lead.deleted"

    /// EventBridge detail type
    public var detailType: String {
        return rawValue
    }
}
