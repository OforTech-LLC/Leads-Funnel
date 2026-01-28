// =============================================================================
// BatchLeadRequest.swift
// LeadCaptureAPI/Models
// =============================================================================
// Batch lead creation request and response types.
// =============================================================================

import Foundation
import Vapor

// MARK: - Batch Lead Request

/// Request for creating multiple leads at once
public struct BatchLeadRequest: Content, Validatable {

    /// Array of lead requests
    public let leads: [LeadRequest]

    /// Whether to continue on individual failures
    public let continueOnError: Bool?

    public static func validations(_ validations: inout Validations) {
        validations.add("leads", as: [LeadRequest].self, is: .count(1...100))
    }
}

// MARK: - Batch Lead Response

/// Response for batch lead creation
public struct BatchLeadResponse: Content {
    public let success: Bool
    public let created: Int
    public let failed: Int
    public let results: [BatchLeadResult]
}

// MARK: - Batch Lead Result

/// Individual result in batch response
public struct BatchLeadResult: Content {
    public let index: Int
    public let success: Bool
    public let leadId: String?
    public let error: String?
}
