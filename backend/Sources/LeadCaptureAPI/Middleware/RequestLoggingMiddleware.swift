// =============================================================================
// RequestLoggingMiddleware.swift
// LeadCaptureAPI/Middleware
// =============================================================================
// Request logging and tracing middleware.
// =============================================================================

import Foundation
import Vapor
import NIOCore

// MARK: - Request Logging Middleware

/// Middleware for logging requests and adding request IDs
public final class RequestLoggingMiddleware: Middleware, @unchecked Sendable {

    private let config: AppConfig

    public init(config: AppConfig = .shared) {
        self.config = config
    }

    public func respond(to request: Request, chainingTo next: Responder) -> EventLoopFuture<Response> {
        let startTime = Date()

        // Generate or use existing request ID
        let requestId = request.headers.first(name: "X-Request-ID") ?? UUID().uuidString

        // Add request ID to logger metadata
        request.logger[metadataKey: "requestId"] = .string(requestId)

        // Log incoming request
        if config.debugEnabled {
            request.logger.info("Incoming request", metadata: [
                "method": .string(request.method.rawValue),
                "path": .string(request.url.path),
                "ip": .string(request.clientIP ?? "unknown")
            ])
        }

        return next.respond(to: request).map { response in
            // Add request ID to response headers
            response.headers.add(name: "X-Request-ID", value: requestId)

            // Calculate duration
            let duration = Date().timeIntervalSince(startTime)

            // Log response
            request.logger.info("Request completed", metadata: [
                "method": .string(request.method.rawValue),
                "path": .string(request.url.path),
                "status": .string(String(response.status.code)),
                "duration_ms": .string(String(format: "%.2f", duration * 1000))
            ])

            return response
        }
    }
}

// MARK: - Client IP Extraction

extension Request {
    /// Get client IP address from headers or connection
    /// SECURITY: Only trusts X-Forwarded-For from configured trusted proxies
    public var clientIP: String? {
        let config = AppConfig.shared
        let connectionIP = remoteAddress?.ipAddress

        // SECURITY: Only trust forwarded headers from trusted proxies
        // This prevents IP spoofing attacks where attackers set X-Forwarded-For
        if let connIP = connectionIP, isTrustedProxy(connIP, trustedProxies: config.trustedProxies) {
            // Check X-Forwarded-For header (from load balancer/proxy)
            if let forwardedFor = headers.first(name: "X-Forwarded-For") {
                // Take the first IP (original client) - but validate it's a valid IP format
                if let firstIP = forwardedFor.split(separator: ",").first {
                    let trimmed = String(firstIP).trimmingCharacters(in: .whitespaces)
                    if isValidIPAddress(trimmed) {
                        return trimmed
                    }
                }
            }

            // Check X-Real-IP header
            if let realIP = headers.first(name: "X-Real-IP"), isValidIPAddress(realIP) {
                return realIP
            }
        }

        // Fall back to connection remote address (most secure)
        return connectionIP
    }

    /// Get user agent
    public var clientUserAgent: String? {
        return headers.first(name: .userAgent)
    }

    /// Check if an IP is from a trusted proxy
    private func isTrustedProxy(_ ip: String, trustedProxies: [String]) -> Bool {
        for trusted in trustedProxies {
            if trusted.contains("/") {
                // CIDR range - simplified check (in production use proper CIDR parsing)
                let prefix = trusted.split(separator: "/").first.map { String($0) } ?? ""
                if ip.hasPrefix(prefix.split(separator: ".").prefix(2).joined(separator: ".")) {
                    return true
                }
            } else if ip == trusted {
                return true
            }
        }
        return false
    }

    /// Validate IP address format to prevent injection
    private func isValidIPAddress(_ ip: String) -> Bool {
        // Basic IPv4 validation
        let ipv4Pattern = #"^(\d{1,3}\.){3}\d{1,3}$"#
        if let regex = try? NSRegularExpression(pattern: ipv4Pattern),
           regex.firstMatch(in: ip, range: NSRange(ip.startIndex..., in: ip)) != nil {
            // Verify each octet is 0-255
            let octets = ip.split(separator: ".").compactMap { Int($0) }
            return octets.count == 4 && octets.allSatisfy { $0 >= 0 && $0 <= 255 }
        }

        // Basic IPv6 validation (simplified)
        let ipv6Pattern = #"^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$"#
        if let regex = try? NSRegularExpression(pattern: ipv6Pattern),
           regex.firstMatch(in: ip, range: NSRange(ip.startIndex..., in: ip)) != nil {
            return true
        }

        return false
    }
}

// MARK: - Socket Address IP Extension

extension SocketAddress {
    /// Extract IP address string
    var ipAddress: String? {
        switch self {
        case .v4(let addr):
            return addr.host
        case .v6(let addr):
            return addr.host
        case .unixDomainSocket:
            return nil
        }
    }
}

// MARK: - Vapor Integration

extension Application {
    /// Configure request logging middleware
    public func configureRequestLogging(config: AppConfig = .shared) {
        middleware.use(RequestLoggingMiddleware(config: config))
    }
}
