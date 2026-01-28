// =============================================================================
// LeadEvent.swift
// LeadCaptureAPI/Models
// =============================================================================
// Event payload types for EventBridge lead events.
// =============================================================================

import Foundation
import Shared

// MARK: - Lead Event

/// Lead event payload for EventBridge
public struct LeadEvent: Codable, Sendable {
    /// Event type
    public let eventType: String

    /// Event version for schema evolution
    public let version: String

    /// Timestamp
    public let timestamp: String

    /// Lead data
    public let lead: LeadEventData

    /// Additional metadata
    public let metadata: EventMetadata

    public init(eventType: LeadEventType, lead: Lead, metadata: EventMetadata) {
        self.eventType = eventType.rawValue
        self.version = "1.0"
        self.timestamp = formatISO8601(Date())
        self.lead = LeadEventData(from: lead)
        self.metadata = metadata
    }
}

// MARK: - Lead Event Data

/// Lead data for event payload
public struct LeadEventData: Codable, Sendable {
    public let id: String
    public let email: String
    public let name: String?
    public let company: String?
    public let source: String
    public let status: String
    public let createdAt: String
    public let updatedAt: String

    public init(from lead: Lead) {
        self.id = lead.id?.uuidString ?? ""
        self.email = lead.email
        self.name = lead.name
        self.company = lead.company
        self.source = lead.source
        self.status = lead.status.rawValue
        self.createdAt = formatISO8601(lead.createdAt)
        self.updatedAt = formatISO8601(lead.updatedAt)
    }
}

// MARK: - Event Metadata

/// Event metadata
public struct EventMetadata: Codable, Sendable {
    public var previousStatus: String?
    public var newStatus: String?
    public var quarantineReasons: [String]?
    public var requestId: String?
    public var ipAddress: String?

    public init(
        previousStatus: String? = nil,
        newStatus: String? = nil,
        quarantineReasons: [String]? = nil,
        requestId: String? = nil,
        ipAddress: String? = nil
    ) {
        self.previousStatus = previousStatus
        self.newStatus = newStatus
        self.quarantineReasons = quarantineReasons
        self.requestId = requestId
        self.ipAddress = ipAddress
    }
}
