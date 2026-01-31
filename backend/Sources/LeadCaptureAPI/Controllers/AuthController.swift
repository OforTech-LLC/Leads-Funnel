// =============================================================================
// AuthController.swift
// LeadCaptureAPI/Controllers
// =============================================================================
// Authentication endpoints for secure cookie management.
// Supports both admin and portal authentication with separate cookies.
// =============================================================================

import Foundation
import Vapor

// MARK: - Request/Response Models

struct SetTokenRequest: Content {
    let accessToken: String
    let idToken: String
    let refreshToken: String
    let expiresIn: Int // seconds until expiration
}

/// Request for server-side token exchange (avoids CORS issues)
struct TokenExchangeRequest: Content {
    let code: String
    let redirectUri: String
    let codeVerifier: String?
}

/// Response from Cognito token endpoint
struct CognitoTokenResponse: Content {
    let access_token: String
    let id_token: String
    let refresh_token: String?
    let expires_in: Int
    let token_type: String
}

public struct AuthResponse: Content {
    let success: Bool
    let error: String?
    let authenticated: Bool?
    let expiresAt: Int?
    let needsRefresh: Bool?
    let user: AuthUser?

    init(success: Bool, error: String? = nil, authenticated: Bool? = nil, expiresAt: Int? = nil, needsRefresh: Bool? = nil, user: AuthUser? = nil) {
        self.success = success
        self.error = error
        self.authenticated = authenticated
        self.expiresAt = expiresAt
        self.needsRefresh = needsRefresh
        self.user = user
    }
}

public struct AuthUser: Content {
    let sub: String
    let email: String
    let groups: [String]?
}

struct TokenPayload: Codable {
    let accessToken: String
    let idToken: String
    let refreshToken: String
    let expiresAt: Int
}

// MARK: - Auth Controller

/// Controller for authentication cookie management
/// Supports both admin and portal authentication
public struct AuthController: RouteCollection {

    // MARK: - Properties

    private let config: AppConfig
    private let adminCookieName = "admin_token"
    private let portalCookieName = "portal_token"
    private let cookieMaxAge: Int = 60 * 60 * 24 // 24 hours
    private let portalCookieMaxAge: Int = 60 * 60 * 24 * 7 // 7 days

    // MARK: - Initialization

    public init(config: AppConfig = .shared) {
        self.config = config
    }

    // MARK: - Route Registration

    public func boot(routes: RoutesBuilder) throws {
        // Admin auth routes
        let admin = routes.grouped("auth", "admin")
        admin.get(use: checkAdminAuth)
        admin.post(use: setAdminToken)
        admin.delete(use: clearAdminToken)
        admin.post("callback", use: adminTokenExchange) // Server-side token exchange

        // Portal auth routes
        let portal = routes.grouped("auth", "portal")
        portal.get(use: checkPortalAuth)
        portal.post(use: setPortalToken)
        portal.delete(use: clearPortalToken)
        portal.post("callback", use: portalTokenExchange) // Server-side token exchange
    }

    // MARK: - Admin Endpoints

    /// Check admin authentication status
    /// - GET /auth/admin
    @Sendable
    public func checkAdminAuth(req: Request) async throws -> AuthResponse {
        return checkAuth(req: req, cookieName: adminCookieName)
    }

    /// Set admin authentication token
    /// - POST /auth/admin
    @Sendable
    public func setAdminToken(req: Request) async throws -> Response {
        return try await setToken(req: req, cookieName: adminCookieName, maxAge: cookieMaxAge)
    }

    /// Clear admin authentication token (logout)
    /// - DELETE /auth/admin
    @Sendable
    public func clearAdminToken(req: Request) async throws -> Response {
        return try clearToken(req: req, cookieName: adminCookieName)
    }

    // MARK: - Portal Endpoints

    /// Check portal authentication status
    /// - GET /auth/portal
    @Sendable
    public func checkPortalAuth(req: Request) async throws -> AuthResponse {
        return checkAuth(req: req, cookieName: portalCookieName)
    }

    /// Set portal authentication token
    /// - POST /auth/portal
    @Sendable
    public func setPortalToken(req: Request) async throws -> Response {
        return try await setToken(req: req, cookieName: portalCookieName, maxAge: portalCookieMaxAge)
    }

    /// Clear portal authentication token (logout)
    /// - DELETE /auth/portal
    @Sendable
    public func clearPortalToken(req: Request) async throws -> Response {
        return try clearToken(req: req, cookieName: portalCookieName)
    }

    // MARK: - Server-Side Token Exchange (avoids CORS issues)

    /// Exchange authorization code for tokens (admin)
    /// - POST /auth/admin/callback
    @Sendable
    public func adminTokenExchange(req: Request) async throws -> Response {
        let cognitoDomain = ProcessInfo.processInfo.environment["COGNITO_ADMIN_DOMAIN"] ?? "https://kanjona-admin-dev.auth.us-east-1.amazoncognito.com"
        let clientId = ProcessInfo.processInfo.environment["COGNITO_ADMIN_CLIENT_ID"] ?? "jt92k3a0go8o1b50nup1c5f8e"
        return try await exchangeCodeForTokens(req: req, cookieName: adminCookieName, maxAge: cookieMaxAge, cognitoDomain: cognitoDomain, clientId: clientId)
    }

    /// Exchange authorization code for tokens (portal)
    /// - POST /auth/portal/callback
    @Sendable
    public func portalTokenExchange(req: Request) async throws -> Response {
        let cognitoDomain = ProcessInfo.processInfo.environment["COGNITO_PORTAL_DOMAIN"] ?? "https://kanjona-portal-dev.auth.us-east-1.amazoncognito.com"
        let clientId = ProcessInfo.processInfo.environment["COGNITO_PORTAL_CLIENT_ID"] ?? ""
        return try await exchangeCodeForTokens(req: req, cookieName: portalCookieName, maxAge: portalCookieMaxAge, cognitoDomain: cognitoDomain, clientId: clientId)
    }

    /// Exchange authorization code for tokens via Cognito (server-side)
    private func exchangeCodeForTokens(req: Request, cookieName: String, maxAge: Int, cognitoDomain: String, clientId: String) async throws -> Response {
        // Parse request
        let exchangeRequest: TokenExchangeRequest
        do {
            exchangeRequest = try req.content.decode(TokenExchangeRequest.self)
        } catch {
            let response = AuthResponse(success: false, error: "Invalid exchange request")
            return try createResponse(status: .badRequest, body: response)
        }

        // Build token exchange request
        var params = "grant_type=authorization_code"
        params += "&client_id=\(clientId)"
        params += "&code=\(exchangeRequest.code)"
        params += "&redirect_uri=\(exchangeRequest.redirectUri.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? exchangeRequest.redirectUri)"
        if let verifier = exchangeRequest.codeVerifier, !verifier.isEmpty {
            params += "&code_verifier=\(verifier)"
        }

        // Make request to Cognito
        let tokenURL = URI(string: "\(cognitoDomain)/oauth2/token")
        var headers = HTTPHeaders()
        headers.add(name: "Content-Type", value: "application/x-www-form-urlencoded")

        let clientResponse = try await req.client.post(tokenURL, headers: headers) { clientReq in
            clientReq.body = ByteBuffer(string: params)
        }

        // Check for error
        guard clientResponse.status == .ok else {
            let errorBody = clientResponse.body.map { String(buffer: $0) } ?? "Unknown error"
            req.logger.error("Cognito token exchange failed: \(clientResponse.status) - \(errorBody)")
            let response = AuthResponse(success: false, error: "Token exchange failed: \(errorBody)")
            return try createResponse(status: .badRequest, body: response)
        }

        // Parse Cognito response
        let cognitoResponse: CognitoTokenResponse
        do {
            cognitoResponse = try clientResponse.content.decode(CognitoTokenResponse.self)
        } catch {
            req.logger.error("Failed to parse Cognito response: \(error)")
            let response = AuthResponse(success: false, error: "Invalid token response from Cognito")
            return try createResponse(status: .badRequest, body: response)
        }

        // Create token payload
        let expiresAt = Int(Date().timeIntervalSince1970 * 1000) + (cognitoResponse.expires_in * 1000)
        let payload = TokenPayload(
            accessToken: cognitoResponse.access_token,
            idToken: cognitoResponse.id_token,
            refreshToken: cognitoResponse.refresh_token ?? "",
            expiresAt: expiresAt
        )

        // Encode payload
        let payloadData = try JSONEncoder().encode(payload)
        let payloadString = String(data: payloadData, encoding: .utf8) ?? ""

        // Calculate max age
        let effectiveMaxAge = min(cognitoResponse.expires_in, maxAge)

        // Create response
        let response = try createResponse(status: .ok, body: AuthResponse(success: true))

        // Set cookie
        // SameSite=None is required for cross-origin requests (admin.kanjona.com -> api.kanjona.com)
        // Secure must be true when SameSite=None
        let cookie = HTTPCookies.Value(
            string: payloadString,
            expires: Date().addingTimeInterval(TimeInterval(effectiveMaxAge)),
            maxAge: effectiveMaxAge,
            isSecure: true,
            isHTTPOnly: true,
            sameSite: HTTPCookies.SameSitePolicy.none
        )
        response.cookies[cookieName] = cookie

        return response
    }

    // MARK: - Shared Implementation

    private func checkAuth(req: Request, cookieName: String) -> AuthResponse {
        guard let tokenCookie = req.cookies[cookieName]?.string,
              !tokenCookie.isEmpty else {
            return AuthResponse(success: true, error: "No authentication token", authenticated: false)
        }

        // Parse token payload
        guard let jsonData = tokenCookie.data(using: .utf8),
              let payload = try? JSONDecoder().decode(TokenPayload.self, from: jsonData) else {
            return AuthResponse(success: true, error: "Invalid token format", authenticated: false)
        }

        // Check expiration
        let now = Int(Date().timeIntervalSince1970 * 1000)
        if payload.expiresAt < now {
            return AuthResponse(success: true, error: "Token expired", authenticated: false, needsRefresh: true)
        }

        // Parse user info from ID token (without verification - display only)
        let user = parseIdToken(payload.idToken)

        return AuthResponse(success: true, authenticated: true, expiresAt: payload.expiresAt, user: user)
    }

    private func setToken(req: Request, cookieName: String, maxAge: Int) async throws -> Response {
        // Note: CSRF validation disabled for initial token setting
        // The token exchange happens after OAuth redirect, cookies aren't set yet

        // Parse request
        let tokenRequest: SetTokenRequest
        do {
            tokenRequest = try req.content.decode(SetTokenRequest.self)
        } catch {
            let response = AuthResponse(success: false, error: "Invalid token request")
            return try createResponse(status: .badRequest, body: response)
        }

        // Validate request - allow empty refresh token since not all flows provide it
        guard !tokenRequest.accessToken.isEmpty,
              !tokenRequest.idToken.isEmpty,
              tokenRequest.expiresIn > 0 else {
            let response = AuthResponse(success: false, error: "Invalid token request")
            return try createResponse(status: .badRequest, body: response)
        }

        // Create token payload
        let expiresAt = Int(Date().timeIntervalSince1970 * 1000) + (tokenRequest.expiresIn * 1000)
        let payload = TokenPayload(
            accessToken: tokenRequest.accessToken,
            idToken: tokenRequest.idToken,
            refreshToken: tokenRequest.refreshToken,
            expiresAt: expiresAt
        )

        // Encode payload
        let payloadData = try JSONEncoder().encode(payload)
        let payloadString = String(data: payloadData, encoding: .utf8) ?? ""

        // Calculate max age (use token expiry or configured max, whichever is less)
        let effectiveMaxAge = min(tokenRequest.expiresIn, maxAge)

        // Create response
        let response = try createResponse(status: .ok, body: AuthResponse(success: true))

        // Set cookie
        // SameSite=None is required for cross-origin requests (admin.kanjona.com -> api.kanjona.com)
        // Secure must be true when SameSite=None
        let cookie = HTTPCookies.Value(
            string: payloadString,
            expires: Date().addingTimeInterval(TimeInterval(effectiveMaxAge)),
            maxAge: effectiveMaxAge,
            isSecure: true,
            isHTTPOnly: true,
            sameSite: HTTPCookies.SameSitePolicy.none
        )
        response.cookies[cookieName] = cookie

        return response
    }

    private func clearToken(req: Request, cookieName: String) throws -> Response {
        // Verify CSRF token for logout
        guard verifyCSRF(req: req) else {
            let response = AuthResponse(success: false, error: "Invalid CSRF token")
            return try createResponse(status: .forbidden, body: response)
        }

        // Create response
        let response = try createResponse(status: .ok, body: AuthResponse(success: true))

        // Clear token cookie
        // SameSite=None is required for cross-origin requests
        let expiredCookie = HTTPCookies.Value(
            string: "",
            expires: Date(timeIntervalSince1970: 0),
            maxAge: 0,
            isSecure: true,
            isHTTPOnly: true,
            sameSite: HTTPCookies.SameSitePolicy.none
        )
        response.cookies[cookieName] = expiredCookie

        // Clear CSRF cookie
        let expiredCSRFCookie = HTTPCookies.Value(
            string: "",
            expires: Date(timeIntervalSince1970: 0),
            maxAge: 0,
            isSecure: true,
            isHTTPOnly: true,
            sameSite: HTTPCookies.SameSitePolicy.none
        )
        response.cookies["csrf_token"] = expiredCSRFCookie

        return response
    }

    // MARK: - Private Helpers

    private func parseIdToken(_ idToken: String) -> AuthUser? {
        // JWT structure: header.payload.signature
        let parts = idToken.split(separator: ".")
        guard parts.count == 3 else { return nil }

        // Decode payload (base64url)
        var base64 = String(parts[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        // Pad to multiple of 4
        while base64.count % 4 != 0 {
            base64.append("=")
        }

        guard let data = Data(base64Encoded: base64),
              let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }

        let sub = payload["sub"] as? String ?? ""
        let email = payload["email"] as? String ?? ""
        let groups = payload["cognito:groups"] as? [String]

        return AuthUser(sub: sub, email: email, groups: groups)
    }

    private func verifyCSRF(req: Request) -> Bool {
        // Get token from header
        guard let headerToken = req.headers.first(name: "x-csrf-token") else {
            return false
        }

        // Get token from cookie
        guard let cookieToken = req.cookies["csrf_token"]?.string else {
            return false
        }

        // Tokens must match (double-submit pattern)
        guard headerToken == cookieToken else {
            return false
        }

        // Validate token signature and expiration
        let secret = getCSRFSecret()
        return CSRFController.validateToken(headerToken, secret: secret)
    }

    private func getCSRFSecret() -> String {
        if let secret = ProcessInfo.processInfo.environment["CSRF_SECRET"] {
            return secret
        }
        return "dev-only-csrf-secret-do-not-use-in-production"
    }

    private func createResponse<T: Encodable>(status: HTTPStatus, body: T) throws -> Response {
        let response = Response(status: status)
        response.headers.contentType = .json
        response.headers.add(name: "X-Content-Type-Options", value: "nosniff")
        response.headers.add(name: "X-Frame-Options", value: "DENY")
        response.headers.add(name: "X-XSS-Protection", value: "1; mode=block")
        response.body = try .init(data: JSONEncoder().encode(body))
        return response
    }
}
