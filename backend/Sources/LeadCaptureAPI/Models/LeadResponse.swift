// =============================================================================
// LeadResponse.swift
// LeadCaptureAPI/Models
// =============================================================================
// Response DTO for lead operations.
// =============================================================================

import Foundation
import Shared

// MARK: - Lead Response

/// Response body for lead operations
public struct LeadResponse: Codable, Sendable {
    /// Lead ID
    public let id: String

    /// Email address
    public let email: String

    /// Full name
    public let name: String?

    /// Company name
    public let company: String?

    /// Phone number
    public let phone: String?

    /// Additional notes
    public let notes: String?

    /// Lead source
    public let source: String

    /// Current status
    public let status: String

    /// Creation timestamp (ISO8601)
    public let createdAt: String

    /// Last update timestamp (ISO8601)
    public let updatedAt: String

    /// Custom metadata
    public let metadata: [String: String]?

    public init(from lead: Lead) {
        self.id = lead.id?.uuidString ?? ""
        self.email = lead.email
        self.name = lead.name
        self.company = lead.company
        self.phone = lead.phone
        self.notes = lead.notes
        self.source = lead.source.lowercased()
        self.status = lead.status.rawValue.lowercased()
        self.createdAt = formatISO8601(lead.createdAt)
        self.updatedAt = formatISO8601(lead.updatedAt)
        self.metadata = lead.metadata
    }
}
