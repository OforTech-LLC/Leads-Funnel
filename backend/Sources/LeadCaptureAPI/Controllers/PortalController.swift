// =============================================================================
// PortalController.swift
// LeadCaptureAPI/Controllers
// =============================================================================
// Portal API endpoints for organization agents/managers.
// Handles user profile, leads management, and notifications.
//
// All endpoints require portal JWT authentication.
// Users can only access leads assigned to their organizations.
//
// Endpoints:
//   GET  /portal/me                              - Current user profile
//   PUT  /portal/me                              - Update profile
//   POST /portal/me/avatar                       - Generate avatar upload URL
//   GET  /portal/org                             - User's primary org details
//   GET  /portal/org/members                     - List org team members
//   GET  /portal/leads                           - List leads for user's org(s)
//   GET  /portal/leads/:funnelId/:leadId         - Get single lead
//   PUT  /portal/leads/:funnelId/:leadId/status  - Update lead status
//   POST /portal/leads/:funnelId/:leadId/notes   - Add note to lead
//   PUT  /portal/leads/:funnelId/:leadId/assign  - Assign lead to user
//   GET  /portal/dashboard                       - Dashboard stats
//   GET  /portal/notifications                   - Get user notifications
//   PUT  /portal/notifications/:id/read          - Mark notification read
//   GET  /portal/settings                        - Get user settings
//   PUT  /portal/settings                        - Update user settings
// =============================================================================

import Foundation
import Vapor
import SotoCore
import Shared

// MARK: - Portal Controller

/// Controller for portal endpoints
public struct PortalController: RouteCollection {

    // MARK: - Properties

    private let usersService: UsersService
    private let orgsService: OrgsService
    private let membershipsService: MembershipsService
    private let jwtService: JWTService
    private let config: AppConfig

    // MARK: - Constants

    private static let maxNoteLength = 2000
    private static let maxNotesPerLead = 100
    private static let minProfileNameLength = 2
    private static let maxProfileNameLength = 120
    private static let maxProfilePhoneLength = 40
    private static let minProfilePhoneDigits = 7
    private static let maxAvatarSizeBytes = 2 * 1024 * 1024 // 2MB
    private static let allowedAvatarMimeTypes: Set<String> = ["image/jpeg", "image/png", "image/webp"]

    // MARK: - Initialization

    public init(
        usersService: UsersService,
        orgsService: OrgsService,
        membershipsService: MembershipsService,
        jwtService: JWTService? = nil,
        config: AppConfig = .shared
    ) {
        self.usersService = usersService
        self.orgsService = orgsService
        self.membershipsService = membershipsService
        self.jwtService = jwtService ?? JWTService()
        self.config = config
    }

    // MARK: - Route Registration

    public func boot(routes: RoutesBuilder) throws {
        // Apply portal authentication middleware to all portal routes
        let portal = routes.grouped("portal").portalProtected(
            config: config,
            jwtService: jwtService,
            usersService: usersService,
            membershipsService: membershipsService
        )

        // Profile endpoints
        portal.get("me", use: getProfile)
        portal.put("me", use: updateProfile)
        portal.post("me", "avatar", use: generateAvatarUploadUrl)

        // Organization endpoints
        portal.get("org", use: getOrg)
        portal.get("org", "members", use: getOrgMembers)

        // Leads endpoints
        portal.get("leads", use: listLeads)
        portal.get("leads", ":funnelId", ":leadId", use: getLead)
        portal.put("leads", ":funnelId", ":leadId", "status", use: updateLeadStatus)
        portal.patch("leads", ":funnelId", ":leadId", "status", use: updateLeadStatus)
        portal.post("leads", ":funnelId", ":leadId", "notes", use: addLeadNote)
        portal.put("leads", ":funnelId", ":leadId", "assign", use: assignLead)
        portal.patch("leads", ":funnelId", ":leadId", "assign", use: assignLead)

        // Bulk operations
        portal.post("leads", "bulk", "status", use: bulkUpdateStatus)
        portal.post("leads", "bulk", "assign", use: bulkAssign)

        // Dashboard
        portal.get("dashboard", use: getDashboard)

        // Analytics (subset of admin analytics for portal users)
        portal.get("analytics", "overview", use: getAnalyticsOverview)

        // Notifications
        portal.get("notifications", use: listNotifications)
        portal.get("notifications", "count", use: getNotificationCount)
        portal.put("notifications", ":notificationId", "read", use: markNotificationRead)
        portal.post("notifications", "mark-all-read", use: markAllNotificationsRead)

        // Settings
        portal.get("settings", use: getSettings)
        portal.put("settings", use: updateSettings)
    }

    // MARK: - Profile Endpoints

    /// GET /portal/me - Get current user profile
    @Sendable
    func getProfile(req: Request) async throws -> Response {
        let identity = try req.portalIdentity

        guard let user = try await usersService.getUser(identity.userId) else {
            throw Abort(.notFound, reason: "User not found")
        }

        // Get membership for role info
        let membership = !identity.primaryOrgId.isEmpty
            ? try? await membershipsService.getMember(orgId: identity.primaryOrgId, userId: identity.userId)
            : nil

        let profile = buildPortalProfile(user: user, membership: membership, identity: identity)
        return try createJsonResponse(profile, status: .ok)
    }

    /// PUT /portal/me - Update user profile
    @Sendable
    func updateProfile(req: Request) async throws -> Response {
        let identity = try req.portalIdentity

        let body = try req.content.decode(UpdateProfileRequest.self)

        // Validate name if provided
        if let firstName = body.firstName, let lastName = body.lastName {
            guard firstName.count >= Self.minProfileNameLength else {
                throw Abort(.badRequest, reason: "firstName is too short")
            }
            guard lastName.count >= Self.minProfileNameLength else {
                throw Abort(.badRequest, reason: "lastName is too short")
            }
            guard firstName.count <= Self.maxProfileNameLength,
                  lastName.count <= Self.maxProfileNameLength else {
                throw Abort(.badRequest, reason: "Name is too long")
            }
        }

        // Validate phone if provided
        if let phone = body.phone, !phone.isEmpty {
            guard phone.count <= Self.maxProfilePhoneLength else {
                throw Abort(.badRequest, reason: "phone is too long")
            }
            guard countDigits(phone) >= Self.minProfilePhoneDigits else {
                throw Abort(.badRequest, reason: "phone must include at least 7 digits")
            }
        }

        // Build update input
        var name: String?
        if let firstName = body.firstName, let lastName = body.lastName {
            name = "\(firstName.trimmingCharacters(in: .whitespaces)) \(lastName.trimmingCharacters(in: .whitespaces))"
        }

        let updateInput = UpdateUserInput(
            userId: identity.userId,
            name: name,
            phone: body.phone,
            avatarUrl: body.avatarUrl
        )

        let updated = try await usersService.updateUser(updateInput)

        // Get membership for role info
        let membership = !identity.primaryOrgId.isEmpty
            ? try? await membershipsService.getMember(orgId: identity.primaryOrgId, userId: identity.userId)
            : nil

        let profile = buildPortalProfile(user: updated, membership: membership, identity: identity)
        return try createJsonResponse(profile, status: .ok)
    }

    /// POST /portal/me/avatar - Generate presigned URL for avatar upload
    @Sendable
    func generateAvatarUploadUrl(req: Request) async throws -> Response {
        let identity = try req.portalIdentity

        let body = try req.content.decode(AvatarUploadRequest.self)

        let contentType = body.contentType.trimmingCharacters(in: .whitespaces).lowercased()
        guard Self.allowedAvatarMimeTypes.contains(contentType) else {
            throw Abort(.badRequest, reason: "Unsupported avatar contentType")
        }

        guard body.contentLength > 0 else {
            throw Abort(.badRequest, reason: "contentLength must be a positive number")
        }

        guard body.contentLength <= Self.maxAvatarSizeBytes else {
            throw Abort(.badRequest, reason: "Avatar exceeds max size of 2MB")
        }

        // In a real implementation, this would use S3 presigned URLs
        // For now, return a placeholder response
        let avatarResponse = AvatarUploadResponse(
            uploadUrl: "https://placeholder.example.com/upload",
            publicUrl: "https://placeholder.example.com/avatars/\(identity.userId)/avatar.\(getAvatarExtension(contentType))",
            headers: ["Content-Type": contentType],
            maxBytes: Self.maxAvatarSizeBytes
        )

        return try createJsonResponse(avatarResponse, status: .ok)
    }

    // MARK: - Organization Endpoints

    /// GET /portal/org - Get user's organization details
    @Sendable
    func getOrg(req: Request) async throws -> Response {
        let identity = try req.portalIdentity
        let orgId = try req.getPortalOrgContext()

        guard let org = try await orgsService.getOrg(orgId) else {
            throw Abort(.notFound, reason: "Organization not found")
        }

        let members = try await membershipsService.listOrgMembers(orgId: orgId, limit: 100)

        let portalOrg = PortalOrganization(
            id: org.orgId,
            name: org.name,
            slug: org.slug,
            logoUrl: extractStringFromSettings(org.settings, key: "logoUrl"),
            plan: extractStringFromSettings(org.settings, key: "plan") ?? "starter",
            memberCount: members.items.count,
            leadsUsed: extractIntFromSettings(org.settings, key: "leadsUsed"),
            leadsLimit: extractIntFromSettings(org.settings, key: "leadsLimit"),
            createdAt: org.createdAt
        )

        return try createJsonResponse(portalOrg, status: .ok)
    }

    /// GET /portal/org/members - List organization team members
    @Sendable
    func getOrgMembers(req: Request) async throws -> Response {
        let identity = try req.portalIdentity
        let orgId = try req.getPortalOrgContext()

        let members = try await membershipsService.listOrgMembers(orgId: orgId, limit: 100)

        var teamMembers: [PortalTeamMember] = []
        for member in members.items {
            if let user = try? await usersService.getUser(member.userId) {
                let (firstName, lastName) = splitName(user.name)
                teamMembers.append(PortalTeamMember(
                    userId: member.userId,
                    email: user.email,
                    firstName: firstName,
                    lastName: lastName,
                    role: mapMembershipRoleToTeamRole(member.role),
                    status: "active",
                    avatarUrl: user.avatarUrl,
                    lastActiveAt: nil,
                    joinedAt: member.joinedAt
                ))
            }
        }

        return try createJsonResponse(teamMembers, status: .ok)
    }

    // MARK: - Leads Endpoints

    /// GET /portal/leads - List leads for user's organization
    @Sendable
    func listLeads(req: Request) async throws -> Response {
        let identity = try req.portalIdentity
        let orgId = try req.getPortalOrgContext()

        // Get user's role to determine access level
        guard let membership = try await membershipsService.getMember(orgId: orgId, userId: identity.userId) else {
            throw Abort(.forbidden, reason: "Not a member of this org")
        }

        let role = mapMembershipRoleToPortalRole(membership.role)

        // Agents can only see their assigned leads
        // Managers and admins can see all org leads
        let assignedUserIdFilter: String? = role.canViewAllOrgLeads ? nil : identity.userId

        // Parse query parameters
        let funnelId = try? req.query.get(String.self, at: "funnelId")
        let status = try? req.query.get(String.self, at: "status")
        let startDate = try? req.query.get(String.self, at: "startDate") ?? req.query.get(String.self, at: "dateFrom")
        let endDate = try? req.query.get(String.self, at: "endDate") ?? req.query.get(String.self, at: "dateTo")
        let cursor = try? req.query.get(String.self, at: "cursor")
        let limit = (try? req.query.get(Int.self, at: "limit")) ?? 25

        // TODO: Implement actual leads query using a PlatformLeadsService
        // For now, return empty list as placeholder
        let response = PaginatedPortalLeads(
            data: [],
            nextCursor: nil,
            total: 0
        )

        return try createJsonResponse(response, status: .ok)
    }

    /// GET /portal/leads/:funnelId/:leadId - Get single lead
    @Sendable
    func getLead(req: Request) async throws -> Response {
        let identity = try req.portalIdentity

        guard let funnelId = req.parameters.get("funnelId"),
              let leadId = req.parameters.get("leadId") else {
            throw Abort(.badRequest, reason: "funnelId and leadId are required")
        }

        // TODO: Implement actual lead retrieval and access check
        throw Abort(.notFound, reason: "Lead not found")
    }

    /// PUT/PATCH /portal/leads/:funnelId/:leadId/status - Update lead status
    @Sendable
    func updateLeadStatus(req: Request) async throws -> Response {
        let identity = try req.portalIdentity

        guard let funnelId = req.parameters.get("funnelId"),
              let leadId = req.parameters.get("leadId") else {
            throw Abort(.badRequest, reason: "funnelId and leadId are required")
        }

        let body = try req.content.decode(UpdateLeadStatusRequest.self)

        guard let status = body.status, !status.isEmpty else {
            throw Abort(.badRequest, reason: "status is required")
        }

        let validStatuses: Set<String> = [
            "new", "assigned", "unassigned", "contacted", "qualified",
            "booked", "converted", "won", "lost", "dnc", "quarantined"
        ]
        guard validStatuses.contains(status) else {
            throw Abort(.badRequest, reason: "Invalid status. Must be one of: \(validStatuses.sorted().joined(separator: ", "))")
        }

        // TODO: Implement actual lead update
        throw Abort(.notFound, reason: "Lead not found")
    }

    /// POST /portal/leads/:funnelId/:leadId/notes - Add note to lead
    @Sendable
    func addLeadNote(req: Request) async throws -> Response {
        let identity = try req.portalIdentity

        guard let funnelId = req.parameters.get("funnelId"),
              let leadId = req.parameters.get("leadId") else {
            throw Abort(.badRequest, reason: "funnelId and leadId are required")
        }

        let body = try req.content.decode(AddLeadNoteRequest.self)

        guard let note = body.note?.trimmingCharacters(in: .whitespaces), !note.isEmpty else {
            throw Abort(.badRequest, reason: "note is required and must be non-empty")
        }

        guard note.count <= Self.maxNoteLength else {
            throw Abort(.badRequest, reason: "Note must be \(Self.maxNoteLength) characters or less")
        }

        // TODO: Implement actual note addition
        throw Abort(.notFound, reason: "Lead not found")
    }

    /// PUT/PATCH /portal/leads/:funnelId/:leadId/assign - Assign lead to user
    @Sendable
    func assignLead(req: Request) async throws -> Response {
        let identity = try req.portalIdentity

        guard let funnelId = req.parameters.get("funnelId"),
              let leadId = req.parameters.get("leadId") else {
            throw Abort(.badRequest, reason: "funnelId and leadId are required")
        }

        let body = try req.content.decode(AssignLeadRequest.self)

        // TODO: Implement actual lead assignment
        throw Abort(.notFound, reason: "Lead not found")
    }

    /// POST /portal/leads/bulk/status - Bulk update lead status
    @Sendable
    func bulkUpdateStatus(req: Request) async throws -> Response {
        let identity = try req.portalIdentity

        let body = try req.content.decode(BulkStatusUpdateRequest.self)

        guard let status = body.status, !status.isEmpty else {
            throw Abort(.badRequest, reason: "status is required")
        }

        guard !body.leads.isEmpty else {
            throw Abort(.badRequest, reason: "leads array is required")
        }

        // TODO: Implement actual bulk update
        let result = BulkOperationResult(updated: 0)
        return try createJsonResponse(result, status: .ok)
    }

    /// POST /portal/leads/bulk/assign - Bulk assign leads
    @Sendable
    func bulkAssign(req: Request) async throws -> Response {
        let identity = try req.portalIdentity

        let body = try req.content.decode(BulkAssignRequest.self)

        guard let assignedTo = body.assignedTo, !assignedTo.isEmpty else {
            throw Abort(.badRequest, reason: "assignedTo is required")
        }

        guard !body.leads.isEmpty else {
            throw Abort(.badRequest, reason: "leads array is required")
        }

        // TODO: Implement actual bulk assignment
        let result = BulkOperationResult(updated: 0)
        return try createJsonResponse(result, status: .ok)
    }

    // MARK: - Dashboard Endpoints

    /// GET /portal/dashboard - Get dashboard statistics
    @Sendable
    func getDashboard(req: Request) async throws -> Response {
        let identity = try req.portalIdentity
        let orgId = try req.getPortalOrgContext()

        // TODO: Implement actual dashboard stats
        let dashboard = PortalDashboard(
            newLeadsToday: 0,
            totalActiveLeads: 0,
            leadsByStatus: [:],
            recentLeads: []
        )

        return try createJsonResponse(dashboard, status: .ok)
    }

    /// GET /portal/analytics/overview - Get analytics overview
    @Sendable
    func getAnalyticsOverview(req: Request) async throws -> Response {
        let identity = try req.portalIdentity
        let orgId = try req.getPortalOrgContext()

        // TODO: Implement actual analytics
        let overview = PortalAnalyticsOverview(
            newLeadsToday: 0,
            totalActiveLeads: 0,
            wonCount: 0,
            bookedCount: 0,
            conversionRate: 0,
            avgResponseTimeMinutes: 0,
            trends: [:]
        )

        return try createJsonResponse(overview, status: .ok)
    }

    // MARK: - Notification Endpoints

    /// GET /portal/notifications - List user notifications
    @Sendable
    func listNotifications(req: Request) async throws -> Response {
        let identity = try req.portalIdentity

        // TODO: Implement actual notifications
        let response = PaginatedPortalNotifications(
            data: [],
            nextCursor: nil,
            total: 0
        )

        return try createJsonResponse(response, status: .ok)
    }

    /// GET /portal/notifications/count - Get unread notification count
    @Sendable
    func getNotificationCount(req: Request) async throws -> Response {
        let identity = try req.portalIdentity

        let result = NotificationCountResult(unread: 0)
        return try createJsonResponse(result, status: .ok)
    }

    /// PUT /portal/notifications/:notificationId/read - Mark notification as read
    @Sendable
    func markNotificationRead(req: Request) async throws -> Response {
        let identity = try req.portalIdentity

        guard let notificationId = req.parameters.get("notificationId") else {
            throw Abort(.badRequest, reason: "notificationId is required")
        }

        let result = UpdateResult(updated: true)
        return try createJsonResponse(result, status: .ok)
    }

    /// POST /portal/notifications/mark-all-read - Mark all notifications as read
    @Sendable
    func markAllNotificationsRead(req: Request) async throws -> Response {
        let identity = try req.portalIdentity

        let result = UpdateResult(updated: true)
        return try createJsonResponse(result, status: .ok)
    }

    // MARK: - Settings Endpoints

    /// GET /portal/settings - Get user settings
    @Sendable
    func getSettings(req: Request) async throws -> Response {
        let identity = try req.portalIdentity

        guard let user = try await usersService.getUser(identity.userId) else {
            throw Abort(.notFound, reason: "User not found")
        }

        let prefs = parsePortalPreferences(user.preferences)

        let settings = PortalSettings(
            emailNotifications: prefs.notificationPreferences.emailNotifications,
            smsNotifications: prefs.notificationPreferences.smsNotifications,
            categories: prefs.servicePreferences.categories,
            zipCodes: prefs.servicePreferences.zipCodes
        )

        return try createJsonResponse(settings, status: .ok)
    }

    /// PUT /portal/settings - Update user settings
    @Sendable
    func updateSettings(req: Request) async throws -> Response {
        let identity = try req.portalIdentity

        guard let user = try await usersService.getUser(identity.userId) else {
            throw Abort(.notFound, reason: "User not found")
        }

        let body = try req.content.decode(UpdateSettingsRequest.self)

        // Build updated preferences
        var prefs = user.preferences

        if let emailNotifications = body.emailNotifications {
            var notifPrefs = prefs["notificationPreferences"]?.value as? [String: Any] ?? [:]
            notifPrefs["emailNotifications"] = emailNotifications
            prefs["notificationPreferences"] = AnyCodable(notifPrefs)
        }

        if let smsNotifications = body.smsNotifications {
            var notifPrefs = prefs["notificationPreferences"]?.value as? [String: Any] ?? [:]
            notifPrefs["smsNotifications"] = smsNotifications
            prefs["notificationPreferences"] = AnyCodable(notifPrefs)
        }

        // Also update membership notification settings if either is provided
        if body.emailNotifications != nil || body.smsNotifications != nil {
            if !identity.primaryOrgId.isEmpty {
                _ = try? await membershipsService.updateMember(UpdateMemberInput(
                    orgId: identity.primaryOrgId,
                    userId: identity.userId,
                    notifyEmail: body.emailNotifications,
                    notifySms: body.smsNotifications
                ))
            }
        }

        // Update user preferences
        let updateInput = UpdateUserInput(
            userId: identity.userId,
            preferences: prefs
        )

        let _ = try await usersService.updateUser(updateInput)

        let result = UpdateResult(updated: true)
        return try createJsonResponse(result, status: .ok)
    }

    // MARK: - Private Helpers

    private func createJsonResponse<T: Encodable>(_ data: T, status: HTTPStatus) throws -> Response {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let jsonData = try encoder.encode(data)

        let response = Response(status: status)
        response.headers.contentType = .json
        response.body = .init(data: jsonData)
        return response
    }

    private func splitName(_ fullName: String?) -> (firstName: String, lastName: String) {
        guard let fullName = fullName?.trimmingCharacters(in: .whitespaces), !fullName.isEmpty else {
            return ("", "")
        }
        let parts = fullName.split(separator: " ", maxSplits: 1)
        if parts.count == 1 {
            return (String(parts[0]), "")
        }
        return (String(parts[0]), String(parts[1]))
    }

    private func countDigits(_ value: String) -> Int {
        return value.filter { $0.isNumber }.count
    }

    private func getAvatarExtension(_ contentType: String) -> String {
        switch contentType {
        case "image/jpeg": return "jpg"
        case "image/png": return "png"
        case "image/webp": return "webp"
        default: return "jpg"
        }
    }

    private func mapMembershipRoleToPortalRole(_ role: MembershipRole) -> PortalRole {
        switch role {
        case .orgOwner: return .admin
        case .manager: return .manager
        case .agent: return .agent
        case .viewer: return .viewer
        }
    }

    private func mapMembershipRoleToTeamRole(_ role: MembershipRole) -> String {
        switch role {
        case .orgOwner, .manager: return "admin"
        default: return "agent"
        }
    }

    private func buildPortalProfile(
        user: User,
        membership: Membership?,
        identity: PortalIdentity
    ) -> PortalProfile {
        let (firstName, lastName) = splitName(user.name)
        let prefs = parsePortalPreferences(user.preferences)
        let completeness = buildProfileCompleteness(user: user, firstName: firstName, lastName: lastName)

        return PortalProfile(
            id: user.userId,
            email: user.email,
            firstName: firstName,
            lastName: lastName,
            role: mapMembershipRoleToPortalRole(membership?.role ?? .agent).rawValue,
            orgIds: identity.orgIds,
            primaryOrgId: identity.primaryOrgId,
            avatarUrl: user.avatarUrl,
            phone: user.phone,
            notificationPreferences: PortalNotificationPreferences(
                emailNotifications: membership?.notifyEmail ?? prefs.notificationPreferences.emailNotifications,
                smsNotifications: membership?.notifySms ?? prefs.notificationPreferences.smsNotifications
            ),
            profileCompleteness: completeness,
            createdAt: user.createdAt
        )
    }

    private func buildProfileCompleteness(user: User, firstName: String, lastName: String) -> PortalProfileCompleteness {
        var missingFields: [String] = []

        if firstName.trimmingCharacters(in: .whitespaces).isEmpty {
            missingFields.append("firstName")
        }
        if lastName.trimmingCharacters(in: .whitespaces).isEmpty {
            missingFields.append("lastName")
        }
        if let phone = user.phone, countDigits(phone) < Self.minProfilePhoneDigits {
            missingFields.append("phone")
        } else if user.phone == nil || user.phone!.isEmpty {
            missingFields.append("phone")
        }
        if user.avatarUrl == nil || user.avatarUrl!.trimmingCharacters(in: .whitespaces).isEmpty {
            missingFields.append("avatarUrl")
        }

        let totalFields = 4
        let completed = totalFields - missingFields.count
        let score = Int(Double(completed) / Double(totalFields) * 100)

        return PortalProfileCompleteness(
            score: score,
            missingFields: missingFields,
            isComplete: missingFields.isEmpty
        )
    }

    private func parsePortalPreferences(_ prefs: [String: AnyCodable]) -> ParsedPortalPreferences {
        let notifPrefs = prefs["notificationPreferences"]?.value as? [String: Any] ?? [:]
        let servicePrefs = prefs["servicePreferences"]?.value as? [String: Any] ?? [:]

        return ParsedPortalPreferences(
            notificationPreferences: PortalNotificationPreferences(
                emailNotifications: notifPrefs["emailNotifications"] as? Bool ?? true,
                smsNotifications: notifPrefs["smsNotifications"] as? Bool ?? false
            ),
            servicePreferences: PortalServicePreferencesInternal(
                categories: servicePrefs["categories"] as? [String] ?? [],
                zipCodes: servicePrefs["zipCodes"] as? [String] ?? []
            )
        )
    }

    private func extractStringFromSettings(_ settings: [String: AnyCodable], key: String) -> String? {
        return settings[key]?.value as? String
    }

    private func extractIntFromSettings(_ settings: [String: AnyCodable], key: String) -> Int? {
        return settings[key]?.value as? Int
    }
}

// MARK: - Request/Response DTOs

/// Update profile request body
public struct UpdateProfileRequest: Content {
    public let firstName: String?
    public let lastName: String?
    public let phone: String?
    public let avatarUrl: String?
}

/// Avatar upload request body
public struct AvatarUploadRequest: Content {
    public let contentType: String
    public let contentLength: Int
}

/// Avatar upload response
public struct AvatarUploadResponse: Content {
    public let uploadUrl: String
    public let publicUrl: String
    public let headers: [String: String]
    public let maxBytes: Int
}

/// Update lead status request body
public struct UpdateLeadStatusRequest: Content {
    public let status: String?
}

/// Add lead note request body
public struct AddLeadNoteRequest: Content {
    public let note: String?
}

/// Assign lead request body
public struct AssignLeadRequest: Content {
    public let assignedTo: String?
}

/// Bulk status update request body
public struct BulkStatusUpdateRequest: Content {
    public let leads: [LeadReference]
    public let status: String?
}

/// Bulk assign request body
public struct BulkAssignRequest: Content {
    public let leads: [LeadReference]
    public let assignedTo: String?
}

/// Lead reference for bulk operations
public struct LeadReference: Content {
    public let funnelId: String?
    public let leadId: String?
}

/// Update settings request body
public struct UpdateSettingsRequest: Content {
    public let emailNotifications: Bool?
    public let smsNotifications: Bool?
    public let categories: [String]?
    public let zipCodes: [String]?
}

/// Bulk operation result
public struct BulkOperationResult: Content {
    public let updated: Int
}

/// Update result
public struct UpdateResult: Content {
    public let updated: Bool
}

/// Notification count result
public struct NotificationCountResult: Content {
    public let unread: Int
}

/// Portal settings response
public struct PortalSettings: Content {
    public let emailNotifications: Bool
    public let smsNotifications: Bool
    public let categories: [String]
    public let zipCodes: [String]
}

// MARK: - Response Models

/// Portal user profile
public struct PortalProfile: Content {
    public let id: String
    public let email: String
    public let firstName: String
    public let lastName: String
    public let role: String
    public let orgIds: [String]
    public let primaryOrgId: String
    public let avatarUrl: String?
    public let phone: String?
    public let notificationPreferences: PortalNotificationPreferences
    public let profileCompleteness: PortalProfileCompleteness
    public let createdAt: String
}

/// Notification preferences
public struct PortalNotificationPreferences: Content {
    public let emailNotifications: Bool
    public let smsNotifications: Bool
}

/// Profile completeness info
public struct PortalProfileCompleteness: Content {
    public let score: Int
    public let missingFields: [String]
    public let isComplete: Bool
}

/// Portal organization info
public struct PortalOrganization: Content {
    public let id: String
    public let name: String
    public let slug: String
    public let logoUrl: String?
    public let plan: String
    public let memberCount: Int
    public let leadsUsed: Int?
    public let leadsLimit: Int?
    public let createdAt: String?
}

/// Portal team member
public struct PortalTeamMember: Content {
    public let userId: String
    public let email: String
    public let firstName: String
    public let lastName: String
    public let role: String
    public let status: String
    public let avatarUrl: String?
    public let lastActiveAt: String?
    public let joinedAt: String
}

/// Paginated portal leads response
public struct PaginatedPortalLeads: Content {
    public let data: [PortalLeadResponse]
    public let nextCursor: String?
    public let total: Int
}

/// Portal lead response
public struct PortalLeadResponse: Content {
    public let id: String
    public let funnelId: String
    public let funnelName: String
    public let firstName: String
    public let lastName: String
    public let email: String
    public let phone: String
    public let zip: String
    public let city: String
    public let state: String
    public let status: String
    public let assignedTo: String?
    public let assignedName: String?
    public let notes: [PortalLeadNote]
    public let timeline: [PortalTimelineEvent]
    public let qualityScore: Int?
    public let createdAt: String
    public let updatedAt: String
}

/// Portal lead note
public struct PortalLeadNote: Content {
    public let id: String
    public let leadId: String
    public let authorId: String
    public let authorName: String
    public let content: String
    public let createdAt: String
}

/// Portal timeline event
public struct PortalTimelineEvent: Content {
    public let id: String
    public let leadId: String
    public let type: String
    public let description: String
    public let performedBy: String
    public let performedByName: String
    public let metadata: [String: String]?
    public let createdAt: String
}

/// Portal dashboard response
public struct PortalDashboard: Content {
    public let newLeadsToday: Int
    public let totalActiveLeads: Int
    public let leadsByStatus: [String: Int]
    public let recentLeads: [PortalLeadResponse]
}

/// Portal analytics overview
public struct PortalAnalyticsOverview: Content {
    public let newLeadsToday: Int
    public let totalActiveLeads: Int
    public let wonCount: Int
    public let bookedCount: Int
    public let conversionRate: Int
    public let avgResponseTimeMinutes: Int
    public let trends: [String: PortalAnalyticsTrend]
}

/// Analytics trend data
public struct PortalAnalyticsTrend: Content {
    public let direction: String
    public let percentage: Int
    public let previousValue: Int
}

/// Paginated notifications response
public struct PaginatedPortalNotifications: Content {
    public let data: [PortalNotification]
    public let nextCursor: String?
    public let total: Int
}

/// Portal notification
public struct PortalNotification: Content {
    public let id: String
    public let type: String
    public let title: String
    public let message: String
    public let read: Bool
    public let leadId: String?
    public let funnelId: String?
    public let createdAt: String
}

// MARK: - Internal Types

/// Parsed portal preferences
private struct ParsedPortalPreferences {
    let notificationPreferences: PortalNotificationPreferences
    let servicePreferences: PortalServicePreferencesInternal
}

/// Service preferences (internal, not Codable)
private struct PortalServicePreferencesInternal {
    let categories: [String]
    let zipCodes: [String]
}

// MARK: - Vapor Storage Keys

public struct PortalControllerKey: Vapor.StorageKey {
    public typealias Value = PortalController
}
