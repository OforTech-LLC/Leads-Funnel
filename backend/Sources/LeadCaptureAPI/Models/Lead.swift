// =============================================================================
// Lead.swift
// LeadCaptureAPI/Models
// =============================================================================
// Core Lead model and related DTOs.
// =============================================================================

import Foundation
import Shared

// MARK: - Lead Model

/// Core lead entity
public struct Lead: Codable, Sendable, Equatable {
    /// Unique identifier (UUID v4)
    public let id: String

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

    /// Lead source
    public let source: LeadSource

    /// Current status
    public var status: LeadStatus

    /// Quarantine reasons (if quarantined)
    public var quarantineReasons: [String]?

    /// Creation timestamp
    public let createdAt: Date

    /// Last update timestamp
    public var updatedAt: Date

    /// IP address of submission
    public let ipAddress: String?

    /// User agent of submission
    public let userAgent: String?

    /// Custom metadata
    public var metadata: [String: String]?

    /// Time-to-live for DynamoDB (epoch seconds)
    public var ttl: Int?

    // MARK: - Initialization

    public init(
        id: String = UUID().uuidString.lowercased(),
        email: String,
        name: String? = nil,
        company: String? = nil,
        phone: String? = nil,
        notes: String? = nil,
        source: LeadSource = .website,
        status: LeadStatus = .new,
        quarantineReasons: [String]? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date(),
        ipAddress: String? = nil,
        userAgent: String? = nil,
        metadata: [String: String]? = nil,
        ttl: Int? = nil
    ) {
        self.id = id
        self.email = email.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        self.name = name?.trimmingCharacters(in: .whitespacesAndNewlines)
        self.company = company?.trimmingCharacters(in: .whitespacesAndNewlines)
        self.phone = phone?.trimmingCharacters(in: .whitespacesAndNewlines)
        self.notes = notes?.trimmingCharacters(in: .whitespacesAndNewlines)
        self.source = source
        self.status = status
        self.quarantineReasons = quarantineReasons
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.ipAddress = ipAddress
        self.userAgent = userAgent
        self.metadata = metadata
        self.ttl = ttl
    }

    // MARK: - DynamoDB Keys

    /// Partition key for DynamoDB
    public var pk: String {
        return "\(EntityType.lead.pkPrefix)\(id)"
    }

    /// Sort key for DynamoDB
    public var sk: String {
        return "\(EntityType.lead.skPrefix)\(formatISO8601(createdAt))"
    }

    /// GSI1 partition key (email-based lookup)
    public var gsi1pk: String {
        return "\(EntityType.emailIndex.pkPrefix)\(email)"
    }

    /// GSI1 sort key
    public var gsi1sk: String {
        return "\(EntityType.emailIndex.skPrefix)\(id)"
    }
}

// MARK: - Lead Request DTO

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
            name: name,
            company: company,
            phone: phone,
            notes: notes,
            source: leadSource,
            ipAddress: ipAddress,
            userAgent: userAgent,
            metadata: metadata
        )
    }
}

// MARK: - Lead Response DTO

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
        self.id = lead.id
        self.email = lead.email
        self.name = lead.name
        self.company = lead.company
        self.phone = lead.phone
        self.notes = lead.notes
        self.source = lead.source.rawValue.lowercased()
        self.status = lead.status.rawValue.lowercased()
        self.createdAt = formatISO8601(lead.createdAt)
        self.updatedAt = formatISO8601(lead.updatedAt)
        self.metadata = lead.metadata
    }
}

// MARK: - API Response Wrapper

/// Standard API response wrapper
public struct APIResponse<T: Codable & Sendable>: Codable, Sendable {
    /// Success flag
    public let success: Bool

    /// Response data (on success)
    public let data: T?

    /// Error information (on failure)
    public let error: APIErrorResponse?

    /// Request ID for tracing
    public let requestId: String?

    public init(
        success: Bool,
        data: T? = nil,
        error: APIErrorResponse? = nil,
        requestId: String? = nil
    ) {
        self.success = success
        self.data = data
        self.error = error
        self.requestId = requestId
    }

    /// Create success response
    public static func success(_ data: T, requestId: String? = nil) -> APIResponse {
        return APIResponse(success: true, data: data, requestId: requestId)
    }
}

/// API error response
public struct APIErrorResponse: Codable, Sendable {
    /// Error code
    public let code: String

    /// Human-readable message
    public let message: String

    /// Field-specific errors
    public let fields: [String: String]?

    public init(
        code: APIErrorCode,
        message: String,
        fields: [String: String]? = nil
    ) {
        self.code = code.rawValue
        self.message = message
        self.fields = fields
    }

    public init(
        code: String,
        message: String,
        fields: [String: String]? = nil
    ) {
        self.code = code
        self.message = message
        self.fields = fields
    }
}

// MARK: - Empty Response

/// Empty response for success without data
public struct EmptyResponse: Codable, Sendable {
    public init() {}
}
