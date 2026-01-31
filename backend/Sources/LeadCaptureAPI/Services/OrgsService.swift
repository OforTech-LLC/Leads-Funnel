// =============================================================================
// OrgsService.swift
// LeadCaptureAPI/Services
// =============================================================================
// DynamoDB operations for Organisation management.
//
// Single-table access patterns:
//   PK = ORG#<orgId>   SK = META
//   GSI1PK = ORGS      GSI1SK = CREATED#<iso>  (for paginated list)
// =============================================================================

import Foundation
import SotoDynamoDB
import SotoCore

// MARK: - Organisation Model

/// Organisation entity
public struct Org: Codable, Sendable, Equatable {
    public let pk: String
    public let sk: String
    public let orgId: String
    public var name: String
    public var nameLower: String?
    public var slug: String
    public var contactEmail: String
    public var phone: String?
    public var timezone: String
    public var notifyEmails: [String]
    public var notifySms: [String]
    public var settings: [String: AnyCodable]
    public let createdAt: String
    public var updatedAt: String
    public var deletedAt: String?
    public let gsi1pk: String
    public let gsi1sk: String

    public init(
        orgId: String,
        name: String,
        slug: String,
        contactEmail: String,
        phone: String? = nil,
        timezone: String = "America/New_York",
        notifyEmails: [String] = [],
        notifySms: [String] = [],
        settings: [String: AnyCodable] = [:],
        createdAt: String,
        updatedAt: String,
        deletedAt: String? = nil
    ) {
        self.pk = "\(DBPrefixes.org)\(orgId)"
        self.sk = DBSortKeys.meta
        self.orgId = orgId
        self.name = name
        self.nameLower = name.trimmingCharacters(in: .whitespaces)
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .lowercased()
        self.slug = slug
        self.contactEmail = contactEmail
        self.phone = phone
        self.timezone = timezone
        self.notifyEmails = notifyEmails
        self.notifySms = notifySms
        self.settings = settings
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.deletedAt = deletedAt
        self.gsi1pk = GSIKeys.orgsList
        self.gsi1sk = "\(GSIKeys.created)\(createdAt)"
    }
}

/// Input for creating an organisation
public struct CreateOrgInput: Sendable {
    public let name: String
    public let slug: String
    public let contactEmail: String
    public let phone: String?
    public let timezone: String?
    public let notifyEmails: [String]?
    public let notifySms: [String]?
    public let settings: [String: AnyCodable]?

    public init(
        name: String,
        slug: String,
        contactEmail: String,
        phone: String? = nil,
        timezone: String? = nil,
        notifyEmails: [String]? = nil,
        notifySms: [String]? = nil,
        settings: [String: AnyCodable]? = nil
    ) {
        self.name = name
        self.slug = slug
        self.contactEmail = contactEmail
        self.phone = phone
        self.timezone = timezone
        self.notifyEmails = notifyEmails
        self.notifySms = notifySms
        self.settings = settings
    }
}

/// Input for updating an organisation
public struct UpdateOrgInput: Sendable {
    public let orgId: String
    public let name: String?
    public let slug: String?
    public let contactEmail: String?
    public let phone: String?
    public let timezone: String?
    public let notifyEmails: [String]?
    public let notifySms: [String]?
    public let settings: [String: AnyCodable]?

    public init(
        orgId: String,
        name: String? = nil,
        slug: String? = nil,
        contactEmail: String? = nil,
        phone: String? = nil,
        timezone: String? = nil,
        notifyEmails: [String]? = nil,
        notifySms: [String]? = nil,
        settings: [String: AnyCodable]? = nil
    ) {
        self.orgId = orgId
        self.name = name
        self.slug = slug
        self.contactEmail = contactEmail
        self.phone = phone
        self.timezone = timezone
        self.notifyEmails = notifyEmails
        self.notifySms = notifySms
        self.settings = settings
    }
}

/// Paginated organisations result
public struct PaginatedOrgs: Sendable {
    public let items: [Org]
    public let nextCursor: String?

    public init(items: [Org], nextCursor: String? = nil) {
        self.items = items
        self.nextCursor = nextCursor
    }
}

// MARK: - Orgs Service

/// Service for Organisation DynamoDB operations
public actor OrgsService {

    // MARK: - Properties

    private let client: DynamoDB
    private let tableName: String
    private let config: AppConfig

    // MARK: - Initialization

    public init(client: AWSClient, config: AppConfig = .shared) {
        self.client = DynamoDB(client: client, region: .init(rawValue: config.awsRegion))
        self.tableName = Self.getOrgsTableName(config: config)
        self.config = config
    }

    /// Get the orgs table name from environment or config
    private static func getOrgsTableName(config: AppConfig) -> String {
        if let tableName = ProcessInfo.processInfo.environment["ORGS_TABLE_NAME"] {
            return tableName
        }
        // Fallback to convention: replace suffix with -orgs
        let baseTable = config.dynamoDBTableName
        if baseTable.hasSuffix("-leads") {
            return baseTable.replacingOccurrences(of: "-leads", with: "-orgs")
        }
        return "\(baseTable)-orgs"
    }

    // MARK: - Create

    /// Create a new organisation
    /// - Parameter input: Organisation creation input
    /// - Returns: The created organisation
    public func createOrg(_ input: CreateOrgInput) async throws -> Org {
        let orgId = ULID.generate()
        let now = ISO8601DateFormatter().string(from: Date())

        let org = Org(
            orgId: orgId,
            name: input.name,
            slug: input.slug,
            contactEmail: input.contactEmail,
            phone: input.phone,
            timezone: input.timezone ?? "America/New_York",
            notifyEmails: input.notifyEmails ?? [],
            notifySms: input.notifySms ?? [],
            settings: input.settings ?? [:],
            createdAt: now,
            updatedAt: now
        )

        let dynamoInput = DynamoDB.PutItemInput(
            conditionExpression: "attribute_not_exists(pk)",
            item: try encodeToDynamoDB(org),
            tableName: tableName
        )

        do {
            _ = try await client.putItem(dynamoInput)
            SecureLogger.info("org.created", metadata: ["orgId": orgId])
            return org
        } catch let error as AWSClientError where error.errorCode == "ConditionalCheckFailedException" {
            throw AdminServiceError.conditionalCheckFailed(message: "Organisation already exists: \(error.localizedDescription)")
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - Read

    /// Get an organisation by ID
    /// - Parameter orgId: The organisation ID
    /// - Returns: The organisation if found and not deleted
    public func getOrg(_ orgId: String) async throws -> Org? {
        let input = DynamoDB.GetItemInput(
            key: [
                "pk": .s("\(DBPrefixes.org)\(orgId)"),
                "sk": .s(DBSortKeys.meta)
            ],
            tableName: tableName
        )

        do {
            let response = try await client.getItem(input)
            guard let item = response.item else { return nil }
            let org: Org = try decodeFromDynamoDB(item)
            // Return nil if soft-deleted
            if org.deletedAt != nil { return nil }
            return org
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - Update

    /// Update an organisation
    /// - Parameter input: Update input
    /// - Returns: The updated organisation
    public func updateOrg(_ input: UpdateOrgInput) async throws -> Org {
        let now = ISO8601DateFormatter().string(from: Date())

        var updateParts: [String] = ["#updatedAt = :updatedAt"]
        var expressionNames: [String: String] = ["#updatedAt": "updatedAt"]
        var expressionValues: [String: DynamoDB.AttributeValue] = [":updatedAt": .s(now)]

        if let name = input.name {
            updateParts.append("#name = :name")
            expressionNames["#name"] = "name"
            expressionValues[":name"] = .s(name)

            updateParts.append("#nameLower = :nameLower")
            expressionNames["#nameLower"] = "nameLower"
            let nameLower = name.trimmingCharacters(in: .whitespaces)
                .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
                .lowercased()
            expressionValues[":nameLower"] = .s(nameLower)
        }
        if let slug = input.slug {
            updateParts.append("slug = :slug")
            expressionValues[":slug"] = .s(slug)
        }
        if let contactEmail = input.contactEmail {
            updateParts.append("contactEmail = :contactEmail")
            expressionValues[":contactEmail"] = .s(contactEmail)
        }
        if let phone = input.phone {
            updateParts.append("phone = :phone")
            expressionValues[":phone"] = .s(phone)
        }
        if let timezone = input.timezone {
            updateParts.append("timezone = :tz")
            expressionValues[":tz"] = .s(timezone)
        }
        if let notifyEmails = input.notifyEmails {
            updateParts.append("notifyEmails = :ne")
            expressionValues[":ne"] = .l(notifyEmails.map { .s($0) })
        }
        if let notifySms = input.notifySms {
            updateParts.append("notifySms = :ns")
            expressionValues[":ns"] = .l(notifySms.map { .s($0) })
        }
        if let settings = input.settings {
            updateParts.append("settings = :settings")
            expressionValues[":settings"] = anyToAttributeValue(settings.mapValues { $0.value })
        }

        let dynamoInput = DynamoDB.UpdateItemInput(
            conditionExpression: "attribute_exists(pk) AND attribute_not_exists(deletedAt)",
            expressionAttributeNames: expressionNames,
            expressionAttributeValues: expressionValues,
            key: [
                "pk": .s("\(DBPrefixes.org)\(input.orgId)"),
                "sk": .s(DBSortKeys.meta)
            ],
            returnValues: .allNew,
            tableName: tableName,
            updateExpression: "SET \(updateParts.joined(separator: ", "))"
        )

        do {
            let response = try await client.updateItem(dynamoInput)
            guard let attributes = response.attributes else {
                throw AdminServiceError.notFound(entity: "Org", id: input.orgId)
            }
            return try decodeFromDynamoDB(attributes)
        } catch let error as AWSClientError where error.errorCode == "ConditionalCheckFailedException" {
            throw AdminServiceError.notFound(entity: "Org", id: input.orgId)
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - Delete

    /// Soft delete an organisation
    /// - Parameter orgId: The organisation ID
    public func softDeleteOrg(_ orgId: String) async throws {
        let now = ISO8601DateFormatter().string(from: Date())

        let input = DynamoDB.UpdateItemInput(
            conditionExpression: "attribute_exists(pk) AND attribute_not_exists(deletedAt)",
            expressionAttributeNames: ["#updatedAt": "updatedAt"],
            expressionAttributeValues: [
                ":d": .s(now),
                ":u": .s(now)
            ],
            key: [
                "pk": .s("\(DBPrefixes.org)\(orgId)"),
                "sk": .s(DBSortKeys.meta)
            ],
            tableName: tableName,
            updateExpression: "SET deletedAt = :d, #updatedAt = :u"
        )

        do {
            _ = try await client.updateItem(input)
            SecureLogger.info("org.deleted", metadata: ["orgId": orgId])
        } catch let error as AWSClientError where error.errorCode == "ConditionalCheckFailedException" {
            throw AdminServiceError.notFound(entity: "Org", id: orgId)
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - List

    /// List organisations with pagination and optional search
    /// - Parameters:
    ///   - cursor: Pagination cursor
    ///   - limit: Maximum number of items to return
    ///   - search: Optional search term
    /// - Returns: Paginated organisations
    public func listOrgs(
        cursor: String? = nil,
        limit: Int = 25,
        search: String? = nil
    ) async throws -> PaginatedOrgs {
        var exclusiveStartKey: [String: DynamoDB.AttributeValue]?
        if let cursor = cursor, let decoded = CursorCodec.decode(cursor) {
            exclusiveStartKey = decoded
        }

        var filterExpressions: [String] = ["attribute_not_exists(deletedAt)"]
        var expressionNames: [String: String] = [:]
        var expressionValues: [String: DynamoDB.AttributeValue] = [
            ":pk": .s(GSIKeys.orgsList)
        ]

        if let search = search?.trimmingCharacters(in: .whitespaces).lowercased(), !search.isEmpty {
            filterExpressions.append(
                "(contains(#nameLower, :search) OR contains(#slug, :search) OR contains(#orgId, :search))"
            )
            expressionNames["#nameLower"] = "nameLower"
            expressionNames["#slug"] = "slug"
            expressionNames["#orgId"] = "orgId"
            expressionValues[":search"] = .s(search)
        }

        let input = DynamoDB.QueryInput(
            exclusiveStartKey: exclusiveStartKey,
            expressionAttributeNames: expressionNames.isEmpty ? nil : expressionNames,
            expressionAttributeValues: expressionValues,
            filterExpression: filterExpressions.joined(separator: " AND "),
            indexName: GSIIndexNames.gsi1,
            keyConditionExpression: "gsi1pk = :pk",
            limit: limit,
            scanIndexForward: false,
            tableName: tableName
        )

        do {
            let response = try await client.query(input)
            let items: [Org] = try (response.items ?? []).map { try decodeFromDynamoDB($0) }

            var nextCursor: String?
            if let lastKey = response.lastEvaluatedKey {
                nextCursor = CursorCodec.encode(lastKey)
            }

            return PaginatedOrgs(items: items, nextCursor: nextCursor)
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
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
