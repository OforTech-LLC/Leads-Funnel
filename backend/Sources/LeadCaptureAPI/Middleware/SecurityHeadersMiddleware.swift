// =============================================================================
// SecurityHeadersMiddleware.swift
// LeadCaptureAPI/Middleware
// =============================================================================
// HTTP security headers for defense in depth.
// =============================================================================

import Foundation
import Vapor

// MARK: - Security Headers Middleware

/// Middleware for adding HTTP security headers to all responses
public final class SecurityHeadersMiddleware: Middleware, @unchecked Sendable {

    private let config: AppConfig

    public init(config: AppConfig = .shared) {
        self.config = config
    }

    public func respond(to request: Request, chainingTo next: Responder) -> EventLoopFuture<Response> {
        return next.respond(to: request).map { response in
            self.addSecurityHeaders(to: response)
            return response
        }
    }

    private func addSecurityHeaders(to response: Response) {
        // Prevent clickjacking
        response.headers.add(name: "X-Frame-Options", value: "DENY")

        // Prevent MIME type sniffing
        response.headers.add(name: "X-Content-Type-Options", value: "nosniff")

        // XSS Protection (legacy but still useful for older browsers)
        response.headers.add(name: "X-XSS-Protection", value: "1; mode=block")

        // Referrer Policy - don't leak URLs to other sites
        response.headers.add(name: "Referrer-Policy", value: "strict-origin-when-cross-origin")

        // Content Security Policy - restrict resource loading
        response.headers.add(name: "Content-Security-Policy", value: "default-src 'none'; frame-ancestors 'none'")

        // Permissions Policy - disable unnecessary browser features
        response.headers.add(name: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()")

        // HSTS - enforce HTTPS (only in production)
        if config.isProduction {
            // max-age=31536000 = 1 year, includeSubDomains for all subdomains
            response.headers.add(name: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains")
        }

        // Cache control for API responses - don't cache sensitive data
        if response.headers.first(name: .cacheControl) == nil {
            response.headers.add(name: .cacheControl, value: "no-store, no-cache, must-revalidate, private")
        }

        // Prevent caching of authenticated responses
        response.headers.add(name: "Pragma", value: "no-cache")
        response.headers.add(name: "Expires", value: "0")
    }
}

// MARK: - Vapor Integration

extension Application {
    /// Configure security headers middleware
    public func configureSecurityHeaders(config: AppConfig = .shared) {
        middleware.use(SecurityHeadersMiddleware(config: config))
    }
}
