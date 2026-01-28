// =============================================================================
// APIKeyMiddleware.swift
// LeadCaptureAPI/Middleware
// =============================================================================
// API key authentication for protected endpoints.
// =============================================================================

import Foundation
import Vapor
import Crypto

// MARK: - API Key Middleware

/// Middleware for API key authentication
/// Validates X-API-Key header against configured API keys
public final class APIKeyMiddleware: Middleware, @unchecked Sendable {

    private let config: AppConfig

    /// Paths that don't require authentication
    private let publicPaths: Set<String> = ["/health", "/"]

    public init(config: AppConfig = .shared) {
        self.config = config
    }

    public func respond(to request: Request, chainingTo next: Responder) -> EventLoopFuture<Response> {
        // Skip auth for public paths
        if publicPaths.contains(request.url.path) {
            return next.respond(to: request)
        }

        // Skip auth for OPTIONS (preflight) requests
        if request.method == .OPTIONS {
            return next.respond(to: request)
        }

        // Skip auth if API key authentication is disabled
        guard config.apiKeyEnabled else {
            return next.respond(to: request)
        }

        // Validate API key
        guard let apiKey = request.headers.first(name: "X-API-Key") else {
            request.logger.warning("Missing API key", metadata: [
                "path": .string(request.url.path),
                "ip": .string(request.clientIP ?? "unknown")
            ])
            return request.eventLoop.makeFailedFuture(AppError.invalidApiKey)
        }

        // Constant-time comparison to prevent timing attacks
        guard isValidAPIKey(apiKey) else {
            request.logger.warning("Invalid API key", metadata: [
                "path": .string(request.url.path),
                "ip": .string(request.clientIP ?? "unknown"),
                "keyPrefix": .string(String(apiKey.prefix(8)) + "...")
            ])
            return request.eventLoop.makeFailedFuture(AppError.invalidApiKey)
        }

        // API key is valid, continue processing
        return next.respond(to: request)
    }

    /// Validate API key using constant-time comparison
    /// - Parameter providedKey: The API key from the request
    /// - Returns: True if the key is valid
    private func isValidAPIKey(_ providedKey: String) -> Bool {
        // Get configured API keys
        let validKeys = config.apiKeys

        // Check against each valid key using constant-time comparison
        for validKey in validKeys {
            if constantTimeCompare(providedKey, validKey) {
                return true
            }
        }

        return false
    }

    /// Constant-time string comparison to prevent timing attacks
    /// - Parameters:
    ///   - a: First string
    ///   - b: Second string
    /// - Returns: True if strings are equal
    private func constantTimeCompare(_ a: String, _ b: String) -> Bool {
        let aBytes = Array(a.utf8)
        let bBytes = Array(b.utf8)

        // Always compare full length to prevent length-based timing attacks
        guard aBytes.count == bBytes.count else {
            // Still do a comparison to maintain constant time
            _ = aBytes.reduce(0) { $0 ^ Int($1) }
            return false
        }

        var result: UInt8 = 0
        for (aByte, bByte) in zip(aBytes, bBytes) {
            result |= aByte ^ bByte
        }

        return result == 0
    }
}

// MARK: - Vapor Integration

extension Application {
    /// Configure API key authentication middleware
    public func configureAPIKeyAuth(config: AppConfig = .shared) {
        middleware.use(APIKeyMiddleware(config: config))
    }
}
