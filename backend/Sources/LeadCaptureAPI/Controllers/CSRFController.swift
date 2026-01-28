// =============================================================================
// CSRFController.swift
// LeadCaptureAPI/Controllers
// =============================================================================
// CSRF token generation and validation for protecting form submissions.
// =============================================================================

import Foundation
import Vapor
import Crypto

// MARK: - CSRF Controller

/// Controller for CSRF token management
public struct CSRFController: RouteCollection {

    // MARK: - Properties

    private let config: AppConfig
    private let tokenExpiry: TimeInterval = 3600 // 1 hour

    // MARK: - Initialization

    public init(config: AppConfig = .shared) {
        self.config = config
    }

    // MARK: - Route Registration

    public func boot(routes: RoutesBuilder) throws {
        // CSRF token endpoint
        routes.get("csrf", use: generateToken)
    }

    // MARK: - Endpoints

    /// Generate CSRF token
    /// - GET /csrf
    @Sendable
    public func generateToken(req: Request) async throws -> Response {
        // Generate random token bytes
        let tokenBytes = SymmetricKey(size: .bits256)
        let token = tokenBytes.withUnsafeBytes { Data($0).base64EncodedString() }

        let timestamp = Int(Date().timeIntervalSince1970 * 1000)

        // Create signature using HMAC-SHA256
        let secret = getCSRFSecret()
        let dataToSign = "\(token):\(timestamp):\(secret)"
        let signature = HMAC<SHA256>.authenticationCode(
            for: Data(dataToSign.utf8),
            using: SymmetricKey(data: Data(secret.utf8))
        )
        let signatureString = Data(signature).base64EncodedString()

        // Create token payload
        let payload: [String: Any] = [
            "token": token,
            "timestamp": timestamp,
            "signature": signatureString
        ]

        // Encode payload as base64 JSON
        let jsonData = try JSONSerialization.data(withJSONObject: payload)
        let encodedToken = jsonData.base64EncodedString()

        // Create response
        let response = Response(status: .ok)
        response.headers.contentType = .json
        response.headers.add(name: "X-Content-Type-Options", value: "nosniff")
        response.headers.add(name: "X-Frame-Options", value: "DENY")
        response.headers.add(name: "Cache-Control", value: "no-store, no-cache, must-revalidate, private")
        response.headers.add(name: "Pragma", value: "no-cache")

        // Set cookie for double-submit pattern
        let cookie = HTTPCookies.Value(
            string: encodedToken,
            expires: Date().addingTimeInterval(tokenExpiry),
            maxAge: Int(tokenExpiry),
            isSecure: config.isProduction,
            isHTTPOnly: false,
            sameSite: .strict
        )
        response.cookies["csrf_token"] = cookie

        // Return token in JSON body
        let responseBody: [String: String] = ["token": encodedToken]
        response.body = try .init(data: JSONEncoder().encode(responseBody))

        return response
    }

    // MARK: - Token Validation

    /// Validate a CSRF token
    public static func validateToken(_ encodedToken: String?, secret: String) -> Bool {
        guard let encodedToken = encodedToken,
              let jsonData = Data(base64Encoded: encodedToken),
              let payload = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
              let token = payload["token"] as? String,
              let timestamp = payload["timestamp"] as? Int,
              let signature = payload["signature"] as? String else {
            return false
        }

        // Verify signature
        let dataToSign = "\(token):\(timestamp):\(secret)"
        let expectedSignature = HMAC<SHA256>.authenticationCode(
            for: Data(dataToSign.utf8),
            using: SymmetricKey(data: Data(secret.utf8))
        )
        let expectedSignatureString = Data(expectedSignature).base64EncodedString()

        // Constant-time comparison
        guard signature.count == expectedSignatureString.count else {
            return false
        }

        var result: UInt8 = 0
        for (a, b) in zip(signature.utf8, expectedSignatureString.utf8) {
            result |= a ^ b
        }

        if result != 0 {
            return false
        }

        // Check expiration (1 hour)
        let now = Int(Date().timeIntervalSince1970 * 1000)
        let tokenAge = now - timestamp
        if tokenAge > 3600 * 1000 { // 1 hour in ms
            return false
        }

        return true
    }

    // MARK: - Private Helpers

    private func getCSRFSecret() -> String {
        // In production, this should come from environment variable
        if let secret = ProcessInfo.processInfo.environment["CSRF_SECRET"] {
            return secret
        }
        // Development fallback
        return "dev-only-csrf-secret-do-not-use-in-production"
    }
}
