// =============================================================================
// AppError.swift
// LeadCaptureAPI/Errors
// =============================================================================
// Application-specific error types and handling.
// =============================================================================

import Foundation
import Vapor
import Shared

// MARK: - App Error

/// Application-specific errors
public enum AppError: Error, Sendable {
    // Validation errors
    case validationFailed(field: String, message: String)
    case missingRequiredField(String)
    case invalidEmail(String)
    case invalidPhone(String)
    case fieldTooLong(field: String, maxLength: Int)

    // Rate limiting
    case rateLimitExceeded(retryAfter: Int)
    case burstLimitExceeded

    // Duplicate/conflict
    case duplicateLead(existingId: String)
    case idempotencyConflict(existingResponse: String)
    case idempotencyCollision(key: String)

    // Authentication
    case unauthorized(message: String)
    case invalidApiKey

    // Not found
    case leadNotFound(id: String)

    // Database errors
    case databaseError(underlying: Error)
    case conditionalCheckFailed

    // Event errors
    case eventPublishFailed(underlying: Error)

    // Quarantine
    case leadQuarantined(reasons: [String])

    // Generic
    case internalError(message: String)
    case honeypotTriggered
}

// MARK: - AbortError Conformance

extension AppError: AbortError {
    public var status: HTTPResponseStatus {
        switch self {
        case .validationFailed, .missingRequiredField, .invalidEmail, .invalidPhone, .fieldTooLong:
            return .badRequest
        case .rateLimitExceeded, .burstLimitExceeded:
            return .tooManyRequests
        case .duplicateLead, .idempotencyConflict, .idempotencyCollision:
            return .conflict
        case .unauthorized, .invalidApiKey:
            return .unauthorized
        case .leadNotFound:
            return .notFound
        case .databaseError, .conditionalCheckFailed, .eventPublishFailed, .internalError:
            return .internalServerError
        case .leadQuarantined:
            return .ok // Still return 200 but with quarantine flag
        case .honeypotTriggered:
            return .ok // Silently accept but don't process
        }
    }

    public var reason: String {
        switch self {
        case .validationFailed(let field, let message):
            return "Validation failed for '\(field)': \(message)"
        case .missingRequiredField(let field):
            return "Missing required field: \(field)"
        case .invalidEmail(let email):
            return "Invalid email address: \(email)"
        case .invalidPhone(let phone):
            return "Invalid phone number: \(phone)"
        case .fieldTooLong(let field, let maxLength):
            return "Field '\(field)' exceeds maximum length of \(maxLength)"
        case .rateLimitExceeded(let retryAfter):
            return "Rate limit exceeded. Try again in \(retryAfter) seconds"
        case .burstLimitExceeded:
            return "Too many requests. Please slow down"
        case .duplicateLead(let existingId):
            return "A lead with this email already exists (ID: \(existingId))"
        case .idempotencyConflict:
            return "A request with this idempotency key was already processed"
        case .idempotencyCollision(let key):
            return "Idempotency key '\(key)' was used with different request data"
        case .unauthorized(let message):
            return message
        case .invalidApiKey:
            return "Invalid or missing API key"
        case .leadNotFound(let id):
            return "Lead not found: \(id)"
        case .databaseError(let underlying):
            return "Database error: \(underlying.localizedDescription)"
        case .conditionalCheckFailed:
            return "Concurrent modification detected"
        case .eventPublishFailed(let underlying):
            return "Failed to publish event: \(underlying.localizedDescription)"
        case .leadQuarantined(let reasons):
            return "Lead flagged for review: \(reasons.joined(separator: ", "))"
        case .internalError(let message):
            return message
        case .honeypotTriggered:
            return "Thank you for your submission"
        }
    }

    public var headers: HTTPHeaders {
        switch self {
        case .rateLimitExceeded(let retryAfter):
            return HTTPHeaders([("Retry-After", String(retryAfter))])
        default:
            return HTTPHeaders()
        }
    }
}

// MARK: - Error Code Mapping

extension AppError {
    /// Get the API error code for this error
    public var errorCode: APIErrorCode {
        switch self {
        case .validationFailed:
            return .invalidFormat
        case .missingRequiredField:
            return .missingRequiredField
        case .invalidEmail:
            return .invalidEmail
        case .invalidPhone:
            return .invalidPhone
        case .fieldTooLong:
            return .fieldTooLong
        case .rateLimitExceeded:
            return .rateLimitExceeded
        case .burstLimitExceeded:
            return .burstLimitExceeded
        case .duplicateLead:
            return .duplicateLead
        case .idempotencyConflict, .idempotencyCollision:
            return .idempotencyConflict
        case .unauthorized, .invalidApiKey:
            return .unauthorized
        case .leadNotFound:
            return .internalError
        case .databaseError, .conditionalCheckFailed:
            return .databaseError
        case .eventPublishFailed:
            return .eventPublishError
        case .leadQuarantined, .honeypotTriggered, .internalError:
            return .internalError
        }
    }

    /// Convert to API error response
    public func toAPIResponse(requestId: String? = nil) -> APIResponse<EmptyResponse> {
        let errorResponse = APIErrorResponse(
            code: errorCode,
            message: reason
        )
        return APIResponse(
            success: false,
            data: nil,
            error: errorResponse,
            requestId: requestId
        )
    }
}

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
