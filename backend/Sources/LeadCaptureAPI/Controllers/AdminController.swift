// =============================================================================
// AdminController.swift
// LeadCaptureAPI/Controllers
// =============================================================================
// Admin API endpoints for platform management.
//
// All routes require admin authentication via AdminAuthMiddleware.
// Write operations require admin role (not viewer).
//
// Endpoints:
//   GET/POST /admin/orgs, GET/PUT/DELETE /admin/orgs/:orgId
//   GET/POST /admin/users, GET/PUT/DELETE /admin/users/:userId
//   GET/POST/PUT/DELETE /admin/orgs/:orgId/members
//   GET/POST /admin/rules, GET/PUT/DELETE /admin/rules/:ruleId
//   POST /admin/query (lead search)
//   GET/PUT /admin/leads/:funnelId/:leadId
//   POST /admin/exports
//   GET /admin/analytics/overview
// =============================================================================

import Foundation
import Vapor

// MARK: - Admin Controller

/// Controller for admin API endpoints
public struct AdminController: RouteCollection {

    // MARK: - Properties

    private let orgsService: OrgsService
    private let usersService: UsersService
    private let membershipsService: MembershipsService
    private let rulesService: RulesService
    private let exportsService: ExportsService
    private let notificationsService: NotificationsService
    private let config: AppConfig

    // MARK: - Initialization

    public init(
        orgsService: OrgsService,
        usersService: UsersService,
        membershipsService: MembershipsService,
        rulesService: RulesService,
        exportsService: ExportsService,
        notificationsService: NotificationsService,
        config: AppConfig = .shared
    ) {
        self.orgsService = orgsService
        self.usersService = usersService
        self.membershipsService = membershipsService
        self.rulesService = rulesService
        self.exportsService = exportsService
        self.notificationsService = notificationsService
        self.config = config
    }

    // MARK: - Route Registration

    public func boot(routes: RoutesBuilder) throws {
        // All admin routes require authentication
        let admin = routes.grouped("admin")
            .grouped(AdminAuthMiddleware())

        // Organizations
        admin.get("orgs", use: listOrgs)
        admin.post("orgs", use: createOrg)
        admin.get("orgs", ":orgId", use: getOrg)
        admin.put("orgs", ":orgId", use: updateOrg)
        admin.delete("orgs", ":orgId", use: deleteOrg)

        // Users
        admin.get("users", use: listUsers)
        admin.post("users", use: createUser)
        admin.get("users", ":userId", use: getUser)
        admin.put("users", ":userId", use: updateUser)
        admin.delete("users", ":userId", use: deleteUser)

        // Memberships
        admin.get("orgs", ":orgId", "members", use: listOrgMembers)
        admin.post("orgs", ":orgId", "members", use: addOrgMember)
        admin.put("orgs", ":orgId", "members", ":userId", use: updateOrgMember)
        admin.delete("orgs", ":orgId", "members", ":userId", use: removeOrgMember)

        // Rules
        admin.get("rules", use: listRules)
        admin.post("rules", use: createRule)
        admin.get("rules", ":ruleId", use: getRule)
        admin.put("rules", ":ruleId", use: updateRule)
        admin.delete("rules", ":ruleId", use: deleteRule)

        // Leads
        admin.post("query", use: queryLeads)
        admin.post("leads", "query", use: queryLeads)
        admin.get("leads", ":funnelId", ":leadId", use: getLead)
        admin.put("leads", ":funnelId", ":leadId", use: updateLead)

        // Exports
        admin.get("exports", use: listExports)
        admin.post("exports", use: createExport)
        admin.get("exports", ":exportId", use: getExport)

        // Notifications
        admin.get("notifications", use: listNotifications)

        // Analytics
        admin.get("analytics", "overview", use: getAnalyticsOverview)
    }

    // MARK: - Organizations

    /// List organizations with pagination
    /// - GET /admin/orgs
    @Sendable
    public func listOrgs(req: Request) async throws -> AdminOrgsListResponse {
        let cursor = req.query[String.self, at: "cursor"]
        let limit = req.query[Int.self, at: "limit"] ?? 25
        let search = req.query[String.self, at: "search"]

        let result = try await orgsService.listOrgs(cursor: cursor, limit: limit, search: search)

        return AdminOrgsListResponse(
            orgs: result.items.map { AdminOrgResponse(from: $0) },
            total: result.items.count,
            nextToken: result.nextCursor
        )
    }

    /// Create a new organization
    /// - POST /admin/orgs
    @Sendable
    public func createOrg(req: Request) async throws -> Response {
        try req.requireWritePermission()

        let input = try req.content.decode(CreateOrgRequest.self)

        guard !input.name.isEmpty, !input.slug.isEmpty, !input.contactEmail.isEmpty else {
            throw Abort(.badRequest, reason: "name, slug, and contactEmail are required")
        }

        let org = try await orgsService.createOrg(CreateOrgInput(
            name: input.name,
            slug: input.slug,
            contactEmail: input.contactEmail,
            phone: input.phone,
            timezone: input.timezone,
            notifyEmails: input.notifyEmails,
            notifySms: input.notifySms,
            settings: input.settings
        ))

        let response = AdminOrgResponse(from: org)
        return try await response.encodeResponse(status: .created, for: req)
    }

    /// Get a single organization
    /// - GET /admin/orgs/:orgId
    @Sendable
    public func getOrg(req: Request) async throws -> AdminOrgResponse {
        guard let orgId = req.parameters.get("orgId") else {
            throw Abort(.badRequest, reason: "orgId is required")
        }

        guard let org = try await orgsService.getOrg(orgId) else {
            throw Abort(.notFound, reason: "Organization not found")
        }

        return AdminOrgResponse(from: org)
    }

    /// Update an organization
    /// - PUT /admin/orgs/:orgId
    @Sendable
    public func updateOrg(req: Request) async throws -> AdminOrgResponse {
        try req.requireWritePermission()

        guard let orgId = req.parameters.get("orgId") else {
            throw Abort(.badRequest, reason: "orgId is required")
        }

        let input = try req.content.decode(UpdateOrgRequest.self)

        let org = try await orgsService.updateOrg(UpdateOrgInput(
            orgId: orgId,
            name: input.name,
            slug: input.slug,
            contactEmail: input.contactEmail,
            phone: input.phone,
            timezone: input.timezone,
            notifyEmails: input.notifyEmails,
            notifySms: input.notifySms,
            settings: input.settings
        ))

        return AdminOrgResponse(from: org)
    }

    /// Delete an organization (soft delete)
    /// - DELETE /admin/orgs/:orgId
    @Sendable
    public func deleteOrg(req: Request) async throws -> Response {
        try req.requireWritePermission()

        guard let orgId = req.parameters.get("orgId") else {
            throw Abort(.badRequest, reason: "orgId is required")
        }

        try await orgsService.softDeleteOrg(orgId)
        return Response(status: .noContent)
    }

    // MARK: - Users

    /// List users with pagination
    /// - GET /admin/users
    @Sendable
    public func listUsers(req: Request) async throws -> AdminUsersListResponse {
        let cursor = req.query[String.self, at: "cursor"]
        let limit = req.query[Int.self, at: "limit"] ?? 25
        let search = req.query[String.self, at: "search"]
        let statusStr = req.query[String.self, at: "status"]
        let status = statusStr.flatMap { UserStatus(rawValue: $0) }

        let result = try await usersService.listUsers(ListUsersInput(
            cursor: cursor,
            limit: limit,
            search: search,
            status: status
        ))

        let users = try await mapUsersWithMemberships(result.items)

        return AdminUsersListResponse(
            users: users,
            total: users.count,
            nextToken: result.nextCursor
        )
    }

    /// Create a new user
    /// - POST /admin/users
    @Sendable
    public func createUser(req: Request) async throws -> Response {
        try req.requireWritePermission()

        let input = try req.content.decode(CreateUserRequest.self)
        let email = input.email.lowercased().trimmingCharacters(in: .whitespaces)
        let name = input.name.trimmingCharacters(in: .whitespaces)

        guard !email.isEmpty, email.contains("@"), !name.isEmpty else {
            throw Abort(.badRequest, reason: "Valid email and name are required")
        }

        let user = try await usersService.createUser(CreateUserInput(
            email: email,
            name: name,
            cognitoSub: input.cognitoSub,
            status: input.status ?? .active,
            phone: input.phone,
            avatarUrl: input.avatarUrl,
            preferences: input.preferences
        ))

        let response = await AdminUserDetailResponse(from: user, memberships: [])
        return try await response.encodeResponse(status: .created, for: req)
    }

    /// Get a single user with memberships
    /// - GET /admin/users/:userId
    @Sendable
    public func getUser(req: Request) async throws -> AdminUserDetailResponse {
        guard let userId = req.parameters.get("userId") else {
            throw Abort(.badRequest, reason: "userId is required")
        }

        guard let user = try await usersService.getUser(userId) else {
            throw Abort(.notFound, reason: "User not found")
        }

        let memberships = try await membershipsService.listUserOrgs(userId: userId)

        return await AdminUserDetailResponse(from: user, memberships: memberships.items)
    }

    /// Update a user
    /// - PUT /admin/users/:userId
    @Sendable
    public func updateUser(req: Request) async throws -> AdminUserDetailResponse {
        try req.requireWritePermission()

        guard let userId = req.parameters.get("userId") else {
            throw Abort(.badRequest, reason: "userId is required")
        }

        let input = try req.content.decode(UpdateUserRequest.self)

        let user = try await usersService.updateUser(UpdateUserInput(
            userId: userId,
            email: input.email,
            name: input.name,
            cognitoSub: input.cognitoSub,
            status: input.status,
            phone: input.phone,
            avatarUrl: input.avatarUrl,
            preferences: input.preferences
        ))

        let memberships = try await membershipsService.listUserOrgs(userId: userId)
        return await AdminUserDetailResponse(from: user, memberships: memberships.items)
    }

    /// Delete a user (soft delete)
    /// - DELETE /admin/users/:userId
    @Sendable
    public func deleteUser(req: Request) async throws -> Response {
        try req.requireWritePermission()

        guard let userId = req.parameters.get("userId") else {
            throw Abort(.badRequest, reason: "userId is required")
        }

        try await usersService.softDeleteUser(userId)
        return Response(status: .noContent)
    }

    // MARK: - Memberships

    /// List members of an organization
    /// - GET /admin/orgs/:orgId/members
    @Sendable
    public func listOrgMembers(req: Request) async throws -> AdminMembersListResponse {
        guard let orgId = req.parameters.get("orgId") else {
            throw Abort(.badRequest, reason: "orgId is required")
        }

        let cursor = req.query[String.self, at: "cursor"]
        let limit = req.query[Int.self, at: "limit"] ?? 50

        let result = try await membershipsService.listOrgMembers(orgId: orgId, cursor: cursor, limit: limit)

        let members = try await mapMembersWithUsers(result.items)

        return AdminMembersListResponse(
            members: members,
            total: members.count,
            nextToken: result.nextCursor
        )
    }

    /// Add a member to an organization
    /// - POST /admin/orgs/:orgId/members
    @Sendable
    public func addOrgMember(req: Request) async throws -> Response {
        try req.requireWritePermission()

        guard let orgId = req.parameters.get("orgId") else {
            throw Abort(.badRequest, reason: "orgId is required")
        }

        let input = try req.content.decode(AddMemberRequest.self)

        guard !input.userId.isEmpty else {
            throw Abort(.badRequest, reason: "userId is required")
        }

        let role = mapAdminRoleToMembership(input.role)

        let membership = try await membershipsService.addMember(AddMemberInput(
            orgId: orgId,
            userId: input.userId,
            role: role,
            notifyEmail: input.notifyEmail,
            notifySms: input.notifySms
        ))

        let response = AdminMembershipResponse(from: membership)
        return try await response.encodeResponse(status: .created, for: req)
    }

    /// Update a member's role
    /// - PUT /admin/orgs/:orgId/members/:userId
    @Sendable
    public func updateOrgMember(req: Request) async throws -> AdminMembershipResponse {
        try req.requireWritePermission()

        guard let orgId = req.parameters.get("orgId"),
              let userId = req.parameters.get("userId") else {
            throw Abort(.badRequest, reason: "orgId and userId are required")
        }

        let input = try req.content.decode(UpdateMemberRequest.self)

        let role = input.role.flatMap { mapAdminRoleToMembershipOptional($0) }

        let membership = try await membershipsService.updateMember(UpdateMemberInput(
            orgId: orgId,
            userId: userId,
            role: role,
            notifyEmail: input.notifyEmail,
            notifySms: input.notifySms
        ))

        return AdminMembershipResponse(from: membership)
    }

    /// Remove a member from an organization
    /// - DELETE /admin/orgs/:orgId/members/:userId
    @Sendable
    public func removeOrgMember(req: Request) async throws -> Response {
        try req.requireWritePermission()

        guard let orgId = req.parameters.get("orgId"),
              let userId = req.parameters.get("userId") else {
            throw Abort(.badRequest, reason: "orgId and userId are required")
        }

        try await membershipsService.removeMember(orgId: orgId, userId: userId)
        return Response(status: .noContent)
    }

    // MARK: - Rules

    /// List assignment rules
    /// - GET /admin/rules
    @Sendable
    public func listRules(req: Request) async throws -> AdminRulesListResponse {
        let funnelId = req.query[String.self, at: "funnelId"]
        let cursor = req.query[String.self, at: "cursor"]
        let limit = req.query[Int.self, at: "limit"] ?? 50

        let result = try await rulesService.listRules(funnelId: funnelId, cursor: cursor, limit: limit)

        let rules = try await mapRulesWithTargets(result.items)

        return AdminRulesListResponse(
            rules: rules,
            total: rules.count,
            nextToken: result.nextCursor
        )
    }

    /// Create a new assignment rule
    /// - POST /admin/rules
    @Sendable
    public func createRule(req: Request) async throws -> Response {
        try req.requireWritePermission()

        let input = try req.content.decode(CreateRuleRequest.self)

        let targetOrgId = input.targetOrgId ?? input.orgId ?? ""
        guard !targetOrgId.isEmpty, !input.name.isEmpty else {
            throw Abort(.badRequest, reason: "targetOrgId and name are required")
        }

        let funnelIds = !input.funnels.isEmpty ? input.funnels :
                       (input.funnelId.map { [$0] } ?? ["*"])
        let zipPatterns = !input.zipCodes.isEmpty ? input.zipCodes :
                         (!input.zipPatterns.isEmpty ? input.zipPatterns : [])

        var createdRules: [AssignmentRule] = []

        for funnelId in funnelIds {
            let rule = try await rulesService.createRule(CreateRuleInput(
                funnelId: funnelId,
                orgId: targetOrgId,
                targetUserId: input.targetUserId,
                name: input.name,
                priority: input.priority,
                zipPatterns: zipPatterns,
                dailyCap: input.dailyCap,
                monthlyCap: input.monthlyCap,
                isActive: input.active ?? input.isActive,
                description: input.description
            ))
            createdRules.append(rule)
        }

        guard let firstRule = createdRules.first else {
            throw Abort(.internalServerError, reason: "No rule created")
        }

        let mapped = try await mapRulesWithTargets([firstRule])
        guard let response = mapped.first else {
            throw Abort(.internalServerError, reason: "Failed to map rule")
        }

        return try await response.encodeResponse(status: .created, for: req)
    }

    /// Get a single rule
    /// - GET /admin/rules/:ruleId
    @Sendable
    public func getRule(req: Request) async throws -> AdminRuleResponse {
        guard let ruleId = req.parameters.get("ruleId") else {
            throw Abort(.badRequest, reason: "ruleId is required")
        }

        guard let rule = try await rulesService.getRule(ruleId) else {
            throw Abort(.notFound, reason: "Rule not found")
        }

        let mapped = try await mapRulesWithTargets([rule])
        guard let response = mapped.first else {
            throw Abort(.internalServerError, reason: "Failed to map rule")
        }

        return response
    }

    /// Update a rule
    /// - PUT /admin/rules/:ruleId
    @Sendable
    public func updateRule(req: Request) async throws -> AdminRuleResponse {
        try req.requireWritePermission()

        guard let ruleId = req.parameters.get("ruleId") else {
            throw Abort(.badRequest, reason: "ruleId is required")
        }

        let input = try req.content.decode(UpdateRuleRequest.self)

        let funnelId = !input.funnels.isEmpty ? input.funnels.first : input.funnelId
        let zipPatterns = !input.zipCodes.isEmpty ? input.zipCodes :
                         (!input.zipPatterns.isEmpty ? input.zipPatterns : nil)
        let targetOrgId = input.targetOrgId ?? input.orgId

        let rule = try await rulesService.updateRule(UpdateRuleInput(
            ruleId: ruleId,
            funnelId: funnelId,
            orgId: targetOrgId,
            name: input.name,
            priority: input.priority,
            zipPatterns: zipPatterns,
            dailyCap: input.dailyCap,
            monthlyCap: input.monthlyCap,
            isActive: input.active ?? input.isActive,
            targetUserId: input.targetUserId,
            description: input.description
        ))

        let mapped = try await mapRulesWithTargets([rule])
        guard let response = mapped.first else {
            throw Abort(.internalServerError, reason: "Failed to map rule")
        }

        return response
    }

    /// Delete a rule (soft delete)
    /// - DELETE /admin/rules/:ruleId
    @Sendable
    public func deleteRule(req: Request) async throws -> Response {
        try req.requireWritePermission()

        guard let ruleId = req.parameters.get("ruleId") else {
            throw Abort(.badRequest, reason: "ruleId is required")
        }

        try await rulesService.softDeleteRule(ruleId)
        return Response(status: .noContent)
    }

    // MARK: - Leads

    /// Query leads with filters
    /// - POST /admin/query or POST /admin/leads/query
    @Sendable
    public func queryLeads(req: Request) async throws -> AdminLeadsQueryResponse {
        let input = try req.content.decode(QueryLeadsRequest.self)

        // If no filters provided, return empty result
        guard input.funnelId != nil || input.orgId != nil || input.status != nil else {
            return AdminLeadsQueryResponse(leads: [], totalCount: 0, nextToken: nil)
        }

        // Note: This would typically use a PlatformLeadsService
        // For now, return empty as leads query requires additional service implementation
        return AdminLeadsQueryResponse(leads: [], totalCount: 0, nextToken: input.cursor)
    }

    /// Get a single lead
    /// - GET /admin/leads/:funnelId/:leadId
    @Sendable
    public func getLead(req: Request) async throws -> AdminLeadResponse {
        guard let _funnelId = req.parameters.get("funnelId"),
              let _leadId = req.parameters.get("leadId") else {
            throw Abort(.badRequest, reason: "funnelId and leadId are required")
        }

        // Note: This would typically use a PlatformLeadsService
        // The parameters are validated but not used until PlatformLeadsService is implemented
        throw Abort(.notImplemented, reason: "Lead retrieval requires PlatformLeadsService")
    }

    /// Update a lead
    /// - PUT /admin/leads/:funnelId/:leadId
    @Sendable
    public func updateLead(req: Request) async throws -> AdminLeadResponse {
        try req.requireWritePermission()

        guard let _funnelId = req.parameters.get("funnelId"),
              let _leadId = req.parameters.get("leadId") else {
            throw Abort(.badRequest, reason: "funnelId and leadId are required")
        }

        // Note: This would typically use a PlatformLeadsService
        // The parameters are validated but not used until PlatformLeadsService is implemented
        throw Abort(.notImplemented, reason: "Lead update requires PlatformLeadsService")
    }

    // MARK: - Exports

    /// List exports with pagination
    /// - GET /admin/exports
    @Sendable
    public func listExports(req: Request) async throws -> AdminExportsListResponse {
        let cursor = req.query[String.self, at: "cursor"]
        let limit = req.query[Int.self, at: "limit"] ?? 25

        let result = try await exportsService.listExports(cursor: cursor, limit: limit)

        return AdminExportsListResponse(
            exports: result.items.map { AdminExportResponse(from: $0) },
            total: result.items.count,
            nextToken: result.nextCursor
        )
    }

    /// Create a new export job
    /// - POST /admin/exports
    @Sendable
    public func createExport(req: Request) async throws -> Response {
        try req.requireWritePermission()

        let identity = try req.adminIdentity
        let input = try req.content.decode(CreateExportRequest.self)

        let export = try await exportsService.createExport(CreateExportInput(
            requestedBy: identity.emailHash,
            funnelId: input.funnelId,
            orgId: input.orgId,
            format: input.format,
            filters: nil
        ))

        let response = AdminExportResponse(from: export)
        return try await response.encodeResponse(status: .created, for: req)
    }

    /// Get a single export
    /// - GET /admin/exports/:exportId
    @Sendable
    public func getExport(req: Request) async throws -> AdminExportResponse {
        guard let exportId = req.parameters.get("exportId") else {
            throw Abort(.badRequest, reason: "exportId is required")
        }

        guard let export = try await exportsService.getExport(exportId) else {
            throw Abort(.notFound, reason: "Export not found")
        }

        return AdminExportResponse(from: export)
    }

    // MARK: - Notifications

    /// List notifications
    /// - GET /admin/notifications
    @Sendable
    public func listNotifications(req: Request) async throws -> AdminNotificationsListResponse {
        let cursor = req.query[String.self, at: "cursor"]
        let limit = req.query[Int.self, at: "limit"] ?? 50

        let result = try await notificationsService.listNotifications(cursor: cursor, limit: limit)

        return AdminNotificationsListResponse(
            notifications: result.items.map { AdminNotificationResponse(from: $0) },
            nextToken: result.nextCursor
        )
    }

    // MARK: - Analytics

    /// Get analytics overview
    /// - GET /admin/analytics/overview
    @Sendable
    public func getAnalyticsOverview(req: Request) async throws -> AdminAnalyticsOverviewResponse {
        // Basic analytics overview
        // In production, this would aggregate data from leads, orgs, etc.
        return AdminAnalyticsOverviewResponse(
            totalLeads: 0,
            totalOrgs: 0,
            totalUsers: 0,
            leadsLast24Hours: 0,
            leadsLast7Days: 0,
            leadsLast30Days: 0,
            topFunnels: [],
            topOrgs: []
        )
    }

    // MARK: - Private Helpers

    /// Map users with their organization memberships
    private func mapUsersWithMemberships(_ users: [User]) async throws -> [AdminUserDetailResponse] {
        var results: [AdminUserDetailResponse] = []

        for user in users {
            let memberships = try await membershipsService.listUserOrgs(userId: user.userId)
            results.append(await AdminUserDetailResponse(from: user, memberships: memberships.items))
        }

        return results
    }

    /// Map memberships with user details
    private func mapMembersWithUsers(_ memberships: [Membership]) async throws -> [AdminMemberWithUserResponse] {
        var results: [AdminMemberWithUserResponse] = []

        for membership in memberships {
            let user = try await usersService.getUser(membership.userId)
            results.append(AdminMemberWithUserResponse(
                userId: membership.userId,
                email: user?.email ?? "",
                name: user?.name ?? membership.userId,
                role: mapMembershipRoleToAdmin(membership.role),
                joinedAt: membership.joinedAt
            ))
        }

        return results
    }

    /// Map rules with org and user names
    private func mapRulesWithTargets(_ rules: [AssignmentRule]) async throws -> [AdminRuleResponse] {
        var orgCache: [String: Org?] = [:]
        var userCache: [String: User?] = [:]
        var results: [AdminRuleResponse] = []

        for rule in rules {
            // Get org name
            if orgCache[rule.orgId] == nil {
                orgCache[rule.orgId] = try await orgsService.getOrg(rule.orgId)
            }
            let orgName = orgCache[rule.orgId]??.name ?? rule.orgId

            // Get user name if targetUserId exists
            var targetUserName: String?
            if let targetUserId = rule.targetUserId {
                if userCache[targetUserId] == nil {
                    userCache[targetUserId] = try await usersService.getUser(targetUserId)
                }
                targetUserName = userCache[targetUserId]??.name
            }

            results.append(AdminRuleResponse(
                ruleId: rule.ruleId,
                name: rule.name,
                priority: rule.priority,
                funnels: rule.funnelId != "*" ? [rule.funnelId] : [],
                zipCodes: rule.zipPatterns,
                targetOrgId: rule.orgId,
                targetOrgName: orgName,
                targetUserId: rule.targetUserId,
                targetUserName: targetUserName,
                active: rule.isActive,
                dailyCap: rule.dailyCap,
                monthlyCap: rule.monthlyCap,
                currentDailyCount: 0,
                currentMonthlyCount: 0,
                matchedLeadsCount: 0,
                createdAt: rule.createdAt,
                updatedAt: rule.updatedAt,
                description: rule.description
            ))
        }

        return results
    }

    /// Map MembershipRole to admin role string
    private func mapMembershipRoleToAdmin(_ role: MembershipRole) -> String {
        switch role {
        case .orgOwner:
            return "owner"
        case .manager:
            return "admin"
        case .agent, .viewer:
            return "member"
        }
    }

    /// Map admin role string to MembershipRole
    private func mapAdminRoleToMembership(_ role: String) -> MembershipRole {
        switch role.lowercased() {
        case "owner":
            return .orgOwner
        case "admin":
            return .manager
        case "member", "agent":
            return .agent
        case "viewer":
            return .viewer
        default:
            return .agent
        }
    }

    /// Map admin role string to optional MembershipRole
    private func mapAdminRoleToMembershipOptional(_ role: String) -> MembershipRole? {
        switch role.lowercased() {
        case "owner":
            return .orgOwner
        case "admin":
            return .manager
        case "member", "agent":
            return .agent
        case "viewer":
            return .viewer
        default:
            return nil
        }
    }
}

// MARK: - Request DTOs

/// Request for creating an organization
public struct CreateOrgRequest: Content, Sendable {
    public let name: String
    public let slug: String
    public let contactEmail: String
    public let phone: String?
    public let timezone: String?
    public let notifyEmails: [String]?
    public let notifySms: [String]?
    public let settings: [String: AnyCodable]?
}

/// Request for updating an organization
public struct UpdateOrgRequest: Content, Sendable {
    public let name: String?
    public let slug: String?
    public let contactEmail: String?
    public let phone: String?
    public let timezone: String?
    public let notifyEmails: [String]?
    public let notifySms: [String]?
    public let settings: [String: AnyCodable]?
}

/// Request for creating a user
public struct CreateUserRequest: Content, Sendable {
    public let email: String
    public let name: String
    public let cognitoSub: String?
    public let status: UserStatus?
    public let phone: String?
    public let avatarUrl: String?
    public let preferences: [String: AnyCodable]?
}

/// Request for updating a user
public struct UpdateUserRequest: Content, Sendable {
    public let email: String?
    public let name: String?
    public let cognitoSub: String?
    public let status: UserStatus?
    public let phone: String?
    public let avatarUrl: String?
    public let preferences: [String: AnyCodable]?
}

/// Request for adding a member
public struct AddMemberRequest: Content, Sendable {
    public let userId: String
    public let role: String
    public let notifyEmail: Bool?
    public let notifySms: Bool?
}

/// Request for updating a member
public struct UpdateMemberRequest: Content, Sendable {
    public let role: String?
    public let notifyEmail: Bool?
    public let notifySms: Bool?
}

/// Request for creating a rule
public struct CreateRuleRequest: Content, Sendable {
    public let name: String
    public let priority: Int
    public let funnelId: String?
    public let funnels: [String]
    public let targetOrgId: String?
    public let orgId: String?
    public let targetUserId: String?
    public let zipCodes: [String]
    public let zipPatterns: [String]
    public let dailyCap: Int?
    public let monthlyCap: Int?
    public let active: Bool?
    public let isActive: Bool?
    public let description: String?

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.name = try container.decode(String.self, forKey: .name)
        self.priority = try container.decode(Int.self, forKey: .priority)
        self.funnelId = try container.decodeIfPresent(String.self, forKey: .funnelId)
        self.funnels = try container.decodeIfPresent([String].self, forKey: .funnels) ?? []
        self.targetOrgId = try container.decodeIfPresent(String.self, forKey: .targetOrgId)
        self.orgId = try container.decodeIfPresent(String.self, forKey: .orgId)
        self.targetUserId = try container.decodeIfPresent(String.self, forKey: .targetUserId)
        self.zipCodes = try container.decodeIfPresent([String].self, forKey: .zipCodes) ?? []
        self.zipPatterns = try container.decodeIfPresent([String].self, forKey: .zipPatterns) ?? []
        self.dailyCap = try container.decodeIfPresent(Int.self, forKey: .dailyCap)
        self.monthlyCap = try container.decodeIfPresent(Int.self, forKey: .monthlyCap)
        self.active = try container.decodeIfPresent(Bool.self, forKey: .active)
        self.isActive = try container.decodeIfPresent(Bool.self, forKey: .isActive)
        self.description = try container.decodeIfPresent(String.self, forKey: .description)
    }

    private enum CodingKeys: String, CodingKey {
        case name, priority, funnelId, funnels, targetOrgId, orgId, targetUserId
        case zipCodes, zipPatterns, dailyCap, monthlyCap, active, isActive, description
    }
}

/// Request for updating a rule
public struct UpdateRuleRequest: Content, Sendable {
    public let name: String?
    public let priority: Int?
    public let funnelId: String?
    public let funnels: [String]
    public let targetOrgId: String?
    public let orgId: String?
    public let targetUserId: String?
    public let zipCodes: [String]
    public let zipPatterns: [String]
    public let dailyCap: Int?
    public let monthlyCap: Int?
    public let active: Bool?
    public let isActive: Bool?
    public let description: String?

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.name = try container.decodeIfPresent(String.self, forKey: .name)
        self.priority = try container.decodeIfPresent(Int.self, forKey: .priority)
        self.funnelId = try container.decodeIfPresent(String.self, forKey: .funnelId)
        self.funnels = try container.decodeIfPresent([String].self, forKey: .funnels) ?? []
        self.targetOrgId = try container.decodeIfPresent(String.self, forKey: .targetOrgId)
        self.orgId = try container.decodeIfPresent(String.self, forKey: .orgId)
        self.targetUserId = try container.decodeIfPresent(String.self, forKey: .targetUserId)
        self.zipCodes = try container.decodeIfPresent([String].self, forKey: .zipCodes) ?? []
        self.zipPatterns = try container.decodeIfPresent([String].self, forKey: .zipPatterns) ?? []
        self.dailyCap = try container.decodeIfPresent(Int.self, forKey: .dailyCap)
        self.monthlyCap = try container.decodeIfPresent(Int.self, forKey: .monthlyCap)
        self.active = try container.decodeIfPresent(Bool.self, forKey: .active)
        self.isActive = try container.decodeIfPresent(Bool.self, forKey: .isActive)
        self.description = try container.decodeIfPresent(String.self, forKey: .description)
    }

    private enum CodingKeys: String, CodingKey {
        case name, priority, funnelId, funnels, targetOrgId, orgId, targetUserId
        case zipCodes, zipPatterns, dailyCap, monthlyCap, active, isActive, description
    }
}

/// Request for querying leads
public struct QueryLeadsRequest: Content, Sendable {
    public let funnelId: String?
    public let orgId: String?
    public let status: PlatformLeadStatus?
    public let pipelineStatus: PipelineStatus?
    public let startDate: String?
    public let endDate: String?
    public let cursor: String?
    public let nextToken: String?
    public let pageSize: Int?
    public let limit: Int?
    public let search: String?
    public let zipCode: String?
    public let userId: String?
}

// MARK: - Response DTOs

/// Organization response
public struct AdminOrgResponse: Content, Sendable {
    public let orgId: String
    public let name: String
    public let slug: String
    public let contactEmail: String
    public let phone: String?
    public let timezone: String
    public let notifyEmails: [String]
    public let notifySms: [String]
    public let settings: [String: AnyCodable]
    public let createdAt: String
    public let updatedAt: String

    init(from org: Org) {
        self.orgId = org.orgId
        self.name = org.name
        self.slug = org.slug
        self.contactEmail = org.contactEmail
        self.phone = org.phone
        self.timezone = org.timezone
        self.notifyEmails = org.notifyEmails
        self.notifySms = org.notifySms
        self.settings = org.settings
        self.createdAt = org.createdAt
        self.updatedAt = org.updatedAt
    }
}

/// Organizations list response
public struct AdminOrgsListResponse: Content, Sendable {
    public let orgs: [AdminOrgResponse]
    public let total: Int
    public let nextToken: String?
}

/// User detail response with memberships
public struct AdminUserDetailResponse: Content, Sendable {
    public let userId: String
    public let email: String
    public let name: String
    public let status: UserStatus
    public let phone: String?
    public let avatarUrl: String?
    public let preferences: [String: AnyCodable]
    public let createdAt: String
    public let updatedAt: String
    public let organizations: [UserOrgMembership]

    init(from user: User, memberships: [Membership]) async {
        self.userId = user.userId
        self.email = user.email
        self.name = user.name
        self.status = user.status
        self.phone = user.phone
        self.avatarUrl = user.avatarUrl
        self.preferences = user.preferences
        self.createdAt = user.createdAt
        self.updatedAt = user.updatedAt
        self.organizations = memberships.map { UserOrgMembership(from: $0) }
    }
}

/// User organization membership
public struct UserOrgMembership: Content, Sendable {
    public let orgId: String
    public let role: String
    public let joinedAt: String

    init(from membership: Membership) {
        self.orgId = membership.orgId
        self.role = membership.role.rawValue
        self.joinedAt = membership.joinedAt
    }
}

/// Users list response
public struct AdminUsersListResponse: Content, Sendable {
    public let users: [AdminUserDetailResponse]
    public let total: Int
    public let nextToken: String?
}

/// Membership response
public struct AdminMembershipResponse: Content, Sendable {
    public let orgId: String
    public let userId: String
    public let role: String
    public let notifyEmail: Bool
    public let notifySms: Bool
    public let joinedAt: String
    public let updatedAt: String

    init(from membership: Membership) {
        self.orgId = membership.orgId
        self.userId = membership.userId
        self.role = membership.role.rawValue
        self.notifyEmail = membership.notifyEmail
        self.notifySms = membership.notifySms
        self.joinedAt = membership.joinedAt
        self.updatedAt = membership.updatedAt
    }
}

/// Member with user details
public struct AdminMemberWithUserResponse: Content, Sendable {
    public let userId: String
    public let email: String
    public let name: String
    public let role: String
    public let joinedAt: String
}

/// Members list response
public struct AdminMembersListResponse: Content, Sendable {
    public let members: [AdminMemberWithUserResponse]
    public let total: Int
    public let nextToken: String?
}

/// Rule response
public struct AdminRuleResponse: Content, Sendable {
    public let ruleId: String
    public let name: String
    public let priority: Int
    public let funnels: [String]
    public let zipCodes: [String]
    public let targetOrgId: String
    public let targetOrgName: String
    public let targetUserId: String?
    public let targetUserName: String?
    public let active: Bool
    public let dailyCap: Int?
    public let monthlyCap: Int?
    public let currentDailyCount: Int
    public let currentMonthlyCount: Int
    public let matchedLeadsCount: Int
    public let createdAt: String
    public let updatedAt: String
    public let description: String?
}

/// Rules list response
public struct AdminRulesListResponse: Content, Sendable {
    public let rules: [AdminRuleResponse]
    public let total: Int
    public let nextToken: String?
}

/// Lead response
public struct AdminLeadResponse: Content, Sendable {
    public let leadId: String
    public let funnelId: String
    public let name: String
    public let email: String
    public let phone: String?
    public let status: PlatformLeadStatus
    public let pipelineStatus: PipelineStatus
    public let tags: [String]
    public let notes: String
    public let doNotContact: Bool
    public let assignedOrgId: String?
    public let assignedOrgName: String?
    public let assignedUserId: String?
    public let assignedUserName: String?
    public let zipCode: String?
    public let qualityScore: Int?
    public let createdAt: String
    public let updatedAt: String
}

/// Leads query response
public struct AdminLeadsQueryResponse: Content, Sendable {
    public let leads: [AdminLeadResponse]
    public let totalCount: Int
    public let nextToken: String?
}

/// Export response
public struct AdminExportResponse: Content, Sendable {
    public let jobId: String
    public let funnelId: String?
    public let format: ExportFormat
    public let status: ExportStatus
    public let recordCount: Int?
    public let errorMessage: String?
    public let createdAt: String
    public let completedAt: String?
    public let expiresAt: String

    init(from export: ExportJob) {
        self.jobId = export.exportId
        self.funnelId = export.funnelId
        self.format = export.format
        self.status = export.status
        self.recordCount = export.recordCount
        self.errorMessage = export.errorMessage
        self.createdAt = export.createdAt
        self.completedAt = export.completedAt
        self.expiresAt = export.expiresAt
    }
}

/// Exports list response
public struct AdminExportsListResponse: Content, Sendable {
    public let exports: [AdminExportResponse]
    public let total: Int
    public let nextToken: String?
}

/// Notification response
public struct AdminNotificationResponse: Content, Sendable {
    public let notificationId: String
    public let leadId: String
    public let funnelId: String
    public let orgId: String?
    public let userId: String?
    public let channel: String
    public let status: String
    public let errorMessage: String?
    public let sentAt: String

    init(from notification: NotificationItem) {
        self.notificationId = notification.notificationId
        self.leadId = notification.leadId
        self.funnelId = notification.funnelId
        self.orgId = notification.orgId
        self.userId = notification.userId
        self.channel = notification.channel.rawValue
        self.status = notification.status.rawValue
        self.errorMessage = notification.errorMessage
        self.sentAt = notification.sentAt
    }
}

/// Notifications list response
public struct AdminNotificationsListResponse: Content, Sendable {
    public let notifications: [AdminNotificationResponse]
    public let nextToken: String?
}

/// Analytics overview response
public struct AdminAnalyticsOverviewResponse: Content, Sendable {
    public let totalLeads: Int
    public let totalOrgs: Int
    public let totalUsers: Int
    public let leadsLast24Hours: Int
    public let leadsLast7Days: Int
    public let leadsLast30Days: Int
    public let topFunnels: [FunnelStat]
    public let topOrgs: [OrgStat]
}

/// Funnel statistics
public struct FunnelStat: Content, Sendable {
    public let funnelId: String
    public let leadCount: Int
}

/// Organization statistics
public struct OrgStat: Content, Sendable {
    public let orgId: String
    public let orgName: String
    public let leadCount: Int
}

// MARK: - Storage Key

/// Storage key for admin controller
public struct AdminControllerKey: StorageKey {
    public typealias Value = AdminController
}
