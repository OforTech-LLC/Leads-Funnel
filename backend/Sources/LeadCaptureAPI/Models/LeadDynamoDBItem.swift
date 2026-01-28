// =============================================================================
// LeadDynamoDBItem.swift
// LeadCaptureAPI/Models
// =============================================================================
// DynamoDB item representation for Lead entities.
// =============================================================================

import Foundation
import Shared

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
        self.pk = lead.pk ?? ""
        self.sk = lead.sk ?? ""
        self.entityType = EntityType.lead.rawValue
        self.gsi1pk = lead.gsi1pk ?? ""
        self.gsi1sk = lead.gsi1sk ?? ""

        self.id = lead.id?.uuidString ?? ""
        self.email = lead.email
        self.name = lead.name
        self.company = lead.company
        self.phone = lead.phone
        self.notes = lead.notes
        self.source = lead.source
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
        guard let createdDate = parseISO8601(createdAt),
              let updatedDate = parseISO8601(updatedAt),
              let leadStatus = LeadStatus(rawValue: status) else {
            return nil
        }

        return Lead(
            id: UUID(uuidString: id),
            email: email,
            phone: phone,
            name: name,
            message: notes, // Mapping notes to message
            funnelId: nil, // Not stored in item currently
            status: leadStatus,
            analysis: nil, // Not stored in basic item
            company: company,
            source: source,
            createdAt: createdDate,
            updatedAt: updatedDate,
            metadata: metadata,
            ipAddress: ipAddress,
            userAgent: userAgent,
            quarantineReasons: quarantineReasons,
            notes: notes,
            tags: nil,
            ttl: ttl,
            pk: pk,
            sk: sk,
            gsi1pk: gsi1pk,
            gsi1sk: gsi1sk
        )
    }
}
