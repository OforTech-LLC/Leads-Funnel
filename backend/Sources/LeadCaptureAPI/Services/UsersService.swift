// =============================================================================
// UsersService.swift
// LeadCaptureAPI/Services
// =============================================================================
// DynamoDB operations for User management.
//
// Single-table access patterns:
//   PK = USER#<userId>   SK = META
//   GSI1PK = EMAIL#<email>  GSI1SK = META       (lookup by email)
//   GSI2PK = COGNITOSUB#<sub> GSI2SK = META     (lookup by Cognito sub)
//   GSI3PK = USERS        GSI3SK = CREATED#<iso> (paginated list)
// =============================================================================

import Foundation
import SotoDynamoDB
import SotoCore

// MARK: - User Status

/// User account status
public enum UserStatus: String, Codable, Sendable {
    case active
    case inactive
    case invited
}

// MARK: - User Model

/// User entity
public struct User: Codable, Sendable, Equatable {
    public let pk: String
    public let sk: String
    public let userId: String
    public var cognitoSub: String?
    public var email: String
    public var name: String
    public var nameLower: String?
    public var status: UserStatus
    public var phone: String?
    public var avatarUrl: String?
    public var preferences: [String: AnyCodable]
    public let createdAt: String
    public var updatedAt: String
    public var deletedAt: String?
    public let gsi1pk: String
    public var gsi1sk: String
    public var gsi2pk: String?
    public var gsi2sk: String?
    public let gsi3pk: String
    public let gsi3sk: String

    public init(
        userId: String,
        email: String,
        name: String,
        cognitoSub: String? = nil,
        status: UserStatus = .active,
        phone: String? = nil,
        avatarUrl: String? = nil,
        preferences: [String: AnyCodable] = [:],
        createdAt: String,
        updatedAt: String,
        deletedAt: String? = nil
    ) {
        let emailLower = email.lowercased().trimmingCharacters(in: .whitespaces)

        self.pk = "\(DBPrefixes.user)\(userId)"
        self.sk = DBSortKeys.meta
        self.userId = userId
        self.cognitoSub = cognitoSub
        self.email = emailLower
        self.name = name
        self.nameLower = name.trimmingCharacters(in: .whitespaces)
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .lowercased()
        self.status = status
        self.phone = phone
        self.avatarUrl = avatarUrl
        self.preferences = preferences
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.deletedAt = deletedAt
        self.gsi1pk = "\(GSIKeys.email)\(emailLower)"
        self.gsi1sk = DBSortKeys.meta
        self.gsi2pk = cognitoSub.map { "\(GSIKeys.cognitoSub)\($0)" }
        self.gsi2sk = cognitoSub != nil ? DBSortKeys.meta : nil
        self.gsi3pk = GSIKeys.usersList
        self.gsi3sk = "\(GSIKeys.created)\(createdAt)"
    }
}

/// Input for creating a user
public struct CreateUserInput: Sendable {
    public let email: String
    public let name: String
    public let cognitoSub: String?
    public let status: UserStatus?
    public let phone: String?
    public let avatarUrl: String?
    public let preferences: [String: AnyCodable]?

    public init(
        email: String,
        name: String,
        cognitoSub: String? = nil,
        status: UserStatus? = nil,
        phone: String? = nil,
        avatarUrl: String? = nil,
        preferences: [String: AnyCodable]? = nil
    ) {
        self.email = email
        self.name = name
        self.cognitoSub = cognitoSub
        self.status = status
        self.phone = phone
        self.avatarUrl = avatarUrl
        self.preferences = preferences
    }
}

/// Input for updating a user
public struct UpdateUserInput: Sendable {
    public let userId: String
    public let email: String?
    public let name: String?
    public let cognitoSub: String?
    public let status: UserStatus?
    public let phone: String?
    public let avatarUrl: String?
    public let preferences: [String: AnyCodable]?

    public init(
        userId: String,
        email: String? = nil,
        name: String? = nil,
        cognitoSub: String? = nil,
        status: UserStatus? = nil,
        phone: String? = nil,
        avatarUrl: String? = nil,
        preferences: [String: AnyCodable]? = nil
    ) {
        self.userId = userId
        self.email = email
        self.name = name
        self.cognitoSub = cognitoSub
        self.status = status
        self.phone = phone
        self.avatarUrl = avatarUrl
        self.preferences = preferences
    }
}

/// Input for listing users
public struct ListUsersInput: Sendable {
    public let cursor: String?
    public let limit: Int?
    public let search: String?
    public let status: UserStatus?

    public init(
        cursor: String? = nil,
        limit: Int? = nil,
        search: String? = nil,
        status: UserStatus? = nil
    ) {
        self.cursor = cursor
        self.limit = limit
        self.search = search
        self.status = status
    }
}

/// Paginated users result
public struct PaginatedUsers: Sendable {
    public let items: [User]
    public let nextCursor: String?

    public init(items: [User], nextCursor: String? = nil) {
        self.items = items
        self.nextCursor = nextCursor
    }
}

// MARK: - Users Service

/// Service for User DynamoDB operations
public actor UsersService {

    // MARK: - Properties

    private let client: DynamoDB
    private let tableName: String
    private let config: AppConfig

    // MARK: - Initialization

    public init(client: AWSClient, config: AppConfig = .shared) {
        self.client = DynamoDB(client: client, region: .init(rawValue: config.awsRegion))
        self.tableName = Self.getUsersTableName(config: config)
        self.config = config
    }

    /// Get the users table name from environment or config
    private static func getUsersTableName(config: AppConfig) -> String {
        if let tableName = ProcessInfo.processInfo.environment["USERS_TABLE_NAME"] {
            return tableName
        }
        let baseTable = config.dynamoDBTableName
        if baseTable.hasSuffix("-leads") {
            return baseTable.replacingOccurrences(of: "-leads", with: "-users")
        }
        return "\(baseTable)-users"
    }

    // MARK: - Create

    /// Create a new user
    /// - Parameter input: User creation input
    /// - Returns: The created user
    public func createUser(_ input: CreateUserInput) async throws -> User {
        let userId = ULID.generate()
        let now = ISO8601DateFormatter().string(from: Date())

        let user = User(
            userId: userId,
            email: input.email,
            name: input.name,
            cognitoSub: input.cognitoSub,
            status: input.status ?? .active,
            phone: input.phone,
            avatarUrl: input.avatarUrl,
            preferences: input.preferences ?? [:],
            createdAt: now,
            updatedAt: now
        )

        let dynamoInput = DynamoDB.PutItemInput(
            conditionExpression: "attribute_not_exists(pk)",
            item: try encodeToDynamoDB(user),
            tableName: tableName
        )

        do {
            _ = try await client.putItem(dynamoInput)
            SecureLogger.info("user.created", metadata: ["userId": userId])
            return user
        } catch let error as AWSClientError where error.errorCode == "ConditionalCheckFailedException" {
            throw AdminServiceError.conditionalCheckFailed(message: "User already exists: \(error.localizedDescription)")
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - Read

    /// Get a user by ID
    /// - Parameter userId: The user ID
    /// - Returns: The user if found and not deleted
    public func getUser(_ userId: String) async throws -> User? {
        let input = DynamoDB.GetItemInput(
            key: [
                "pk": .s("\(DBPrefixes.user)\(userId)"),
                "sk": .s(DBSortKeys.meta)
            ],
            tableName: tableName
        )

        do {
            let response = try await client.getItem(input)
            guard let item = response.item else { return nil }
            let user: User = try decodeFromDynamoDB(item)
            if user.deletedAt != nil { return nil }
            return user
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    /// Get a user by email
    /// - Parameter email: The email address
    /// - Returns: The user if found and not deleted
    public func getUserByEmail(_ email: String) async throws -> User? {
        let emailLower = email.lowercased().trimmingCharacters(in: .whitespaces)

        let input = DynamoDB.QueryInput(
            expressionAttributeValues: [
                ":pk": .s("\(GSIKeys.email)\(emailLower)"),
                ":sk": .s(DBSortKeys.meta)
            ],
            filterExpression: "attribute_not_exists(deletedAt)",
            indexName: GSIIndexNames.gsi1,
            keyConditionExpression: "gsi1pk = :pk AND gsi1sk = :sk",
            limit: 1,
            tableName: tableName
        )

        do {
            let response = try await client.query(input)
            guard let items = response.items, let first = items.first else { return nil }
            return try decodeFromDynamoDB(first)
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    /// Get a user by Cognito sub
    /// - Parameter cognitoSub: The Cognito subject identifier
    /// - Returns: The user if found and not deleted
    public func getUserByCognitoSub(_ cognitoSub: String) async throws -> User? {
        let input = DynamoDB.QueryInput(
            expressionAttributeValues: [
                ":pk": .s("\(GSIKeys.cognitoSub)\(cognitoSub)"),
                ":sk": .s(DBSortKeys.meta)
            ],
            filterExpression: "attribute_not_exists(deletedAt)",
            indexName: GSIIndexNames.gsi2,
            keyConditionExpression: "gsi2pk = :pk AND gsi2sk = :sk",
            limit: 1,
            tableName: tableName
        )

        do {
            let response = try await client.query(input)
            guard let items = response.items, let first = items.first else { return nil }
            return try decodeFromDynamoDB(first)
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - Update

    /// Update a user
    /// - Parameter input: Update input
    /// - Returns: The updated user
    public func updateUser(_ input: UpdateUserInput) async throws -> User {
        let now = ISO8601DateFormatter().string(from: Date())

        var updateParts: [String] = ["#updatedAt = :updatedAt"]
        var expressionNames: [String: String] = ["#updatedAt": "updatedAt"]
        var expressionValues: [String: DynamoDB.AttributeValue] = [":updatedAt": .s(now)]

        if let name = input.name {
            updateParts.append("#name = :name")
            expressionNames["#name"] = "name"
            expressionValues[":name"] = .s(name)

            updateParts.append("nameLower = :nameLower")
            let nameLower = name.trimmingCharacters(in: .whitespaces)
                .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
                .lowercased()
            expressionValues[":nameLower"] = .s(nameLower)
        }
        if let email = input.email {
            let emailLower = email.lowercased().trimmingCharacters(in: .whitespaces)
            updateParts.append("email = :email, gsi1pk = :gsi1pk")
            expressionValues[":email"] = .s(emailLower)
            expressionValues[":gsi1pk"] = .s("\(GSIKeys.email)\(emailLower)")
        }
        if let cognitoSub = input.cognitoSub {
            updateParts.append("cognitoSub = :sub, gsi2pk = :gsi2pk, gsi2sk = :gsi2sk")
            expressionValues[":sub"] = .s(cognitoSub)
            expressionValues[":gsi2pk"] = .s("\(GSIKeys.cognitoSub)\(cognitoSub)")
            expressionValues[":gsi2sk"] = .s(DBSortKeys.meta)
        }
        if let status = input.status {
            updateParts.append("#status = :status")
            expressionNames["#status"] = "status"
            expressionValues[":status"] = .s(status.rawValue)
        }
        if let phone = input.phone {
            updateParts.append("phone = :phone")
            expressionValues[":phone"] = .s(phone)
        }
        if let avatarUrl = input.avatarUrl {
            updateParts.append("avatarUrl = :avatar")
            expressionValues[":avatar"] = .s(avatarUrl)
        }
        if let preferences = input.preferences {
            updateParts.append("preferences = :prefs")
            expressionValues[":prefs"] = anyToAttributeValue(preferences.mapValues { $0.value })
        }

        let dynamoInput = DynamoDB.UpdateItemInput(
            conditionExpression: "attribute_exists(pk) AND attribute_not_exists(deletedAt)",
            expressionAttributeNames: expressionNames,
            expressionAttributeValues: expressionValues,
            key: [
                "pk": .s("\(DBPrefixes.user)\(input.userId)"),
                "sk": .s(DBSortKeys.meta)
            ],
            returnValues: .allNew,
            tableName: tableName,
            updateExpression: "SET \(updateParts.joined(separator: ", "))"
        )

        do {
            let response = try await client.updateItem(dynamoInput)
            guard let attributes = response.attributes else {
                throw AdminServiceError.notFound(entity: "User", id: input.userId)
            }
            return try decodeFromDynamoDB(attributes)
        } catch let error as AWSClientError where error.errorCode == "ConditionalCheckFailedException" {
            throw AdminServiceError.notFound(entity: "User", id: input.userId)
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - Delete

    /// Soft delete a user
    /// - Parameter userId: The user ID
    public func softDeleteUser(_ userId: String) async throws {
        let now = ISO8601DateFormatter().string(from: Date())

        let input = DynamoDB.UpdateItemInput(
            conditionExpression: "attribute_exists(pk) AND attribute_not_exists(deletedAt)",
            expressionAttributeNames: ["#updatedAt": "updatedAt"],
            expressionAttributeValues: [
                ":d": .s(now),
                ":u": .s(now)
            ],
            key: [
                "pk": .s("\(DBPrefixes.user)\(userId)"),
                "sk": .s(DBSortKeys.meta)
            ],
            tableName: tableName,
            updateExpression: "SET deletedAt = :d, #updatedAt = :u"
        )

        do {
            _ = try await client.updateItem(input)
            SecureLogger.info("user.deleted", metadata: ["userId": userId])
        } catch let error as AWSClientError where error.errorCode == "ConditionalCheckFailedException" {
            throw AdminServiceError.notFound(entity: "User", id: userId)
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - List

    /// List users with pagination and optional filters
    /// - Parameter input: List input with filters
    /// - Returns: Paginated users
    public func listUsers(_ input: ListUsersInput = ListUsersInput()) async throws -> PaginatedUsers {
        let limit = input.limit ?? 25

        var exclusiveStartKey: [String: DynamoDB.AttributeValue]?
        if let cursor = input.cursor, let decoded = CursorCodec.decode(cursor) {
            exclusiveStartKey = decoded
        }

        var filterExpressions: [String] = ["attribute_not_exists(deletedAt)"]
        var expressionNames: [String: String] = [:]
        var expressionValues: [String: DynamoDB.AttributeValue] = [":pk": .s(GSIKeys.usersList)]

        if let status = input.status {
            expressionNames["#status"] = "status"
            expressionValues[":status"] = .s(status.rawValue)
            filterExpressions.append("#status = :status")
        }

        if let search = input.search?.trimmingCharacters(in: .whitespaces), !search.isEmpty {
            let searchLower = search.lowercased()
            expressionNames["#nameLower"] = "nameLower"
            expressionNames["#name"] = "name"
            expressionValues[":search"] = .s(searchLower)
            expressionValues[":searchRaw"] = .s(search)
            filterExpressions.append(
                "(contains(email, :search) OR contains(#nameLower, :search) OR contains(#name, :searchRaw))"
            )
        }

        let dynamoInput = DynamoDB.QueryInput(
            exclusiveStartKey: exclusiveStartKey,
            expressionAttributeNames: expressionNames.isEmpty ? nil : expressionNames,
            expressionAttributeValues: expressionValues,
            filterExpression: filterExpressions.joined(separator: " AND "),
            indexName: GSIIndexNames.gsi3,
            keyConditionExpression: "gsi3pk = :pk",
            limit: limit,
            scanIndexForward: false,
            tableName: tableName
        )

        do {
            let response = try await client.query(dynamoInput)
            let items: [User] = try (response.items ?? []).map { try decodeFromDynamoDB($0) }

            var nextCursor: String?
            if let lastKey = response.lastEvaluatedKey {
                nextCursor = CursorCodec.encode(lastKey)
            }

            return PaginatedUsers(items: items, nextCursor: nextCursor)
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
