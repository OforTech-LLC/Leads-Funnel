// =============================================================================
// EventBridgeService.swift
// LeadCaptureAPI/Services
// =============================================================================
// EventBridge operations for publishing lead events.
// =============================================================================

import Foundation
import SotoEventBridge
import SotoCore
import Shared

// MARK: - EventBridge Service

/// Service for publishing events to EventBridge
public actor EventBridgeService {

    // MARK: - Properties

    private let client: EventBridge
    private let eventBusName: String
    private let eventSource: String
    private let config: AppConfig

    // MARK: - Initialization

    public init(client: AWSClient, config: AppConfig = .shared) {
        self.client = EventBridge(client: client, region: .init(rawValue: config.awsRegion))
        self.eventBusName = config.eventBusName
        self.eventSource = config.eventSource
        self.config = config
    }

    // MARK: - Event Publishing

    /// Publish a lead created event
    /// - Parameter lead: The created lead
    public func publishLeadCreated(_ lead: Lead) async throws {
        guard config.eventsEnabled else { return }

        let event = LeadEvent(
            eventType: .created,
            lead: lead,
            metadata: EventMetadata()
        )

        try await publishEvent(event, detailType: LeadEventType.created.detailType)
    }

    /// Publish a lead updated event
    /// - Parameters:
    ///   - lead: The updated lead
    ///   - previousStatus: The previous status
    public func publishLeadUpdated(_ lead: Lead, previousStatus: LeadStatus? = nil) async throws {
        guard config.eventsEnabled else { return }

        var metadata = EventMetadata()
        if let prevStatus = previousStatus {
            metadata.previousStatus = prevStatus.rawValue
        }

        let event = LeadEvent(
            eventType: .updated,
            lead: lead,
            metadata: metadata
        )

        try await publishEvent(event, detailType: LeadEventType.updated.detailType)
    }

    /// Publish a lead quarantined event
    /// - Parameters:
    ///   - lead: The quarantined lead
    ///   - reasons: Quarantine reasons
    public func publishLeadQuarantined(_ lead: Lead, reasons: [String]) async throws {
        guard config.eventsEnabled else { return }

        var metadata = EventMetadata()
        metadata.quarantineReasons = reasons

        let event = LeadEvent(
            eventType: .quarantined,
            lead: lead,
            metadata: metadata
        )

        try await publishEvent(event, detailType: LeadEventType.quarantined.detailType)
    }

    /// Publish a lead status changed event
    /// - Parameters:
    ///   - lead: The lead
    ///   - previousStatus: The previous status
    ///   - newStatus: The new status
    public func publishStatusChanged(
        _ lead: Lead,
        from previousStatus: LeadStatus,
        to newStatus: LeadStatus
    ) async throws {
        guard config.eventsEnabled else { return }

        var metadata = EventMetadata()
        metadata.previousStatus = previousStatus.rawValue
        metadata.newStatus = newStatus.rawValue

        let event = LeadEvent(
            eventType: .statusChanged,
            lead: lead,
            metadata: metadata
        )

        try await publishEvent(event, detailType: LeadEventType.statusChanged.detailType)
    }

    // MARK: - Private Methods

    private func publishEvent<T: Encodable>(_ event: T, detailType: String) async throws {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let detailData = try encoder.encode(event)
        guard let detailString = String(data: detailData, encoding: .utf8) else {
            throw AppError.internalError(message: "Failed to encode event detail")
        }

        let entry = EventBridge.PutEventsRequestEntry(
            detail: detailString,
            detailType: detailType,
            eventBusName: eventBusName,
            source: eventSource,
            time: Date()
        )

        let input = EventBridge.PutEventsRequest(entries: [entry])

        do {
            let response = try await client.putEvents(input)

            if let failedCount = response.failedEntryCount, failedCount > 0 {
                if let entries = response.entries {
                    for entry in entries {
                        if let errorCode = entry.errorCode {
                            throw AppError.eventPublishFailed(
                                underlying: NSError(
                                    domain: "EventBridge",
                                    code: 0,
                                    userInfo: [
                                        NSLocalizedDescriptionKey: errorCode,
                                        "errorMessage": entry.errorMessage ?? "Unknown error"
                                    ]
                                )
                            )
                        }
                    }
                }
            }
        } catch let error as AppError {
            throw error
        } catch {
            throw AppError.eventPublishFailed(underlying: error)
        }
    }
}

// MARK: - Event Types

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
        self.id = lead.id
        self.email = lead.email
        self.name = lead.name
        self.company = lead.company
        self.source = lead.source.rawValue
        self.status = lead.status.rawValue
        self.createdAt = formatISO8601(lead.createdAt)
        self.updatedAt = formatISO8601(lead.updatedAt)
    }
}

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
