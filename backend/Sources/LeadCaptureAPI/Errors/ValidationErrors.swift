// =============================================================================
// ValidationErrors.swift
// LeadCaptureAPI/Errors
// =============================================================================
// Builder for collecting multiple validation errors across fields.
// =============================================================================

import Foundation
import Shared

// MARK: - Validation Error Builder

/// Builder for collecting multiple validation errors
public struct ValidationErrors: Sendable {
    private var errors: [(field: String, message: String)] = []

    public init() {}

    public mutating func add(field: String, message: String) {
        errors.append((field, message))
    }

    public var isEmpty: Bool {
        return errors.isEmpty
    }

    public var count: Int {
        return errors.count
    }

    public func toFieldErrors() -> [String: String] {
        var result: [String: String] = [:]
        for error in errors {
            result[error.field] = error.message
        }
        return result
    }

    public func toAppError() -> AppError? {
        guard let first = errors.first else {
            return nil
        }
        return .validationFailed(field: first.field, message: first.message)
    }

    public func toAPIErrorResponse() -> APIErrorResponse? {
        guard !errors.isEmpty else { return nil }
        return APIErrorResponse(
            code: .invalidFormat,
            message: "Validation failed",
            fields: toFieldErrors()
        )
    }
}
