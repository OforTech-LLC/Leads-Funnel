// =============================================================================
// AdminModels.swift
// LeadCaptureAPI/Models
// =============================================================================
// Admin API models for Platform Leads, Notifications, and Audit logging.
// Also includes shared utility types like AnyCodable and JSONValue.
//
// NOTE: This file contains types specific to the Admin API that don't already
// exist in the codebase, plus shared utility types needed across services.
//
// Types defined here:
// - AnyCodable, JSONValue (shared utility types)
// - AdminUserResponse
// - PlatformLead and related DTOs
// - NotificationRecord and related types
// - Export DTOs (CreateExportRequest)
// - AuditLogEntry and related types
// - PlatformFunnelStats
//
// Existing types in other files (DO NOT DUPLICATE):
// - AdminRole, AdminIdentity -> AdminAuthMiddleware.swift
// - User, UserStatus, PaginatedUsers, etc. -> UsersService.swift
// - Org, CreateOrgInput, UpdateOrgInput, PaginatedOrgs -> OrgsService.swift
// - Membership, MembershipRole, InviteStatus, etc. -> MembershipsService.swift
// - FunnelStats -> FunnelStats.swift
// - ExportJob, ExportFormat, ExportStatus -> ExportsService.swift
// - AssignmentRule, CreateRuleInput, UpdateRuleInput, PaginatedRules -> RulesService.swift
// =============================================================================

import Foundation
import Vapor
import Shared

// MARK: - AnyCodable Helper

/// Type-erased Codable wrapper for dynamic JSON values.
/// Used for flexible schema fields like `settings` and `preferences`.
public struct AnyCodable: Codable, Sendable, Hashable {
    public let value: Any

    public init(_ value: Any) {
        self.value = value
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if container.decodeNil() {
            self.value = NSNull()
        } else if let bool = try? container.decode(Bool.self) {
            self.value = bool
        } else if let int = try? container.decode(Int.self) {
            self.value = int
        } else if let double = try? container.decode(Double.self) {
            self.value = double
        } else if let string = try? container.decode(String.self) {
            self.value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            self.value = array.map { $0.value }
        } else if let dictionary = try? container.decode([String: AnyCodable].self) {
            self.value = dictionary.mapValues { $0.value }
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "AnyCodable cannot decode value"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case is NSNull:
            try container.encodeNil()
        case let bool as Bool:
            try container.encode(bool)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dictionary as [String: Any]:
            try container.encode(dictionary.mapValues { AnyCodable($0) })
        default:
            throw EncodingError.invalidValue(
                value,
                EncodingError.Context(
                    codingPath: container.codingPath,
                    debugDescription: "AnyCodable cannot encode value"
                )
            )
        }
    }

    public static func == (lhs: AnyCodable, rhs: AnyCodable) -> Bool {
        let encoder = JSONEncoder()
        guard let lhsData = try? encoder.encode(lhs),
              let rhsData = try? encoder.encode(rhs) else {
            return false
        }
        return lhsData == rhsData
    }

    public func hash(into hasher: inout Hasher) {
        if let data = try? JSONEncoder().encode(self) {
            hasher.combine(data)
        }
    }
}

// MARK: - JSONValue Helper

/// Type-safe JSON value wrapper for dynamic fields.
/// This provides a safer alternative to AnyCodable with explicit type handling.
public enum JSONValue: Codable, Sendable, Hashable {
    case null
    case bool(Bool)
    case int(Int)
    case double(Double)
    case string(String)
    case array([JSONValue])
    case object([String: JSONValue])

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if container.decodeNil() {
            self = .null
        } else if let bool = try? container.decode(Bool.self) {
            self = .bool(bool)
        } else if let int = try? container.decode(Int.self) {
            self = .int(int)
        } else if let double = try? container.decode(Double.self) {
            self = .double(double)
        } else if let string = try? container.decode(String.self) {
            self = .string(string)
        } else if let array = try? container.decode([JSONValue].self) {
            self = .array(array)
        } else if let object = try? container.decode([String: JSONValue].self) {
            self = .object(object)
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "JSONValue cannot decode value"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch self {
        case .null:
            try container.encodeNil()
        case .bool(let value):
            try container.encode(value)
        case .int(let value):
            try container.encode(value)
        case .double(let value):
            try container.encode(value)
        case .string(let value):
            try container.encode(value)
        case .array(let value):
            try container.encode(value)
        case .object(let value):
            try container.encode(value)
        }
    }

    /// Convenience initializer from common types
    public init(_ value: Any?) {
        guard let value = value else {
            self = .null
            return
        }

        switch value {
        case let bool as Bool:
            self = .bool(bool)
        case let int as Int:
            self = .int(int)
        case let double as Double:
            self = .double(double)
        case let string as String:
            self = .string(string)
        case let array as [Any]:
            self = .array(array.map { JSONValue($0) })
        case let dict as [String: Any]:
            self = .object(dict.mapValues { JSONValue($0) })
        default:
            self = .null
        }
    }

    /// Extract the underlying value
    public var unwrapped: Any? {
        switch self {
        case .null: return nil
        case .bool(let v): return v
        case .int(let v): return v
        case .double(let v): return v
        case .string(let v): return v
        case .array(let v): return v.map { $0.unwrapped }
        case .object(let v): return v.mapValues { $0.unwrapped }
        }
    }
}

// MARK: - Admin User Response

/// Authenticated admin user information for API responses
public struct AdminUserResponse: Content, Sendable {
    /// Cognito subject identifier
    public let sub: String

    /// User email address
    public let email: String

    /// Cognito groups the user belongs to
    public let groups: [String]

    /// Primary role (highest privilege)
    public let role: String

    public init(
        sub: String,
        email: String,
        groups: [String],
        role: String
    ) {
        self.sub = sub
        self.email = email
        self.groups = groups
        self.role = role
    }
}

// MARK: - Platform Lead Status

/// Extended lead status for platform-wide lead management
public enum PlatformLeadStatus: String, Content, CaseIterable, Sendable {
    case new = "new"
    case assigned = "assigned"
    case unassigned = "unassigned"
    case contacted = "contacted"
    case qualified = "qualified"
    case booked = "booked"
    case converted = "converted"
    case won = "won"
    case lost = "lost"
    case dnc = "dnc"
    case quarantined = "quarantined"

    /// Human-readable description
    public var statusDescription: String {
        switch self {
        case .new: return "New"
        case .assigned: return "Assigned"
        case .unassigned: return "Unassigned"
        case .contacted: return "Contacted"
        case .qualified: return "Qualified"
        case .booked: return "Booked"
        case .converted: return "Converted"
        case .won: return "Won"
        case .lost: return "Lost"
        case .dnc: return "Do Not Contact"
        case .quarantined: return "Quarantined"
        }
    }

    /// Whether this is a terminal status (no further transitions allowed)
    public var isTerminal: Bool {
        switch self {
        case .won, .dnc:
            return true
        default:
            return false
        }
    }

    /// Valid transitions from this status
    public var validTransitions: [PlatformLeadStatus] {
        switch self {
        case .new: return [.assigned, .quarantined, .unassigned]
        case .unassigned: return [.assigned, .quarantined]
        case .assigned: return [.contacted, .qualified, .converted, .lost, .dnc, .quarantined, .booked]
        case .contacted: return [.qualified, .converted, .lost, .dnc, .booked]
        case .qualified: return [.converted, .lost, .dnc, .booked]
        case .booked: return [.converted, .won, .lost, .dnc]
        case .converted: return [.won, .lost]
        case .won: return []
        case .lost: return [.contacted, .qualified]
        case .dnc: return []
        case .quarantined: return [.new]
        }
    }

    /// Check if a transition to the given status is valid
    public func canTransitionTo(_ status: PlatformLeadStatus) -> Bool {
        if self == status { return true } // No-op is always valid
        return validTransitions.contains(status)
    }
}

// MARK: - Pipeline Status

/// Pipeline stage for leads in the sales process
public enum PipelineStatus: String, Content, CaseIterable, Sendable {
    case none = "none"
    case nurturing = "nurturing"
    case negotiating = "negotiating"
    case closing = "closing"
    case closedWon = "closed_won"
    case closedLost = "closed_lost"

    /// Human-readable description
    public var statusDescription: String {
        switch self {
        case .none: return "No Pipeline"
        case .nurturing: return "Nurturing"
        case .negotiating: return "Negotiating"
        case .closing: return "Closing"
        case .closedWon: return "Closed Won"
        case .closedLost: return "Closed Lost"
        }
    }
}

// MARK: - Platform Lead

/// Platform-wide lead record with assignment and tracking
public struct PlatformLead: Content, Sendable {
    /// DynamoDB partition key
    public let pk: String?

    /// DynamoDB sort key
    public let sk: String?

    /// Unique lead identifier (UUID)
    public let leadId: String

    /// Funnel that captured this lead
    public let funnelId: String

    /// Assigned organization (nil if unassigned)
    public var orgId: String?

    /// Assigned user within the org (optional)
    public var assignedUserId: String?

    /// Rule that matched for assignment (optional)
    public var ruleId: String?

    /// Contact name
    public var name: String

    /// Contact email
    public let email: String

    /// Contact phone
    public var phone: String?

    /// ZIP/postal code
    public var zipCode: String?

    /// Lead message/inquiry
    public var message: String?

    /// Current status
    public var status: PlatformLeadStatus

    /// Notes from agents/admins
    public var notes: [String]

    /// Tags for categorization
    public var tags: [String]

    /// Source page URL
    public var pageUrl: String?

    /// HTTP referrer
    public var referrer: String?

    /// UTM tracking parameters
    public var utm: [String: String]?

    /// Hashed IP address for privacy
    public let ipHash: String

    /// Browser user agent
    public var userAgent: String?

    /// When the lead was assigned (ISO 8601)
    public var assignedAt: String?

    /// When notifications were sent (ISO 8601)
    public var notifiedAt: String?

    /// Creation timestamp (ISO 8601)
    public let createdAt: String

    /// Last update timestamp (ISO 8601)
    public var updatedAt: String

    /// Lead quality score (0-100)
    public var score: Int?

    /// Evidence pack for fraud detection
    public var evidencePack: [String: JSONValue]?

    /// GSI1 partition key (funnel lookup)
    public let gsi1pk: String?

    /// GSI1 sort key (created date)
    public let gsi1sk: String?

    /// GSI2 partition key (org lookup)
    public var gsi2pk: String?

    /// GSI2 sort key (created date)
    public var gsi2sk: String?

    /// GSI3 partition key (status lookup)
    public var gsi3pk: String?

    /// GSI3 sort key (created date)
    public var gsi3sk: String?

    public init(
        pk: String? = nil,
        sk: String? = nil,
        leadId: String,
        funnelId: String,
        orgId: String? = nil,
        assignedUserId: String? = nil,
        ruleId: String? = nil,
        name: String,
        email: String,
        phone: String? = nil,
        zipCode: String? = nil,
        message: String? = nil,
        status: PlatformLeadStatus = .new,
        notes: [String] = [],
        tags: [String] = [],
        pageUrl: String? = nil,
        referrer: String? = nil,
        utm: [String: String]? = nil,
        ipHash: String,
        userAgent: String? = nil,
        assignedAt: String? = nil,
        notifiedAt: String? = nil,
        createdAt: String = ISO8601DateFormatter().string(from: Date()),
        updatedAt: String = ISO8601DateFormatter().string(from: Date()),
        score: Int? = nil,
        evidencePack: [String: JSONValue]? = nil,
        gsi1pk: String? = nil,
        gsi1sk: String? = nil,
        gsi2pk: String? = nil,
        gsi2sk: String? = nil,
        gsi3pk: String? = nil,
        gsi3sk: String? = nil
    ) {
        self.pk = pk
        self.sk = sk
        self.leadId = leadId
        self.funnelId = funnelId
        self.orgId = orgId
        self.assignedUserId = assignedUserId
        self.ruleId = ruleId
        self.name = name
        self.email = email
        self.phone = phone
        self.zipCode = zipCode
        self.message = message
        self.status = status
        self.notes = notes
        self.tags = tags
        self.pageUrl = pageUrl
        self.referrer = referrer
        self.utm = utm
        self.ipHash = ipHash
        self.userAgent = userAgent
        self.assignedAt = assignedAt
        self.notifiedAt = notifiedAt
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.score = score
        self.evidencePack = evidencePack
        self.gsi1pk = gsi1pk
        self.gsi1sk = gsi1sk
        self.gsi2pk = gsi2pk
        self.gsi2sk = gsi2sk
        self.gsi3pk = gsi3pk
        self.gsi3sk = gsi3sk
    }
}

// MARK: - Platform Lead DTOs

/// Query parameters for listing platform leads
public struct QueryPlatformLeadsRequest: Content, Sendable {
    public let funnelId: String?
    public let orgId: String?
    public let status: PlatformLeadStatus?
    public let startDate: String?
    public let endDate: String?
    public let cursor: String?
    public let limit: Int?
    public let assignedUserId: String?

    public init(
        funnelId: String? = nil,
        orgId: String? = nil,
        status: PlatformLeadStatus? = nil,
        startDate: String? = nil,
        endDate: String? = nil,
        cursor: String? = nil,
        limit: Int? = nil,
        assignedUserId: String? = nil
    ) {
        self.funnelId = funnelId
        self.orgId = orgId
        self.status = status
        self.startDate = startDate
        self.endDate = endDate
        self.cursor = cursor
        self.limit = limit
        self.assignedUserId = assignedUserId
    }
}

/// Request body for updating a platform lead
public struct UpdatePlatformLeadRequest: Content, Sendable {
    public let funnelId: String
    public let leadId: String
    public let status: PlatformLeadStatus?
    public let orgId: String?
    public let assignedUserId: String?
    public let ruleId: String?
    public let notes: [String]?
    public let tags: [String]?
    public let assignedAt: String?
    public let notifiedAt: String?
    /// When true, bypasses status transition validation (admin override)
    public let force: Bool?

    public init(
        funnelId: String,
        leadId: String,
        status: PlatformLeadStatus? = nil,
        orgId: String? = nil,
        assignedUserId: String? = nil,
        ruleId: String? = nil,
        notes: [String]? = nil,
        tags: [String]? = nil,
        assignedAt: String? = nil,
        notifiedAt: String? = nil,
        force: Bool? = nil
    ) {
        self.funnelId = funnelId
        self.leadId = leadId
        self.status = status
        self.orgId = orgId
        self.assignedUserId = assignedUserId
        self.ruleId = ruleId
        self.notes = notes
        self.tags = tags
        self.assignedAt = assignedAt
        self.notifiedAt = notifiedAt
        self.force = force
    }
}

/// Request body for bulk updating leads
public struct BulkUpdateLeadsRequest: Content, Sendable {
    public let funnelId: String
    public let leadIds: [String]
    public let status: PlatformLeadStatus?
    public let pipelineStatus: PipelineStatus?
    public let tags: [String]?
    public let doNotContact: Bool?

    public init(
        funnelId: String,
        leadIds: [String],
        status: PlatformLeadStatus? = nil,
        pipelineStatus: PipelineStatus? = nil,
        tags: [String]? = nil,
        doNotContact: Bool? = nil
    ) {
        self.funnelId = funnelId
        self.leadIds = leadIds
        self.status = status
        self.pipelineStatus = pipelineStatus
        self.tags = tags
        self.doNotContact = doNotContact
    }
}

/// Paginated response for listing platform leads
public struct PaginatedPlatformLeads: Content, Sendable {
    public let items: [PlatformLead]
    public let nextCursor: String?
    public let totalCount: Int?

    public init(items: [PlatformLead], nextCursor: String? = nil, totalCount: Int? = nil) {
        self.items = items
        self.nextCursor = nextCursor
        self.totalCount = totalCount
    }
}

// MARK: - Notification Channel

/// Channels for sending notifications
public enum NotificationChannel: String, Content, CaseIterable, Sendable {
    case email = "email"
    case sms = "sms"
}

// MARK: - Notification Status

/// Status of a notification delivery
public enum NotificationStatus: String, Content, CaseIterable, Sendable {
    case sent = "sent"
    case failed = "failed"
    case skipped = "skipped"
}

// MARK: - Notification Record

/// Record of a notification sent for a lead
public struct NotificationRecord: Content, Sendable {
    /// DynamoDB partition key
    public let pk: String?

    /// DynamoDB sort key
    public let sk: String?

    /// Unique notification identifier (ULID)
    public let notificationId: String

    /// Lead this notification is for
    public let leadId: String

    /// Funnel the lead came from
    public let funnelId: String

    /// Organization (if assigned)
    public let orgId: String?

    /// User (if notification was user-specific)
    public let userId: String?

    /// Notification channel
    public let channel: NotificationChannel

    /// Hashed recipient (for privacy)
    public let recipient: String

    /// Delivery status
    public var status: NotificationStatus

    /// Error message if failed
    public var errorMessage: String?

    /// When the notification was sent (ISO 8601)
    public let sentAt: String

    /// GSI1 partition key (global log)
    public let gsi1pk: String?

    /// GSI1 sort key (timestamp)
    public let gsi1sk: String?

    public init(
        pk: String? = nil,
        sk: String? = nil,
        notificationId: String,
        leadId: String,
        funnelId: String,
        orgId: String? = nil,
        userId: String? = nil,
        channel: NotificationChannel,
        recipient: String,
        status: NotificationStatus,
        errorMessage: String? = nil,
        sentAt: String = ISO8601DateFormatter().string(from: Date()),
        gsi1pk: String? = nil,
        gsi1sk: String? = nil
    ) {
        self.pk = pk
        self.sk = sk
        self.notificationId = notificationId
        self.leadId = leadId
        self.funnelId = funnelId
        self.orgId = orgId
        self.userId = userId
        self.channel = channel
        self.recipient = recipient
        self.status = status
        self.errorMessage = errorMessage
        self.sentAt = sentAt
        self.gsi1pk = gsi1pk
        self.gsi1sk = gsi1sk
    }
}

/// Paginated response for listing notifications
public struct PaginatedNotifications: Content, Sendable {
    public let items: [NotificationRecord]
    public let nextCursor: String?

    public init(items: [NotificationRecord], nextCursor: String? = nil) {
        self.items = items
        self.nextCursor = nextCursor
    }
}

// MARK: - Export DTOs
// NOTE: ExportJob, ExportFormat, and ExportStatus are defined in ExportsService.swift
// This section only contains additional DTOs for the Admin API

/// Request body for creating an export job (Admin API version)
/// Uses ExportFormat from ExportsService.swift
public struct CreateExportRequest: Content, Sendable {
    public let funnelId: String?
    public let orgId: String?
    public let format: ExportFormat
    public let status: PlatformLeadStatus?
    public let startDate: String?
    public let endDate: String?
    public let fields: [String]?

    public init(
        funnelId: String? = nil,
        orgId: String? = nil,
        format: ExportFormat,
        status: PlatformLeadStatus? = nil,
        startDate: String? = nil,
        endDate: String? = nil,
        fields: [String]? = nil
    ) {
        self.funnelId = funnelId
        self.orgId = orgId
        self.format = format
        self.status = status
        self.startDate = startDate
        self.endDate = endDate
        self.fields = fields
    }
}

// MARK: - Audit Action

/// Types of auditable actions
public enum AuditAction: String, Content, CaseIterable, Sendable {
    case viewLead = "VIEW_LEAD"
    case viewLeads = "VIEW_LEADS"
    case updateLead = "UPDATE_LEAD"
    case bulkUpdateLeads = "BULK_UPDATE_LEADS"
    case createExport = "CREATE_EXPORT"
    case downloadExport = "DOWNLOAD_EXPORT"
    case viewStats = "VIEW_STATS"
    case flagUpdate = "flag.update"
}

// MARK: - Audit Resource Type

/// Types of resources that can be audited
public enum AuditResourceType: String, Content, CaseIterable, Sendable {
    case lead = "lead"
    case export = "export"
    case config = "config"
}

// MARK: - Audit Log Entry

/// Entry in the audit log for compliance and debugging
public struct AdminAuditLogEntry: Content, Sendable {
    /// DynamoDB partition key
    public let pk: String?

    /// DynamoDB sort key
    public let sk: String?

    /// User who performed the action
    public let userId: String

    /// Email of the user (hashed for privacy if needed)
    public let userEmail: String

    /// Action performed
    public let action: AuditAction

    /// Type of resource affected
    public let resourceType: AuditResourceType

    /// ID of the resource affected
    public let resourceId: String

    /// Funnel context (if applicable)
    public let funnelId: String?

    /// Additional details about the action
    public let details: [String: JSONValue]

    /// IP address of the request
    public let ipAddress: String

    /// User agent of the request
    public let userAgent: String

    /// When the action occurred (ISO 8601)
    public let timestamp: String

    /// TTL for DynamoDB auto-deletion
    public let ttl: Int

    public init(
        pk: String? = nil,
        sk: String? = nil,
        userId: String,
        userEmail: String,
        action: AuditAction,
        resourceType: AuditResourceType,
        resourceId: String,
        funnelId: String? = nil,
        details: [String: JSONValue] = [:],
        ipAddress: String,
        userAgent: String,
        timestamp: String = ISO8601DateFormatter().string(from: Date()),
        ttl: Int
    ) {
        self.pk = pk
        self.sk = sk
        self.userId = userId
        self.userEmail = userEmail
        self.action = action
        self.resourceType = resourceType
        self.resourceId = resourceId
        self.funnelId = funnelId
        self.details = details
        self.ipAddress = ipAddress
        self.userAgent = userAgent
        self.timestamp = timestamp
        self.ttl = ttl
    }
}

// MARK: - Platform Funnel Stats

/// Statistics for a specific funnel (admin view with extended metrics)
public struct PlatformFunnelStats: Content, Sendable {
    /// Funnel identifier
    public let funnelId: String

    /// Total number of leads
    public let totalLeads: Int

    /// Leads by status
    public let byStatus: [String: Int]

    /// Leads by pipeline status
    public let byPipelineStatus: [String: Int]

    /// Leads in the last 24 hours
    public let last24Hours: Int

    /// Leads in the last 7 days
    public let last7Days: Int

    /// Leads in the last 30 days
    public let last30Days: Int

    public init(
        funnelId: String,
        totalLeads: Int,
        byStatus: [String: Int],
        byPipelineStatus: [String: Int],
        last24Hours: Int,
        last7Days: Int,
        last30Days: Int
    ) {
        self.funnelId = funnelId
        self.totalLeads = totalLeads
        self.byStatus = byStatus
        self.byPipelineStatus = byPipelineStatus
        self.last24Hours = last24Hours
        self.last7Days = last7Days
        self.last30Days = last30Days
    }
}
