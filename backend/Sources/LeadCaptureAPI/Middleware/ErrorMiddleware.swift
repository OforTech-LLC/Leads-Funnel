// =============================================================================
// ErrorMiddleware.swift
// LeadCaptureAPI/Middleware
// =============================================================================
// Custom error handling middleware.
// =============================================================================

import Foundation
import Vapor
import Shared

// MARK: - Error Middleware

/// Custom error middleware for consistent error responses
public final class CustomErrorMiddleware: Middleware, @unchecked Sendable {

    private let config: AppConfig

    public init(config: AppConfig = .shared) {
        self.config = config
    }

    public func respond(to request: Request, chainingTo next: Responder) -> EventLoopFuture<Response> {
        return next.respond(to: request).flatMapError { error in
            self.handleError(error, for: request)
        }
    }

    private func handleError(_ error: Error, for request: Request) -> EventLoopFuture<Response> {
        let requestId = request.headers.first(name: "X-Request-ID") ?? UUID().uuidString

        // Log the error
        request.logger.error("Request failed", metadata: [
            "requestId": .string(requestId),
            "error": .string(String(describing: error)),
            "path": .string(request.url.path)
        ])

        // Build error response
        let (status, body) = buildErrorResponse(error, requestId: requestId)

        do {
            let response = Response(status: status)
            response.headers.contentType = .json
            response.body = try .init(data: JSONEncoder().encode(body))
            return request.eventLoop.makeSucceededFuture(response)
        } catch {
            // Fallback if encoding fails
            let response = Response(status: .internalServerError)
            response.body = .init(string: "{\"success\":false,\"error\":{\"code\":\"INTERNAL_ERROR\",\"message\":\"An unexpected error occurred\"}}")
            response.headers.contentType = .json
            return request.eventLoop.makeSucceededFuture(response)
        }
    }

    private func buildErrorResponse(_ error: Error, requestId: String) -> (HTTPResponseStatus, APIResponse<EmptyResponse>) {
        switch error {
        case let appError as AppError:
            return buildAppErrorResponse(appError, requestId: requestId)

        case let abortError as AbortError:
            return buildAbortErrorResponse(abortError, requestId: requestId)

        case let decodingError as DecodingError:
            return buildDecodingErrorResponse(decodingError, requestId: requestId)

        default:
            return buildGenericErrorResponse(error, requestId: requestId)
        }
    }

    private func buildAppErrorResponse(_ error: AppError, requestId: String) -> (HTTPResponseStatus, APIResponse<EmptyResponse>) {
        let status = error.status

        // SECURITY: Honeypot returns 201 Created with fake lead data
        // This makes it indistinguishable from a real successful submission
        // to prevent bot authors from detecting the honeypot
        if case .honeypotTriggered = error {
            return (.created, APIResponse(
                success: true,
                data: EmptyResponse(),
                requestId: requestId
            ))
        }

        let errorResponse = APIErrorResponse(
            code: error.errorCode,
            message: config.isProduction ? sanitizeMessage(error.reason) : error.reason
        )

        return (status, APIResponse(
            success: false,
            data: nil,
            error: errorResponse,
            requestId: requestId
        ))
    }

    private func buildAbortErrorResponse(_ error: AbortError, requestId: String) -> (HTTPResponseStatus, APIResponse<EmptyResponse>) {
        let errorCode: APIErrorCode
        switch error.status {
        case .badRequest:
            errorCode = .invalidFormat
        case .unauthorized:
            errorCode = .unauthorized
        case .forbidden:
            errorCode = .forbidden
        case .notFound:
            errorCode = .internalError
        case .tooManyRequests:
            errorCode = .rateLimitExceeded
        default:
            errorCode = .internalError
        }

        let errorResponse = APIErrorResponse(
            code: errorCode,
            message: config.isProduction ? "Request failed" : error.reason
        )

        return (error.status, APIResponse(
            success: false,
            data: nil,
            error: errorResponse,
            requestId: requestId
        ))
    }

    private func buildDecodingErrorResponse(_ error: DecodingError, requestId: String) -> (HTTPResponseStatus, APIResponse<EmptyResponse>) {
        let message: String

        switch error {
        case .keyNotFound(let key, _):
            message = "Missing required field: \(key.stringValue)"
        case .typeMismatch(let type, let context):
            message = "Invalid type for field '\(context.codingPath.map { $0.stringValue }.joined(separator: "."))': expected \(type)"
        case .valueNotFound(let type, let context):
            message = "Missing value for field '\(context.codingPath.map { $0.stringValue }.joined(separator: "."))': expected \(type)"
        case .dataCorrupted(let context):
            message = config.isProduction ? "Invalid request format" : "Data corrupted: \(context.debugDescription)"
        @unknown default:
            message = "Invalid request format"
        }

        let errorResponse = APIErrorResponse(
            code: .invalidFormat,
            message: message
        )

        return (.badRequest, APIResponse(
            success: false,
            data: nil,
            error: errorResponse,
            requestId: requestId
        ))
    }

    private func buildGenericErrorResponse(_ error: Error, requestId: String) -> (HTTPResponseStatus, APIResponse<EmptyResponse>) {
        let errorResponse = APIErrorResponse(
            code: .internalError,
            message: config.isProduction ? "An unexpected error occurred" : error.localizedDescription
        )

        return (.internalServerError, APIResponse(
            success: false,
            data: nil,
            error: errorResponse,
            requestId: requestId
        ))
    }

    /// Sanitize error messages for production (remove sensitive details)
    private func sanitizeMessage(_ message: String) -> String {
        // Remove potential sensitive information patterns
        var sanitized = message

        // Remove IP addresses
        let ipPattern = #"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}"#
        if let regex = try? NSRegularExpression(pattern: ipPattern) {
            sanitized = regex.stringByReplacingMatches(
                in: sanitized,
                range: NSRange(sanitized.startIndex..., in: sanitized),
                withTemplate: "[REDACTED]"
            )
        }

        // Remove file paths
        let pathPattern = #"(/[a-zA-Z0-9_.-]+)+"#
        if let regex = try? NSRegularExpression(pattern: pathPattern) {
            sanitized = regex.stringByReplacingMatches(
                in: sanitized,
                range: NSRange(sanitized.startIndex..., in: sanitized),
                withTemplate: "[PATH]"
            )
        }

        return sanitized
    }
}

// MARK: - Vapor Integration

extension Application {
    /// Configure custom error middleware
    public func configureErrorHandling(config: AppConfig = .shared) {
        // Remove default error middleware
        middleware = Middlewares()

        // Add custom error middleware first (to catch all errors)
        middleware.use(CustomErrorMiddleware(config: config))
    }
}
