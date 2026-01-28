// =============================================================================
// CreateLeadResult.swift
// LeadCaptureAPI/Models
// =============================================================================
// Result type from the LeadService create operation.
// =============================================================================

import Foundation

// MARK: - Create Lead Result

/// Result of creating a lead through LeadService
public struct CreateLeadResult: Sendable {
    /// The created lead (nil if returning cached response)
    public let lead: Lead?

    /// Cached response for idempotent requests
    public let cachedResponse: String?

    /// HTTP status code
    public let statusCode: Int

    /// Whether this is a cached idempotent response
    public let isIdempotent: Bool

    /// Whether the lead was quarantined
    public let isQuarantined: Bool

    /// Quarantine reasons if applicable
    public let quarantineReasons: [String]?

    public init(
        lead: Lead?,
        cachedResponse: String? = nil,
        statusCode: Int = 201,
        isIdempotent: Bool = false,
        isQuarantined: Bool = false,
        quarantineReasons: [String]? = nil
    ) {
        self.lead = lead
        self.cachedResponse = cachedResponse
        self.statusCode = statusCode
        self.isIdempotent = isIdempotent
        self.isQuarantined = isQuarantined
        self.quarantineReasons = quarantineReasons
    }
}
