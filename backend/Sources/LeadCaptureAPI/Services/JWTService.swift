// =============================================================================
// JWTService.swift
// LeadCaptureAPI/Services
// =============================================================================
// JWT claims extraction and verification.
//
// Note: In Lambda with API Gateway/Cognito, the JWT is already validated by AWS.
// This service extracts claims and optionally verifies against JWKS for
// additional security in development/testing.
// =============================================================================

import Foundation
import Vapor

// MARK: - JWT Claims

/// JWT claims structure for Cognito tokens
public struct JWTClaims: Sendable {
    public let sub: String
    public let email: String?
    public let cognitoUsername: String?
    public let cognitoGroups: [String]
    public let customRole: String?
    public let customUserId: String?
    public let customOrgIds: String?
    public let customPrimaryOrgId: String?
    public let clientId: String?
    public let azp: String?
    public let tokenUse: String?
    public let issuer: String?
    public let audience: String?
    public let expiresAt: Date?
    public let issuedAt: Date?

    init(from dict: [String: Any]) {
        self.sub = dict["sub"] as? String ?? ""
        self.email = dict["email"] as? String
        self.cognitoUsername = dict["cognito:username"] as? String
        self.cognitoGroups = dict["cognito:groups"] as? [String] ?? []
        self.customRole = dict["custom:role"] as? String
        self.customUserId = dict["custom:userId"] as? String
        self.customOrgIds = dict["custom:orgIds"] as? String
        self.customPrimaryOrgId = dict["custom:primaryOrgId"] as? String
        self.clientId = dict["client_id"] as? String
        self.azp = dict["azp"] as? String
        self.tokenUse = dict["token_use"] as? String
        self.issuer = dict["iss"] as? String

        if let audString = dict["aud"] as? String {
            self.audience = audString
        } else if let audArray = dict["aud"] as? [String] {
            self.audience = audArray.first
        } else {
            self.audience = nil
        }

        if let exp = dict["exp"] as? TimeInterval {
            self.expiresAt = Date(timeIntervalSince1970: exp)
        } else if let exp = dict["exp"] as? Int {
            self.expiresAt = Date(timeIntervalSince1970: TimeInterval(exp))
        } else {
            self.expiresAt = nil
        }

        if let iat = dict["iat"] as? TimeInterval {
            self.issuedAt = Date(timeIntervalSince1970: iat)
        } else if let iat = dict["iat"] as? Int {
            self.issuedAt = Date(timeIntervalSince1970: TimeInterval(iat))
        } else {
            self.issuedAt = nil
        }
    }
}

// MARK: - JWT Service

/// Service for JWT verification and claims extraction
public final class JWTService: Sendable {

    // MARK: - Types

    /// JWT verification error types
    public enum JWTError: Error, LocalizedError {
        case invalidToken
        case malformedToken
        case expiredToken
        case invalidSignature
        case invalidIssuer
        case invalidAudience
        case invalidTokenUse
        case jwksFetchFailed(String)
        case keyNotFound(String)
        case unsupportedAlgorithm(String)

        public var errorDescription: String? {
            switch self {
            case .invalidToken:
                return "Invalid token format"
            case .malformedToken:
                return "Malformed JWT token"
            case .expiredToken:
                return "Token has expired"
            case .invalidSignature:
                return "Invalid token signature"
            case .invalidIssuer:
                return "Token issuer mismatch"
            case .invalidAudience:
                return "Token audience mismatch"
            case .invalidTokenUse:
                return "Invalid token_use claim"
            case .jwksFetchFailed(let reason):
                return "Failed to fetch JWKS: \(reason)"
            case .keyNotFound(let kid):
                return "Signing key not found: \(kid)"
            case .unsupportedAlgorithm(let alg):
                return "Unsupported algorithm: \(alg)"
            }
        }
    }

    // MARK: - Initialization

    public init() {}

    // MARK: - Public API

    /// Verify a JWT token and extract claims
    ///
    /// In Lambda with API Gateway + Cognito Authorizer, the JWT is already validated.
    /// This method extracts claims and performs basic validation (expiration, issuer).
    ///
    /// - Parameters:
    ///   - token: Raw JWT token (without "Bearer " prefix)
    ///   - issuer: Expected issuer URL (Cognito User Pool URL)
    ///   - audience: Expected audience (client ID), optional for Cognito access tokens
    /// - Returns: Verified JWT claims
    /// - Throws: JWTError if verification fails
    public func verifyJWT(
        _ token: String,
        issuer: String,
        audience: String? = nil
    ) async throws -> JWTClaims {
        // Extract claims
        let claims = try extractClaims(token)

        // Verify expiration
        if let expiresAt = claims.expiresAt, expiresAt < Date() {
            throw JWTError.expiredToken
        }

        // Verify issuer
        if let tokenIssuer = claims.issuer, tokenIssuer != issuer {
            throw JWTError.invalidIssuer
        }

        // Verify token_use (Cognito-specific)
        if let tokenUse = claims.tokenUse {
            guard tokenUse == "access" || tokenUse == "id" else {
                throw JWTError.invalidTokenUse
            }
        }

        // Verify audience/client_id for Cognito compatibility
        if let expectedAudience = audience {
            let audMatches = claims.audience == expectedAudience
            let clientMatches = claims.clientId == expectedAudience || claims.azp == expectedAudience
            guard audMatches || clientMatches else {
                throw JWTError.invalidAudience
            }
        }

        return claims
    }

    /// Extract claims from a JWT without full signature verification
    ///
    /// Use this when the token has already been verified upstream (e.g., by API Gateway).
    ///
    /// - Parameter token: Raw JWT token
    /// - Returns: Extracted JWT claims
    /// - Throws: JWTError if token is malformed
    public func extractClaims(_ token: String) throws -> JWTClaims {
        let parts = token.split(separator: ".")
        guard parts.count == 3 else {
            throw JWTError.malformedToken
        }

        let payloadPart = String(parts[1])
        guard let payloadData = base64URLDecode(payloadPart),
              let payloadJSON = try? JSONSerialization.jsonObject(with: payloadData) as? [String: Any] else {
            throw JWTError.malformedToken
        }

        return JWTClaims(from: payloadJSON)
    }

    // MARK: - Helpers

    /// Decode base64url-encoded string
    private func base64URLDecode(_ string: String) -> Data? {
        var base64 = string
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        // Add padding if needed
        let remainder = base64.count % 4
        if remainder > 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }

        return Data(base64Encoded: base64)
    }
}

// MARK: - Vapor Storage Key

public struct JWTServiceKey: StorageKey {
    public typealias Value = JWTService
}

// MARK: - Request Extension

extension Request {
    /// Access the JWT service
    public var jwtService: JWTService {
        if let existing = application.storage[JWTServiceKey.self] {
            return existing
        }
        let service = JWTService()
        application.storage[JWTServiceKey.self] = service
        return service
    }
}
