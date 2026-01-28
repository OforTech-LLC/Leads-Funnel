// =============================================================================
// CreateLeadRequest.swift
// LeadCaptureAPI/Models
// =============================================================================
// Request DTO for creating a lead through the service layer.
// =============================================================================

import Foundation
import Shared

// MARK: - Create Lead Request

/// Request body for creating a lead
public struct CreateLeadRequest: Codable, Sendable {
    /// Email address (required)
    public let email: String

    /// Full name
    public let name: String?

    /// Company name
    public let company: String?

    /// Phone number
    public let phone: String?

    /// Additional notes or message
    public let notes: String?

    /// Lead source (defaults to website)
    public let source: String?

    /// Custom metadata
    public let metadata: [String: String]?

    /// Honeypot field (should be empty)
    public let website: String?

    public init(
        email: String,
        name: String? = nil,
        company: String? = nil,
        phone: String? = nil,
        notes: String? = nil,
        source: String? = nil,
        metadata: [String: String]? = nil,
        website: String? = nil
    ) {
        self.email = email
        self.name = name
        self.company = company
        self.phone = phone
        self.notes = notes
        self.source = source
        self.metadata = metadata
        self.website = website
    }

    /// Convert to Lead model
    public func toLead(
        ipAddress: String? = nil,
        userAgent: String? = nil
    ) -> Lead {
        let leadSource = source.flatMap { LeadSource(string: $0) } ?? .website

        return Lead(
            email: email,
            phone: phone,
            name: name,
            message: notes, // Mapping notes to message as primary text field
            funnelId: nil,
            status: .new,
            analysis: nil,
            company: company,
            source: leadSource.rawValue, // Convert enum to string
            createdAt: Date(),
            updatedAt: Date(),
            metadata: metadata,
            ipAddress: ipAddress,
            userAgent: userAgent,
            quarantineReasons: nil,
            notes: notes // Also keep in notes field
        )
    }
}
