// =============================================================================
// PortalAuthMiddleware.swift
// LeadCaptureAPI/Middleware
// =============================================================================
// Portal authentication middleware for organization agent/manager endpoints.
// Verifies JWT against Cognito JWKS and extracts portal user claims.
//
// Portal users differ from admin users:
// - They have orgIds and primaryOrgId claims from Cognito custom attributes
// - Their role is determined by their membership in organizations
// - They can only access leads assigned to their organizations
// =============================================================================

import Foundation
import Vapor
import Crypto

// MARK: - Portal Role

/// Portal user role (maps from MembershipRole)
public enum PortalRole: String, Codable, Sendable {
    case admin = "admin"     // ORG_OWNER: full org access
    case manager = "manager" // MANAGER: can view all leads, manage team
    case agent = "agent"     // AGENT: can only see assigned leads
    case viewer = "viewer"   // VIEWER: read-only access

    /// Check if this role can view all leads in an org (not just assigned)
    public var canViewAllOrgLeads: Bool {
        self == .admin || self == .manager
    }

    /// Check if this role can update leads
    public var canUpdateLead: Bool {
        self != .viewer
    }

    /// Check if this role can manage team members
    public var canManageMembers: Bool {
        self == .admin || self == .manager
    }
}

// MARK: - Portal Identity

/// Authenticated portal user identity stored in request
public struct PortalIdentity: Sendable {
    /// User ID (ULID)
    public let userId: String

    /// User email address (lowercase, trimmed)
    public let email: String

    /// SHA-256 hash of email for logging (safe to log)
    public let emailHash: String

    /// Cognito subject (sub claim)
    public let sub: String

    /// Organization IDs the user belongs to
    public let orgIds: [String]

    /// Primary organization ID
    public let primaryOrgId: String

    /// Cognito groups
    public let groups: [String]

    /// Create portal identity from JWT claims
    init(
        userId: String,
        email: String,
        sub: String,
        orgIds: [String],
        primaryOrgId: String,
        groups: [String]
    ) {
        self.userId = userId
        self.email = email.lowercased().trimmingCharacters(in: .whitespaces)
        self.emailHash = Self.computeEmailHash(email)
        self.sub = sub
        self.orgIds = orgIds
        self.primaryOrgId = primaryOrgId
        self.groups = groups
    }

    /// Hash email for safe logging
    private static func computeEmailHash(_ email: String) -> String {
        let normalized = email.lowercased().trimmingCharacters(in: .whitespaces)
        let data = Data(normalized.utf8)
        let hash = SHA256.hash(data: data)
        return hash.compactMap { String(format: "%02x", $0) }.joined()
    }

    /// Static method for external hash computation
    public static func hashEmail(_ email: String) -> String {
        return computeEmailHash(email)
    }

    /// Check if user is a member of the given organization
    public func isMemberOf(_ orgId: String) -> Bool {
        orgIds.contains(orgId)
    }
}

// MARK: - Portal Auth Error

/// Portal authentication/authorization errors
public enum PortalAuthError: Error, AbortError, Sendable {
    case missingToken
    case invalidToken
    case expiredToken
    case missingEmail
    case missingUserClaims
    case portalDisabled
    case notConfigured
    case accessDenied
    case insufficientPermissions
    case notOrgMember(String)
    case profileIncomplete([String])

    public var status: HTTPResponseStatus {
        switch self {
        case .missingToken, .invalidToken, .expiredToken, .missingEmail, .missingUserClaims:
            return .unauthorized
        case .notConfigured:
            return .internalServerError
        case .portalDisabled, .accessDenied, .insufficientPermissions, .notOrgMember:
            return .forbidden
        case .profileIncomplete:
            return .forbidden
        }
    }

    public var reason: String {
        switch self {
        case .missingToken:
            return "Missing or invalid Authorization header"
        case .invalidToken:
            return "Invalid or expired token"
        case .expiredToken:
            return "Token has expired"
        case .missingEmail:
            return "Token missing email claim"
        case .missingUserClaims:
            return "Token missing required user claims (userId, orgIds)"
        case .portalDisabled:
            return "Portal access is disabled for this organization"
        case .notConfigured:
            return "Portal authentication not configured"
        case .accessDenied:
            return "Access denied"
        case .insufficientPermissions:
            return "Insufficient permissions for this operation"
        case .notOrgMember(let orgId):
            return "Not a member of organization: \(orgId)"
        case .profileIncomplete(let fields):
            return "Profile incomplete. Missing: \(fields.joined(separator: ", "))"
        }
    }

    public var errorCode: String {
        switch self {
        case .missingToken: return "AUTH_MISSING_TOKEN"
        case .invalidToken: return "AUTH_INVALID_TOKEN"
        case .expiredToken: return "AUTH_EXPIRED_TOKEN"
        case .missingEmail: return "AUTH_MISSING_EMAIL"
        case .missingUserClaims: return "AUTH_MISSING_CLAIMS"
        case .portalDisabled: return "PORTAL_DISABLED"
        case .notConfigured: return "AUTH_NOT_CONFIGURED"
        case .accessDenied: return "ACCESS_DENIED"
        case .insufficientPermissions: return "INSUFFICIENT_PERMISSIONS"
        case .notOrgMember: return "NOT_ORG_MEMBER"
        case .profileIncomplete: return "PROFILE_INCOMPLETE"
        }
    }
}

// MARK: - Portal Auth Middleware

/// Middleware for portal JWT authentication
/// Verifies JWT against Cognito JWKS and extracts portal user claims
public final class PortalAuthMiddleware: AsyncMiddleware, @unchecked Sendable {

    // MARK: - Properties

    private let config: AppConfig
    private let jwtService: JWTService
    private let usersService: UsersService?
    private let membershipsService: MembershipsService?

    /// Cognito issuer URL
    private let cognitoIssuer: String

    /// Cognito client ID (audience) for portal app
    private let cognitoClientId: String?

    /// Paths that don't require authentication
    private let publicPaths: Set<String>

    /// Cookie name for portal token
    private let tokenCookieName = "portal_token"

    // MARK: - Initialization

    public init(
        config: AppConfig = .shared,
        jwtService: JWTService? = nil,
        usersService: UsersService? = nil,
        membershipsService: MembershipsService? = nil,
        publicPaths: Set<String> = ["/health", "/"]
    ) {
        self.config = config
        self.jwtService = jwtService ?? JWTService()
        self.usersService = usersService
        self.membershipsService = membershipsService
        self.publicPaths = publicPaths

        // Load Cognito configuration from environment
        // Portal may use a different client ID than admin
        self.cognitoIssuer = ProcessInfo.processInfo.environment["COGNITO_ISSUER"] ?? ""
        self.cognitoClientId = ProcessInfo.processInfo.environment["PORTAL_COGNITO_CLIENT_ID"]
            ?? ProcessInfo.processInfo.environment["COGNITO_CLIENT_ID"]
    }

    // MARK: - AsyncMiddleware

    public func respond(to request: Request, chainingTo next: AsyncResponder) async throws -> Response {
        // Skip auth for public paths
        if publicPaths.contains(request.url.path) {
            return try await next.respond(to: request)
        }

        // Skip auth for OPTIONS (preflight) requests
        if request.method == .OPTIONS {
            return try await next.respond(to: request)
        }

        // Authenticate the request
        let identity = try await authenticate(request: request)

        // Store identity in request for use by handlers
        request.storage[PortalIdentityKey.self] = identity

        // Log successful authentication (safe data only)
        SecureLogger.info("Portal user authenticated", metadata: [
            "emailHash": identity.emailHash,
            "userId": identity.userId,
            "primaryOrgId": identity.primaryOrgId,
            "path": request.url.path
        ])

        return try await next.respond(to: request)
    }

    // MARK: - Authentication

    /// Authenticate a portal request
    private func authenticate(request: Request) async throws -> PortalIdentity {
        // Extract token from header or cookie
        guard let token = extractToken(from: request) else {
            SecureLogger.security("Missing portal token", metadata: [
                "path": request.url.path,
                "ip": request.clientIP ?? "unknown"
            ])
            throw PortalAuthError.missingToken
        }

        // Verify Cognito is configured
        guard !cognitoIssuer.isEmpty else {
            SecureLogger.error("COGNITO_ISSUER not configured for portal")
            throw PortalAuthError.notConfigured
        }

        // Verify JWT
        let claims: JWTClaims
        do {
            claims = try await jwtService.verifyJWT(
                token,
                issuer: cognitoIssuer,
                audience: cognitoClientId
            )
        } catch {
            SecureLogger.security("Portal JWT verification failed", metadata: [
                "path": request.url.path,
                "ip": request.clientIP ?? "unknown"
            ])
            throw PortalAuthError.invalidToken
        }

        // Extract email from claims
        let email = claims.email ?? claims.cognitoUsername ?? ""
        guard !email.isEmpty else {
            SecureLogger.security("Portal token missing email claim", metadata: [
                "sub": claims.sub
            ])
            throw PortalAuthError.missingEmail
        }

        // Extract custom claims for portal users
        // These are set during Cognito sign-up/confirmation
        guard let userId = claims.customUserId,
              let orgIdsString = claims.customOrgIds,
              let primaryOrgId = claims.customPrimaryOrgId else {
            // Try to look up user by Cognito sub if claims are missing
            if let usersService = usersService {
                if let user = try? await usersService.getUserByCognitoSub(claims.sub) {
                    // Get user's orgs from memberships
                    if let membershipsService = membershipsService {
                        let memberships = try? await membershipsService.listUserOrgs(userId: user.userId)
                        let orgIds = memberships?.items.map { $0.orgId } ?? []
                        let primaryOrgId = orgIds.first ?? ""

                        return PortalIdentity(
                            userId: user.userId,
                            email: email,
                            sub: claims.sub,
                            orgIds: orgIds,
                            primaryOrgId: primaryOrgId,
                            groups: claims.cognitoGroups
                        )
                    }
                }
            }

            SecureLogger.security("Portal token missing user claims", metadata: [
                "sub": claims.sub
            ])
            throw PortalAuthError.missingUserClaims
        }

        // Parse org IDs from comma-separated string
        let orgIds = orgIdsString.split(separator: ",").map { String($0).trimmingCharacters(in: .whitespaces) }

        return PortalIdentity(
            userId: userId,
            email: email,
            sub: claims.sub,
            orgIds: orgIds,
            primaryOrgId: primaryOrgId,
            groups: claims.cognitoGroups
        )
    }

    /// Extract JWT from Authorization header or cookie
    private func extractToken(from request: Request) -> String? {
        // Try Bearer token first
        if let bearer = extractBearerToken(from: request) {
            return bearer
        }

        // Fall back to cookie
        return extractCookieToken(from: request)
    }

    /// Extract Bearer token from Authorization header
    private func extractBearerToken(from request: Request) -> String? {
        // Check both cases for header name
        let authHeader = request.headers.first(name: "Authorization")
            ?? request.headers.first(name: "authorization")

        guard let header = authHeader else {
            return nil
        }

        let parts = header.split(separator: " ", maxSplits: 1)
        guard parts.count == 2,
              parts[0].lowercased() == "bearer",
              !parts[1].isEmpty else {
            return nil
        }

        return String(parts[1])
    }

    /// Extract token from cookie
    private func extractCookieToken(from request: Request) -> String? {
        return request.cookies[tokenCookieName]?.string
    }
}

// MARK: - Storage Key

/// Storage key for portal identity
public struct PortalIdentityKey: StorageKey {
    public typealias Value = PortalIdentity
}

// MARK: - Request Extension

extension Request {
    /// Get the authenticated portal identity
    /// Throws if not authenticated
    public var portalIdentity: PortalIdentity {
        get throws {
            guard let identity = storage[PortalIdentityKey.self] else {
                throw PortalAuthError.missingToken
            }
            return identity
        }
    }

    /// Check if user is a member of the given organization
    public func requireOrgMembership(_ orgId: String) throws {
        let identity = try portalIdentity
        guard identity.isMemberOf(orgId) else {
            SecureLogger.security("Portal org membership denied", metadata: [
                "emailHash": identity.emailHash,
                "userId": identity.userId,
                "requestedOrgId": orgId
            ])
            throw PortalAuthError.notOrgMember(orgId)
        }
    }

    /// Get the organization ID to use for this request
    /// Prefers query param, falls back to primary org
    public func getPortalOrgContext() throws -> String {
        let identity = try portalIdentity

        // Check if orgId is specified in query params
        if let queryOrgId = try? query.get(String.self, at: "orgId"),
           !queryOrgId.isEmpty {
            // Verify membership
            guard identity.isMemberOf(queryOrgId) else {
                throw PortalAuthError.notOrgMember(queryOrgId)
            }
            return queryOrgId
        }

        // Fall back to primary org
        guard !identity.primaryOrgId.isEmpty else {
            throw PortalAuthError.accessDenied
        }

        return identity.primaryOrgId
    }
}

// MARK: - Route Group Extension

extension RoutesBuilder {
    /// Group routes that require portal authentication
    /// - Parameter config: App configuration
    /// - Returns: Route group with portal auth middleware
    public func portalProtected(
        config: AppConfig = .shared,
        jwtService: JWTService? = nil,
        usersService: UsersService? = nil,
        membershipsService: MembershipsService? = nil
    ) -> RoutesBuilder {
        let middleware = PortalAuthMiddleware(
            config: config,
            jwtService: jwtService,
            usersService: usersService,
            membershipsService: membershipsService
        )
        return self.grouped(middleware)
    }
}
