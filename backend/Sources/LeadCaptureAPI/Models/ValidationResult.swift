// =============================================================================
// ValidationResult.swift
// LeadCaptureAPI/Models
// =============================================================================
// Result of input validation with error details and honeypot detection.
// =============================================================================

import Foundation

// MARK: - Validation Result

/// Result of validation
public struct ValidationResult: Sendable {
    /// Whether the validation passed
    public let isValid: Bool

    /// Validation errors
    public let errors: ValidationErrors

    /// Whether honeypot was triggered
    public let honeypotTriggered: Bool

    public init(isValid: Bool, errors: ValidationErrors, honeypotTriggered: Bool = false) {
        self.isValid = isValid
        self.errors = errors
        self.honeypotTriggered = honeypotTriggered
    }

    /// Get the first error as an AppError
    public func toAppError() -> AppError? {
        if honeypotTriggered {
            return .honeypotTriggered
        }
        return errors.toAppError()
    }

    /// Get API error response
    public func toAPIErrorResponse() -> APIErrorResponse? {
        return errors.toAPIErrorResponse()
    }
}
