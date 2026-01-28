// =============================================================================
// APIResponse.swift
// LeadCaptureAPI/Models
// =============================================================================
// Standard API response wrapper and error response types.
// =============================================================================

import Foundation
import Shared

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

// MARK: - API Error Response

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
