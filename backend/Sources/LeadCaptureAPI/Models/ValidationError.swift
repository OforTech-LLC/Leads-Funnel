// =============================================================================
// ValidationError.swift
// LeadCaptureAPI/Models
// =============================================================================
// Field-level validation error for request validation.
// =============================================================================

import Foundation

// MARK: - Validation Error

/// Simple validation error structure
public struct ValidationError: Sendable {
    public let field: String
    public let message: String

    public init(field: String, message: String) {
        self.field = field
        self.message = message
    }
}
