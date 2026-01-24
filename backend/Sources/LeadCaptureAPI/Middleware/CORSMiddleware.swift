// =============================================================================
// CORSMiddleware.swift
// LeadCaptureAPI/Middleware
// =============================================================================
// CORS handling for the API.
// =============================================================================

import Foundation
import Vapor

// MARK: - CORS Configuration

/// CORS middleware for handling cross-origin requests
public struct CORSConfiguration: Sendable {
    /// Allowed origins
    public let allowedOrigins: [String]

    /// Allowed methods
    public let allowedMethods: [HTTPMethod]

    /// Allowed headers
    public let allowedHeaders: [String]

    /// Exposed headers
    public let exposedHeaders: [String]

    /// Allow credentials
    public let allowCredentials: Bool

    /// Max age for preflight cache (seconds)
    public let maxAge: Int

    public init(
        allowedOrigins: [String] = ["*"],
        allowedMethods: [HTTPMethod] = [.GET, .POST, .OPTIONS],
        allowedHeaders: [String] = ["Accept", "Content-Type", "X-Request-ID", "Idempotency-Key", "X-API-Key"],
        exposedHeaders: [String] = ["X-Request-ID", "X-RateLimit-Remaining", "X-RateLimit-Reset", "Retry-After"],
        allowCredentials: Bool = false,
        maxAge: Int = 86400
    ) {
        self.allowedOrigins = allowedOrigins
        self.allowedMethods = allowedMethods
        // SECURITY: Don't include Authorization in allowed headers with wildcard origins
        // This prevents credential theft via CORS
        self.allowedHeaders = allowedHeaders
        self.exposedHeaders = exposedHeaders
        self.allowCredentials = allowCredentials
        self.maxAge = maxAge
    }

    /// Create from AppConfig
    public static func fromConfig(_ config: AppConfig) -> CORSConfiguration {
        return CORSConfiguration(
            allowedOrigins: config.corsAllowedOrigins,
            allowCredentials: !config.corsAllowedOrigins.contains("*")
        )
    }
}

// MARK: - CORS Middleware

/// Middleware for handling CORS
public final class CustomCORSMiddleware: Middleware, @unchecked Sendable {
    private let configuration: CORSConfiguration

    public init(configuration: CORSConfiguration) {
        self.configuration = configuration
    }

    public func respond(to request: Request, chainingTo next: Responder) -> EventLoopFuture<Response> {
        // Handle preflight OPTIONS request
        if request.method == .OPTIONS {
            let response = Response(status: .noContent)
            addCORSHeaders(to: response, for: request)
            return request.eventLoop.makeSucceededFuture(response)
        }

        // Process the request and add CORS headers to response
        return next.respond(to: request).map { response in
            self.addCORSHeaders(to: response, for: request)
            return response
        }
    }

    private func addCORSHeaders(to response: Response, for request: Request) {
        let origin = request.headers.first(name: .origin) ?? "*"

        // Check if origin is allowed
        let allowedOrigin: String
        if configuration.allowedOrigins.contains("*") {
            allowedOrigin = "*"
        } else if configuration.allowedOrigins.contains(origin) {
            allowedOrigin = origin
        } else {
            // Origin not allowed, don't add CORS headers
            return
        }

        response.headers.add(name: .accessControlAllowOrigin, value: allowedOrigin)

        if configuration.allowCredentials && allowedOrigin != "*" {
            response.headers.add(name: .accessControlAllowCredentials, value: "true")
        }

        // For preflight requests
        if request.method == .OPTIONS {
            response.headers.add(
                name: .accessControlAllowMethods,
                value: configuration.allowedMethods.map { $0.rawValue }.joined(separator: ", ")
            )
            response.headers.add(
                name: .accessControlAllowHeaders,
                value: configuration.allowedHeaders.joined(separator: ", ")
            )
            response.headers.add(
                name: .accessControlMaxAge,
                value: String(configuration.maxAge)
            )
        }

        // Exposed headers
        if !configuration.exposedHeaders.isEmpty {
            response.headers.add(
                name: "Access-Control-Expose-Headers",
                value: configuration.exposedHeaders.joined(separator: ", ")
            )
        }
    }
}

// MARK: - Vapor Integration

extension Application {
    /// Configure CORS middleware
    public func configureCORS(config: AppConfig = .shared) {
        let corsConfig = CORSConfiguration.fromConfig(config)
        let corsMiddleware = CustomCORSMiddleware(configuration: corsConfig)
        middleware.use(corsMiddleware)
    }
}
