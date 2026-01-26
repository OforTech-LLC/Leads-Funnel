// =============================================================================
// OriginValidationMiddleware.swift
// LeadCaptureAPI/Middleware
// =============================================================================
// Validate request origins to prevent unauthorized API usage.
// =============================================================================

import Foundation
import Vapor

// MARK: - Origin Validation Middleware

/// Middleware to validate request origins against allowed list
public final class OriginValidationMiddleware: Middleware, @unchecked Sendable {

    // MARK: - Properties

    private let config: AppConfig
    private let allowedOrigins: Set<String>
    private let allowedReferers: Set<String>
    private let strictMode: Bool

    /// Paths that bypass origin validation (health checks, webhooks)
    private let bypassPaths: Set<String> = [
        "/health",
        "/health/live",
        "/health/ready",
        "/health/detailed",
        "/voice/webhook/status",
        "/voice/webhook/recording"
    ]

    // MARK: - Initialization

    public init(
        config: AppConfig = .shared,
        strictMode: Bool = false
    ) {
        self.config = config
        self.strictMode = strictMode

        // Build allowed origins set
        var origins = Set(config.corsAllowedOrigins)

        // Always allow localhost in development
        if config.isDevelopment {
            origins.insert("http://localhost:3000")
            origins.insert("http://localhost:8080")
            origins.insert("http://127.0.0.1:3000")
            origins.insert("http://127.0.0.1:8080")
        }

        self.allowedOrigins = origins

        // Build allowed referers from origins
        self.allowedReferers = Set(origins.map { origin in
            origin.hasSuffix("/") ? origin : origin + "/"
        })
    }

    // MARK: - Middleware

    public func respond(to request: Request, chainingTo next: Responder) -> EventLoopFuture<Response> {
        // Skip validation for bypass paths
        if bypassPaths.contains(request.url.path) {
            return next.respond(to: request)
        }

        // Skip for OPTIONS (preflight) requests - CORS handles these
        if request.method == .OPTIONS {
            return next.respond(to: request)
        }

        // Skip in development if not in strict mode
        if config.isDevelopment && !strictMode {
            return next.respond(to: request)
        }

        // Allow wildcard origin if configured
        if allowedOrigins.contains("*") {
            return next.respond(to: request)
        }

        // Validate origin
        let validationResult = validateRequest(request)

        switch validationResult {
        case .valid:
            return next.respond(to: request)

        case .invalid(let reason):
            request.logger.warning("Origin validation failed", metadata: [
                "reason": .string(reason),
                "path": .string(request.url.path),
                "origin": .string(request.headers.first(name: .origin) ?? "none"),
                "referer": .string(request.headers.first(name: .referer) ?? "none"),
                "ip": .string(request.clientIP ?? "unknown")
            ])

            return request.eventLoop.makeFailedFuture(
                AppError.unauthorized(message: "Invalid request origin")
            )

        case .suspicious(let reason):
            // Log suspicious requests but allow them
            SecureLogger.security("Suspicious origin", metadata: [
                "reason": reason,
                "path": request.url.path
            ])
            return next.respond(to: request)
        }
    }

    // MARK: - Validation

    private enum ValidationResult {
        case valid
        case invalid(String)
        case suspicious(String)
    }

    private func validateRequest(_ request: Request) -> ValidationResult {
        let origin = request.headers.first(name: .origin)
        let referer = request.headers.first(name: .referer)

        // For browser requests, Origin header should be present
        if let origin = origin {
            if isAllowedOrigin(origin) {
                return .valid
            } else {
                return .invalid("Origin not in allowed list: \(origin)")
            }
        }

        // Check Referer if Origin is absent (some browsers don't send Origin for same-origin)
        if let referer = referer {
            if isAllowedReferer(referer) {
                return .valid
            } else {
                return .suspicious("Referer not in allowed list")
            }
        }

        // No Origin or Referer - could be server-to-server or curl
        // Check for API key to determine if this is legitimate
        if request.headers.first(name: "X-API-Key") != nil {
            return .valid // API key present, likely server-to-server
        }

        // Check User-Agent for common browser patterns
        if let userAgent = request.headers.first(name: .userAgent) {
            if isBrowserUserAgent(userAgent) {
                // Browser request without Origin/Referer is suspicious
                return .suspicious("Browser request without origin headers")
            }
        }

        // Non-browser request without API key
        if strictMode {
            return .invalid("Missing origin headers and API key")
        }

        return .suspicious("Request without origin identification")
    }

    /// Check if origin is in allowed list
    private func isAllowedOrigin(_ origin: String) -> Bool {
        // Exact match
        if allowedOrigins.contains(origin) {
            return true
        }

        // Check for wildcard subdomain matches (e.g., *.example.com)
        for allowed in allowedOrigins {
            if allowed.hasPrefix("*.") {
                let domain = String(allowed.dropFirst(2))
                if origin.hasSuffix(domain) {
                    // Verify it's a proper subdomain match
                    let prefix = origin.dropLast(domain.count)
                    if prefix.hasSuffix(".") || prefix.hasSuffix("://") {
                        return true
                    }
                }
            }
        }

        return false
    }

    /// Check if referer starts with an allowed origin
    private func isAllowedReferer(_ referer: String) -> Bool {
        for allowed in allowedOrigins {
            if referer.hasPrefix(allowed) {
                return true
            }
        }
        return false
    }

    /// Check if User-Agent appears to be a browser
    private func isBrowserUserAgent(_ userAgent: String) -> Bool {
        let browserPatterns = [
            "Mozilla/",
            "Chrome/",
            "Safari/",
            "Firefox/",
            "Edge/",
            "Opera/"
        ]

        return browserPatterns.contains { userAgent.contains($0) }
    }
}

// MARK: - Vapor Integration

extension Application {
    /// Configure origin validation middleware
    public func configureOriginValidation(config: AppConfig = .shared, strictMode: Bool = false) {
        middleware.use(OriginValidationMiddleware(config: config, strictMode: strictMode))
    }
}
