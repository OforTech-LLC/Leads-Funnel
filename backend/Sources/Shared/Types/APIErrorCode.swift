// =============================================================================
// APIErrorCode.swift
// Shared/Types
// =============================================================================
// API error codes for client responses with HTTP status mapping.
// =============================================================================

import Foundation

// MARK: - API Error Codes

/// API error codes for client responses
public enum APIErrorCode: String, Codable, Sendable {
    // Validation errors (400)
    case invalidEmail = "INVALID_EMAIL"
    case invalidPhone = "INVALID_PHONE"
    case invalidName = "INVALID_NAME"
    case invalidSource = "INVALID_SOURCE"
    case missingRequiredField = "MISSING_REQUIRED_FIELD"
    case fieldTooLong = "FIELD_TOO_LONG"
    case invalidFormat = "INVALID_FORMAT"

    // Rate limiting (429)
    case rateLimitExceeded = "RATE_LIMIT_EXCEEDED"
    case burstLimitExceeded = "BURST_LIMIT_EXCEEDED"

    // Conflict (409)
    case duplicateLead = "DUPLICATE_LEAD"
    case idempotencyConflict = "IDEMPOTENCY_CONFLICT"

    // Server errors (500)
    case internalError = "INTERNAL_ERROR"
    case databaseError = "DATABASE_ERROR"
    case eventPublishError = "EVENT_PUBLISH_ERROR"

    // Authentication (401/403)
    case unauthorized = "UNAUTHORIZED"
    case forbidden = "FORBIDDEN"

    /// HTTP status code for this error
    public var httpStatus: Int {
        switch self {
        case .invalidEmail, .invalidPhone, .invalidName, .invalidSource,
             .missingRequiredField, .fieldTooLong, .invalidFormat:
            return 400
        case .rateLimitExceeded, .burstLimitExceeded:
            return 429
        case .duplicateLead, .idempotencyConflict:
            return 409
        case .internalError, .databaseError, .eventPublishError:
            return 500
        case .unauthorized:
            return 401
        case .forbidden:
            return 403
        }
    }
}
