// =============================================================================
// MembershipsService.swift
// LeadCaptureAPI/Services
// =============================================================================
// DynamoDB operations for Org Memberships and Invites.
//
// Single-table access patterns:
//   PK = ORG#<orgId>     SK = MEMBER#<userId>   (org members)
//   GSI1PK = USER#<userId>  GSI1SK = ORG#<orgId>  (user orgs)
//   PK = ORG#<orgId>     SK = INVITE#<email>    (org invites)
// =============================================================================

import Foundation
import SotoDynamoDB
import SotoCore

// MARK: - Membership Role

/// Role within an organisation
public enum MembershipRole: String, Codable, Sendable {
    case orgOwner = "ORG_OWNER"
    case manager = "MANAGER"
    case agent = "AGENT"
    case viewer = "VIEWER"
}

// MARK: - Invite Status

/// Status of an organisation invite
public enum InviteStatus: String, Codable, Sendable {
    case pending
    case accepted
    case expired
}

// MARK: - Membership Model

/// Organisation membership entity
public struct Membership: Codable, Sendable, Equatable {
    public let pk: String
    public let sk: String
    public let orgId: String
    public let userId: String
    public var role: MembershipRole
    public var notifyEmail: Bool
    public var notifySms: Bool
    public let joinedAt: String
    public var updatedAt: String
    public let gsi1pk: String
    public let gsi1sk: String

    public init(
        orgId: String,
        userId: String,
        role: MembershipRole,
        notifyEmail: Bool = true,
        notifySms: Bool = false,
        joinedAt: String,
        updatedAt: String
    ) {
        self.pk = "\(DBPrefixes.org)\(orgId)"
        self.sk = "\(GSIKeys.member)\(userId)"
        self.orgId = orgId
        self.userId = userId
        self.role = role
        self.notifyEmail = notifyEmail
        self.notifySms = notifySms
        self.joinedAt = joinedAt
        self.updatedAt = updatedAt
        self.gsi1pk = "\(DBPrefixes.user)\(userId)"
        self.gsi1sk = "\(DBPrefixes.org)\(orgId)"
    }
}

/// Organisation invite entity
public struct OrgInvite: Codable, Sendable, Equatable {
    public let pk: String
    public let sk: String
    public let orgId: String
    public let inviteId: String
    public let email: String
    public let role: MembershipRole
    public var status: InviteStatus
    public let invitedBy: String
    public let invitedByName: String
    public let createdAt: String
    public let expiresAt: String
    public let ttl: Int

    public init(
        orgId: String,
        inviteId: String,
        email: String,
        role: MembershipRole,
        status: InviteStatus = .pending,
        invitedBy: String,
        invitedByName: String,
        createdAt: String,
        expiresAt: String,
        ttl: Int
    ) {
        let emailLower = email.lowercased().trimmingCharacters(in: .whitespaces)
        self.pk = "\(DBPrefixes.org)\(orgId)"
        self.sk = "\(GSIKeys.invite)\(emailLower)"
        self.orgId = orgId
        self.inviteId = inviteId
        self.email = emailLower
        self.role = role
        self.status = status
        self.invitedBy = invitedBy
        self.invitedByName = invitedByName
        self.createdAt = createdAt
        self.expiresAt = expiresAt
        self.ttl = ttl
    }
}

/// Input for adding a member
public struct AddMemberInput: Sendable {
    public let orgId: String
    public let userId: String
    public let role: MembershipRole
    public let notifyEmail: Bool?
    public let notifySms: Bool?

    public init(
        orgId: String,
        userId: String,
        role: MembershipRole,
        notifyEmail: Bool? = nil,
        notifySms: Bool? = nil
    ) {
        self.orgId = orgId
        self.userId = userId
        self.role = role
        self.notifyEmail = notifyEmail
        self.notifySms = notifySms
    }
}

/// Input for updating a member
public struct UpdateMemberInput: Sendable {
    public let orgId: String
    public let userId: String
    public let role: MembershipRole?
    public let notifyEmail: Bool?
    public let notifySms: Bool?

    public init(
        orgId: String,
        userId: String,
        role: MembershipRole? = nil,
        notifyEmail: Bool? = nil,
        notifySms: Bool? = nil
    ) {
        self.orgId = orgId
        self.userId = userId
        self.role = role
        self.notifyEmail = notifyEmail
        self.notifySms = notifySms
    }
}

/// Input for creating an invite
public struct CreateInviteInput: Sendable {
    public let orgId: String
    public let email: String
    public let role: MembershipRole
    public let invitedBy: String
    public let invitedByName: String

    public init(
        orgId: String,
        email: String,
        role: MembershipRole,
        invitedBy: String,
        invitedByName: String
    ) {
        self.orgId = orgId
        self.email = email
        self.role = role
        self.invitedBy = invitedBy
        self.invitedByName = invitedByName
    }
}

/// Paginated memberships result
public struct PaginatedMemberships: Sendable {
    public let items: [Membership]
    public let nextCursor: String?

    public init(items: [Membership], nextCursor: String? = nil) {
        self.items = items
        self.nextCursor = nextCursor
    }
}

/// Paginated invites result
public struct PaginatedInvites: Sendable {
    public let items: [OrgInvite]
    public let nextCursor: String?

    public init(items: [OrgInvite], nextCursor: String? = nil) {
        self.items = items
        self.nextCursor = nextCursor
    }
}

// MARK: - Memberships Service

/// Service for Membership DynamoDB operations
public actor MembershipsService {

    // MARK: - Properties

    private let client: DynamoDB
    private let tableName: String
    private let config: AppConfig

    /// Invite TTL in days
    private static let inviteTTLDays = 7

    // MARK: - Initialization

    public init(client: AWSClient, config: AppConfig = .shared) {
        self.client = DynamoDB(client: client, region: .init(rawValue: config.awsRegion))
        self.tableName = Self.getMembershipsTableName(config: config)
        self.config = config
    }

    /// Get the memberships table name from environment or config
    private static func getMembershipsTableName(config: AppConfig) -> String {
        if let tableName = ProcessInfo.processInfo.environment["MEMBERSHIPS_TABLE_NAME"] {
            return tableName
        }
        let baseTable = config.dynamoDBTableName
        if baseTable.hasSuffix("-leads") {
            return baseTable.replacingOccurrences(of: "-leads", with: "-memberships")
        }
        return "\(baseTable)-memberships"
    }

    // MARK: - Add Member

    /// Add a member to an organisation
    /// - Parameter input: Member addition input
    /// - Returns: The created membership
    public func addMember(_ input: AddMemberInput) async throws -> Membership {
        let now = ISO8601DateFormatter().string(from: Date())

        let membership = Membership(
            orgId: input.orgId,
            userId: input.userId,
            role: input.role,
            notifyEmail: input.notifyEmail ?? true,
            notifySms: input.notifySms ?? false,
            joinedAt: now,
            updatedAt: now
        )

        let dynamoInput = DynamoDB.PutItemInput(
            conditionExpression: "attribute_not_exists(pk) OR attribute_not_exists(sk)",
            item: try encodeToDynamoDB(membership),
            tableName: tableName
        )

        do {
            _ = try await client.putItem(dynamoInput)
            SecureLogger.info("membership.added", metadata: ["orgId": input.orgId, "userId": input.userId])
            return membership
        } catch let error as AWSClientError where error.errorCode == "ConditionalCheckFailedException" {
            throw AdminServiceError.conditionalCheckFailed(message: "Membership already exists: \(error.localizedDescription)")
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - Get Member

    /// Get a member by org ID and user ID
    /// - Parameters:
    ///   - orgId: The organisation ID
    ///   - userId: The user ID
    /// - Returns: The membership if found
    public func getMember(orgId: String, userId: String) async throws -> Membership? {
        let input = DynamoDB.GetItemInput(
            key: [
                "pk": .s("\(DBPrefixes.org)\(orgId)"),
                "sk": .s("\(GSIKeys.member)\(userId)")
            ],
            tableName: tableName
        )

        do {
            let response = try await client.getItem(input)
            guard let item = response.item else { return nil }
            return try decodeFromDynamoDB(item)
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - Update Member

    /// Update a membership
    /// - Parameter input: Update input
    /// - Returns: The updated membership
    public func updateMember(_ input: UpdateMemberInput) async throws -> Membership {
        let now = ISO8601DateFormatter().string(from: Date())

        var updateParts: [String] = ["#updatedAt = :updatedAt"]
        var expressionNames: [String: String] = ["#updatedAt": "updatedAt"]
        var expressionValues: [String: DynamoDB.AttributeValue] = [":updatedAt": .s(now)]

        if let role = input.role {
            updateParts.append("#role = :role")
            expressionNames["#role"] = "role"
            expressionValues[":role"] = .s(role.rawValue)
        }
        if let notifyEmail = input.notifyEmail {
            updateParts.append("notifyEmail = :ne")
            expressionValues[":ne"] = .bool(notifyEmail)
        }
        if let notifySms = input.notifySms {
            updateParts.append("notifySms = :ns")
            expressionValues[":ns"] = .bool(notifySms)
        }

        let dynamoInput = DynamoDB.UpdateItemInput(
            conditionExpression: "attribute_exists(pk)",
            expressionAttributeNames: expressionNames,
            expressionAttributeValues: expressionValues,
            key: [
                "pk": .s("\(DBPrefixes.org)\(input.orgId)"),
                "sk": .s("\(GSIKeys.member)\(input.userId)")
            ],
            returnValues: .allNew,
            tableName: tableName,
            updateExpression: "SET \(updateParts.joined(separator: ", "))"
        )

        do {
            let response = try await client.updateItem(dynamoInput)
            guard let attributes = response.attributes else {
                throw AdminServiceError.notFound(entity: "Membership", id: "\(input.orgId)/\(input.userId)")
            }
            return try decodeFromDynamoDB(attributes)
        } catch let error as AWSClientError where error.errorCode == "ConditionalCheckFailedException" {
            throw AdminServiceError.notFound(entity: "Membership", id: "\(input.orgId)/\(input.userId)")
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - Remove Member

    /// Remove a member from an organisation
    /// - Parameters:
    ///   - orgId: The organisation ID
    ///   - userId: The user ID
    public func removeMember(orgId: String, userId: String) async throws {
        let input = DynamoDB.DeleteItemInput(
            conditionExpression: "attribute_exists(pk)",
            key: [
                "pk": .s("\(DBPrefixes.org)\(orgId)"),
                "sk": .s("\(GSIKeys.member)\(userId)")
            ],
            tableName: tableName
        )

        do {
            _ = try await client.deleteItem(input)
            SecureLogger.info("membership.removed", metadata: ["orgId": orgId, "userId": userId])
        } catch let error as AWSClientError where error.errorCode == "ConditionalCheckFailedException" {
            throw AdminServiceError.notFound(entity: "Membership", id: "\(orgId)/\(userId)")
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - List Org Members

    /// List all members of an organisation
    /// - Parameters:
    ///   - orgId: The organisation ID
    ///   - cursor: Pagination cursor
    ///   - limit: Maximum number of items to return
    /// - Returns: Paginated memberships
    public func listOrgMembers(
        orgId: String,
        cursor: String? = nil,
        limit: Int = 50
    ) async throws -> PaginatedMemberships {
        var exclusiveStartKey: [String: DynamoDB.AttributeValue]?
        if let cursor = cursor, let decoded = CursorCodec.decode(cursor) {
            exclusiveStartKey = decoded
        }

        let input = DynamoDB.QueryInput(
            exclusiveStartKey: exclusiveStartKey,
            expressionAttributeValues: [
                ":pk": .s("\(DBPrefixes.org)\(orgId)"),
                ":skPrefix": .s(GSIKeys.member)
            ],
            keyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
            limit: limit,
            tableName: tableName
        )

        do {
            let response = try await client.query(input)
            let items: [Membership] = try (response.items ?? []).map { try decodeFromDynamoDB($0) }

            var nextCursor: String?
            if let lastKey = response.lastEvaluatedKey {
                nextCursor = CursorCodec.encode(lastKey)
            }

            return PaginatedMemberships(items: items, nextCursor: nextCursor)
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - List User Orgs

    /// List all organisations a user belongs to
    /// - Parameters:
    ///   - userId: The user ID
    ///   - cursor: Pagination cursor
    ///   - limit: Maximum number of items to return
    /// - Returns: Paginated memberships
    public func listUserOrgs(
        userId: String,
        cursor: String? = nil,
        limit: Int = 50
    ) async throws -> PaginatedMemberships {
        var exclusiveStartKey: [String: DynamoDB.AttributeValue]?
        if let cursor = cursor, let decoded = CursorCodec.decode(cursor) {
            exclusiveStartKey = decoded
        }

        let input = DynamoDB.QueryInput(
            exclusiveStartKey: exclusiveStartKey,
            expressionAttributeValues: [
                ":pk": .s("\(DBPrefixes.user)\(userId)"),
                ":skPrefix": .s(DBPrefixes.org)
            ],
            indexName: GSIIndexNames.gsi1,
            keyConditionExpression: "gsi1pk = :pk AND begins_with(gsi1sk, :skPrefix)",
            limit: limit,
            tableName: tableName
        )

        do {
            let response = try await client.query(input)
            let items: [Membership] = try (response.items ?? []).map { try decodeFromDynamoDB($0) }

            var nextCursor: String?
            if let lastKey = response.lastEvaluatedKey {
                nextCursor = CursorCodec.encode(lastKey)
            }

            return PaginatedMemberships(items: items, nextCursor: nextCursor)
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - Create Invite

    /// Create an invitation to join an organisation
    /// - Parameter input: Invite creation input
    /// - Returns: The created invite
    public func createInvite(_ input: CreateInviteInput) async throws -> OrgInvite {
        let now = Date()
        let nowIso = ISO8601DateFormatter().string(from: now)
        let expiresAt = ISO8601DateFormatter().string(from: now.addingTimeInterval(TimeInterval(Self.inviteTTLDays * 24 * 60 * 60)))
        let ttl = Int(now.timeIntervalSince1970) + (Self.inviteTTLDays * 24 * 60 * 60)
        let inviteId = ULID.generate()

        let invite = OrgInvite(
            orgId: input.orgId,
            inviteId: inviteId,
            email: input.email,
            role: input.role,
            status: .pending,
            invitedBy: input.invitedBy,
            invitedByName: input.invitedByName,
            createdAt: nowIso,
            expiresAt: expiresAt,
            ttl: ttl
        )

        let dynamoInput = DynamoDB.PutItemInput(
            conditionExpression: "attribute_not_exists(pk) OR attribute_not_exists(sk)",
            item: try encodeToDynamoDB(invite),
            tableName: tableName
        )

        do {
            _ = try await client.putItem(dynamoInput)
            SecureLogger.info("invite.created", metadata: ["orgId": input.orgId, "inviteId": inviteId])
            return invite
        } catch let error as AWSClientError where error.errorCode == "ConditionalCheckFailedException" {
            throw AdminServiceError.conditionalCheckFailed(message: "Invite already exists for this email: \(error.localizedDescription)")
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - List Invites

    /// List all invites for an organisation
    /// - Parameters:
    ///   - orgId: The organisation ID
    ///   - cursor: Pagination cursor
    ///   - limit: Maximum number of items to return
    /// - Returns: Paginated invites
    public func listInvites(
        orgId: String,
        cursor: String? = nil,
        limit: Int = 50
    ) async throws -> PaginatedInvites {
        var exclusiveStartKey: [String: DynamoDB.AttributeValue]?
        if let cursor = cursor, let decoded = CursorCodec.decode(cursor) {
            exclusiveStartKey = decoded
        }

        let input = DynamoDB.QueryInput(
            exclusiveStartKey: exclusiveStartKey,
            expressionAttributeValues: [
                ":pk": .s("\(DBPrefixes.org)\(orgId)"),
                ":skPrefix": .s(GSIKeys.invite)
            ],
            keyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
            limit: limit,
            tableName: tableName
        )

        do {
            let response = try await client.query(input)
            let items: [OrgInvite] = try (response.items ?? []).map { try decodeFromDynamoDB($0) }

            var nextCursor: String?
            if let lastKey = response.lastEvaluatedKey {
                nextCursor = CursorCodec.encode(lastKey)
            }

            return PaginatedInvites(items: items, nextCursor: nextCursor)
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - Get Org Notify Recipients

    /// Get all members of an org who should receive notifications
    /// - Parameter orgId: The organisation ID
    /// - Returns: All members with notifications enabled
    public func getOrgNotifyRecipients(_ orgId: String) async throws -> [Membership] {
        var recipients: [Membership] = []
        var lastKey: [String: DynamoDB.AttributeValue]?

        repeat {
            let input = DynamoDB.QueryInput(
                exclusiveStartKey: lastKey,
                expressionAttributeValues: [
                    ":pk": .s("\(DBPrefixes.org)\(orgId)"),
                    ":skPrefix": .s(GSIKeys.member),
                    ":yes": .bool(true)
                ],
                filterExpression: "notifyEmail = :yes OR notifySms = :yes",
                keyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
                tableName: tableName
            )

            do {
                let response = try await client.query(input)
                let items: [Membership] = try (response.items ?? []).map { try decodeFromDynamoDB($0) }
                recipients.append(contentsOf: items)
                lastKey = response.lastEvaluatedKey
            } catch {
                throw AdminServiceError.databaseError(underlying: error)
            }
        } while lastKey != nil

        return recipients
    }

    // MARK: - DynamoDB Encoding/Decoding

    private func encodeToDynamoDB<T: Encodable>(_ value: T) throws -> [String: DynamoDB.AttributeValue] {
        let encoder = JSONEncoder()
        let data = try encoder.encode(value)

        guard let dict = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw AdminServiceError.internalError(message: "Failed to encode to DynamoDB format")
        }

        return dict.mapValues { anyToAttributeValue($0) }
    }

    private func decodeFromDynamoDB<T: Decodable>(_ item: [String: DynamoDB.AttributeValue]) throws -> T {
        let dict = item.mapValues { attributeValueToAny($0) }
        let data = try JSONSerialization.data(withJSONObject: dict)
        let decoder = JSONDecoder()
        return try decoder.decode(T.self, from: data)
    }

    private func anyToAttributeValue(_ value: Any) -> DynamoDB.AttributeValue {
        switch value {
        case let string as String:
            return .s(string)
        case let number as NSNumber:
            return .n(number.stringValue)
        case let bool as Bool:
            return .bool(bool)
        case let array as [Any]:
            return .l(array.map { anyToAttributeValue($0) })
        case let dict as [String: Any]:
            return .m(dict.mapValues { anyToAttributeValue($0) })
        case is NSNull:
            return .null(true)
        default:
            return .s(String(describing: value))
        }
    }

    private func attributeValueToAny(_ attr: DynamoDB.AttributeValue) -> Any {
        switch attr {
        case .s(let string):
            return string
        case .n(let number):
            if let int = Int(number) { return int }
            if let double = Double(number) { return double }
            return number
        case .bool(let bool):
            return bool
        case .l(let array):
            return array.map { attributeValueToAny($0) }
        case .m(let dict):
            return dict.mapValues { attributeValueToAny($0) }
        case .null:
            return NSNull()
        case .b(let data):
            if let bytes = data.decoded() {
                return Data(bytes).base64EncodedString()
            }
            return ""
        case .ss(let stringSet):
            return stringSet
        case .ns(let numberSet):
            return numberSet
        case .bs(let binarySet):
            return binarySet.compactMap { item -> String? in
                guard let bytes = item.decoded() else { return nil }
                return Data(bytes).base64EncodedString()
            }
        }
    }
}
