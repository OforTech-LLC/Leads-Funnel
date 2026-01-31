// =============================================================================
// AdminAuthMiddleware.swift
// LeadCaptureAPI/Middleware
// =============================================================================
// Admin authentication middleware for protected admin endpoints.
// Verifies JWT against Cognito JWKS and checks admin role.
// =============================================================================

import Foundation
import Vapor
import Crypto

// MARK: - Auth Admin Role

/// Internal admin role type for authentication purposes
/// Maps Cognito groups to permission levels
public enum AuthAdminRole: String, Codable, Sendable {
    case admin = "ADMIN"
    case viewer = "VIEWER"

    /// Check if this role can perform write operations
    public var canWrite: Bool {
        self == .admin
    }

    /// Check if this role can perform read operations
    public var canRead: Bool {
        true // Both roles can read
    }
}

// MARK: - Admin Identity

/// Authenticated admin identity stored in request
public struct AdminIdentity: Sendable {
    /// Admin email address (lowercase, trimmed)
    public let email: String

    /// SHA-256 hash of email for logging (safe to log)
    public let emailHash: String

    /// Admin role (authentication role)
    public let role: AuthAdminRole

    /// Cognito subject (user ID)
    public let sub: String

    /// Cognito groups
    public let groups: [String]

    /// Create admin identity from JWT claims
    init(email: String, sub: String, groups: [String]) {
        self.email = email.lowercased().trimmingCharacters(in: .whitespaces)
        self.emailHash = Self.computeEmailHash(email)
        self.sub = sub
        self.groups = groups
        self.role = Self.determineRole(from: groups)
    }

    /// Determine admin role from Cognito groups
    private static func determineRole(from groups: [String]) -> AuthAdminRole {
        // Map Cognito groups to internal roles
        let adminGroups: Set<String> = ["Admin", "SuperAdmin", "OrgAdmin", "ADMIN"]
        for group in groups {
            if adminGroups.contains(group) {
                return .admin
            }
        }
        return .viewer
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
}

// MARK: - Auth Error

/// Authentication/authorization errors
public enum AuthError: Error, AbortError, Sendable {
    case missingToken
    case invalidToken
    case expiredToken
    case missingEmail
    case notConfigured
    case allowlistEmpty
    case accessDenied
    case insufficientPermissions

    public var status: HTTPResponseStatus {
        switch self {
        case .missingToken, .invalidToken, .expiredToken, .missingEmail:
            return .unauthorized
        case .notConfigured, .allowlistEmpty:
            return .internalServerError
        case .accessDenied, .insufficientPermissions:
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
        case .notConfigured:
            return "Authentication not configured"
        case .allowlistEmpty:
            return "Admin access not configured"
        case .accessDenied:
            return "Access denied"
        case .insufficientPermissions:
            return "Insufficient permissions for this operation"
        }
    }
}

// MARK: - Admin Auth Middleware

/// Middleware for admin JWT authentication
/// Verifies JWT against Cognito JWKS and checks email allowlist
public final class AdminAuthMiddleware: AsyncMiddleware, @unchecked Sendable {

    // MARK: - Properties

    private let config: AppConfig
    private let jwtService: JWTService
    private let configService: ConfigService?

    /// Cognito issuer URL
    private let cognitoIssuer: String

    /// Cognito client ID (audience)
    private let cognitoClientId: String?

    /// SSM path for allowed emails
    private let allowedEmailsSSMPath: String?

    /// Paths that don't require authentication
    private let publicPaths: Set<String>

    /// Cookie name for admin token
    private let tokenCookieName = "admin_token"

    // MARK: - Initialization

    public init(
        config: AppConfig = .shared,
        jwtService: JWTService? = nil,
        configService: ConfigService? = nil,
        publicPaths: Set<String> = ["/health", "/"]
    ) {
        self.config = config
        self.jwtService = jwtService ?? JWTService()
        self.configService = configService
        self.publicPaths = publicPaths

        // Load Cognito configuration from environment
        self.cognitoIssuer = ProcessInfo.processInfo.environment["COGNITO_ISSUER"] ?? ""
        self.cognitoClientId = ProcessInfo.processInfo.environment["COGNITO_CLIENT_ID"]
        self.allowedEmailsSSMPath = ProcessInfo.processInfo.environment["ALLOWED_EMAILS_SSM_PATH"]
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
        request.storage[AdminIdentityKey.self] = identity

        // Log successful authentication (safe data only)
        SecureLogger.info("Admin authenticated", metadata: [
            "emailHash": identity.emailHash,
            "role": identity.role.rawValue,
            "path": request.url.path
        ])

        return try await next.respond(to: request)
    }

    // MARK: - Authentication

    /// Authenticate an admin request
    private func authenticate(request: Request) async throws -> AdminIdentity {
        // Extract token from header or cookie
        guard let token = extractToken(from: request) else {
            SecureLogger.security("Missing admin token", metadata: [
                "path": request.url.path,
                "ip": request.clientIP ?? "unknown"
            ])
            throw AuthError.missingToken
        }

        // Verify Cognito is configured
        guard !cognitoIssuer.isEmpty else {
            SecureLogger.error("COGNITO_ISSUER not configured")
            throw AuthError.notConfigured
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
            SecureLogger.security("JWT verification failed", metadata: [
                "path": request.url.path,
                "ip": request.clientIP ?? "unknown"
            ])
            throw AuthError.invalidToken
        }

        // Extract email from claims
        let email = claims.email ?? claims.cognitoUsername ?? ""
        guard !email.isEmpty else {
            SecureLogger.security("Token missing email claim", metadata: [
                "sub": claims.sub
            ])
            throw AuthError.missingEmail
        }

        // Check email allowlist
        try await verifyEmailAllowlist(email: email, request: request)

        // Build admin identity
        return AdminIdentity(
            email: email,
            sub: claims.sub,
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

    /// Verify email against allowlist
    private func verifyEmailAllowlist(email: String, request: Request) async throws {
        let allowlist = try await loadAllowlist()

        // Fail-closed: empty allowlist denies all access
        guard !allowlist.isEmpty else {
            SecureLogger.error("Admin allowlist is empty")
            throw AuthError.allowlistEmpty
        }

        let normalizedEmail = email.lowercased().trimmingCharacters(in: .whitespaces)
        guard allowlist.contains(normalizedEmail) else {
            SecureLogger.security("Email not in allowlist", metadata: [
                "emailHash": AdminIdentity.hashEmail(normalizedEmail),
                "path": request.url.path
            ])
            throw AuthError.accessDenied
        }
    }

    /// Load admin email allowlist from SSM or environment
    private func loadAllowlist() async throws -> [String] {
        // Try to load from ConfigService (SSM) first
        if let configService = configService, allowedEmailsSSMPath != nil {
            let emails = await configService.getList("admin_allowed_emails")
            if !emails.isEmpty {
                return emails.map { $0.lowercased().trimmingCharacters(in: .whitespaces) }
            }
        }

        // Fall back to environment variable
        if let envEmails = ProcessInfo.processInfo.environment["ADMIN_ALLOWED_EMAILS"] {
            return envEmails
                .split(separator: ",")
                .map { $0.trimmingCharacters(in: .whitespaces).lowercased() }
                .filter { !$0.isEmpty }
        }

        return []
    }
}

// MARK: - Storage Key

/// Storage key for admin identity
public struct AdminIdentityKey: StorageKey {
    public typealias Value = AdminIdentity
}

// MARK: - Request Extension

extension Request {
    /// Get the authenticated admin identity
    /// Throws if not authenticated
    public var adminIdentity: AdminIdentity {
        get throws {
            guard let identity = storage[AdminIdentityKey.self] else {
                throw AuthError.missingToken
            }
            return identity
        }
    }

    /// Check if the current admin can perform write operations
    public func requireWritePermission() throws {
        let identity = try adminIdentity
        guard identity.role.canWrite else {
            SecureLogger.security("Write permission denied", metadata: [
                "emailHash": identity.emailHash,
                "role": identity.role.rawValue,
                "path": url.path
            ])
            throw AuthError.insufficientPermissions
        }
    }

    /// Check if the current admin can perform read operations
    public func requireReadPermission() throws {
        let identity = try adminIdentity
        guard identity.role.canRead else {
            throw AuthError.insufficientPermissions
        }
    }
}

// MARK: - Vapor Integration

extension Application {
    /// Configure admin authentication middleware
    public func configureAdminAuth(
        config: AppConfig = .shared,
        jwtService: JWTService? = nil,
        configService: ConfigService? = nil,
        publicPaths: Set<String> = ["/health", "/"]
    ) {
        middleware.use(AdminAuthMiddleware(
            config: config,
            jwtService: jwtService,
            configService: configService,
            publicPaths: publicPaths
        ))
    }
}

// MARK: - Route Group Extension

extension RoutesBuilder {
    /// Group routes that require admin authentication
    /// - Parameter role: Required admin role (default: any authenticated admin)
    /// - Returns: Route group with admin auth middleware
    public func adminProtected(role: AuthAdminRole? = nil) -> RoutesBuilder {
        let middleware = AdminAuthMiddleware()
        let group = self.grouped(middleware)

        // If a specific role is required, add role-checking middleware
        if let requiredRole = role {
            return group.grouped(AuthAdminRoleMiddleware(requiredRole: requiredRole))
        }

        return group
    }
}

// MARK: - Role Middleware

/// Middleware to check for specific admin role
public final class AuthAdminRoleMiddleware: AsyncMiddleware, Sendable {

    private let requiredRole: AuthAdminRole

    public init(requiredRole: AuthAdminRole) {
        self.requiredRole = requiredRole
    }

    public func respond(to request: Request, chainingTo next: AsyncResponder) async throws -> Response {
        let identity = try request.adminIdentity

        // Check if user has required role
        switch requiredRole {
        case .admin:
            guard identity.role == .admin else {
                throw AuthError.insufficientPermissions
            }
        case .viewer:
            // Viewer role is the minimum, all authenticated admins have at least this
            break
        }

        return try await next.respond(to: request)
    }
}

// MARK: - Write Permission Middleware

/// Middleware that requires write permission for a route
public final class WritePermissionMiddleware: AsyncMiddleware, Sendable {

    public init() {}

    public func respond(to request: Request, chainingTo next: AsyncResponder) async throws -> Response {
        try request.requireWritePermission()
        return try await next.respond(to: request)
    }
}

// MARK: - Route Builder Extension for Permissions

extension RoutesBuilder {
    /// Group routes that require admin write permission
    public func requireWrite() -> RoutesBuilder {
        self.grouped(WritePermissionMiddleware())
    }
}
