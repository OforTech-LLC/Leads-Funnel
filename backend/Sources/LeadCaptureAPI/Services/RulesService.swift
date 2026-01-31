// =============================================================================
// RulesService.swift
// LeadCaptureAPI/Services
// =============================================================================
// DynamoDB operations for Assignment Rules.
//
// Single-table access patterns:
//   PK = RULE#<ruleId>      SK = META
//   GSI1PK = FUNNEL#<funnelId>  GSI1SK = PRIORITY#<nn>  (rules by funnel)
//   GSI2PK = ORG#<orgId>       GSI2SK = RULE#<ruleId>   (rules by org)
// =============================================================================

import Foundation
import SotoDynamoDB
import SotoCore

// MARK: - Assignment Rule Model

/// Assignment rule entity
public struct AssignmentRule: Codable, Sendable, Equatable {
    public let pk: String
    public let sk: String
    public let ruleId: String
    public var funnelId: String
    public var orgId: String
    public var targetUserId: String?
    public var name: String
    public var priority: Int
    public var zipPatterns: [String]
    public var dailyCap: Int?
    public var monthlyCap: Int?
    public var isActive: Bool
    public var description: String?
    public let createdAt: String
    public var updatedAt: String
    public var deletedAt: String?
    public var gsi1pk: String
    public var gsi1sk: String
    public var gsi2pk: String
    public var gsi2sk: String

    public init(
        ruleId: String,
        funnelId: String,
        orgId: String,
        targetUserId: String? = nil,
        name: String,
        priority: Int,
        zipPatterns: [String],
        dailyCap: Int? = nil,
        monthlyCap: Int? = nil,
        isActive: Bool = true,
        description: String? = nil,
        createdAt: String,
        updatedAt: String,
        deletedAt: String? = nil
    ) {
        let priorityPadded = String(format: "%04d", priority)

        self.pk = "\(DBPrefixes.rule)\(ruleId)"
        self.sk = DBSortKeys.meta
        self.ruleId = ruleId
        self.funnelId = funnelId
        self.orgId = orgId
        self.targetUserId = targetUserId
        self.name = name
        self.priority = priority
        self.zipPatterns = zipPatterns
        self.dailyCap = dailyCap
        self.monthlyCap = monthlyCap
        self.isActive = isActive
        self.description = description
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.deletedAt = deletedAt
        self.gsi1pk = "\(GSIKeys.funnel)\(funnelId)"
        self.gsi1sk = "\(GSIKeys.priority)\(priorityPadded)"
        self.gsi2pk = "\(GSIKeys.org)\(orgId)"
        self.gsi2sk = "\(DBPrefixes.rule)\(ruleId)"
    }
}

/// Input for creating a rule
public struct CreateRuleInput: Sendable {
    public let funnelId: String
    public let orgId: String
    public let targetUserId: String?
    public let name: String
    public let priority: Int
    public let zipPatterns: [String]
    public let dailyCap: Int?
    public let monthlyCap: Int?
    public let isActive: Bool?
    public let description: String?

    public init(
        funnelId: String,
        orgId: String,
        targetUserId: String? = nil,
        name: String,
        priority: Int,
        zipPatterns: [String],
        dailyCap: Int? = nil,
        monthlyCap: Int? = nil,
        isActive: Bool? = nil,
        description: String? = nil
    ) {
        self.funnelId = funnelId
        self.orgId = orgId
        self.targetUserId = targetUserId
        self.name = name
        self.priority = priority
        self.zipPatterns = zipPatterns
        self.dailyCap = dailyCap
        self.monthlyCap = monthlyCap
        self.isActive = isActive
        self.description = description
    }
}

/// Input for updating a rule
public struct UpdateRuleInput: Sendable {
    public let ruleId: String
    public let funnelId: String?
    public let orgId: String?
    public let name: String?
    public let priority: Int?
    public let zipPatterns: [String]?
    public let dailyCap: Int?
    public let monthlyCap: Int?
    public let isActive: Bool?
    public let targetUserId: String?
    public let description: String?

    public init(
        ruleId: String,
        funnelId: String? = nil,
        orgId: String? = nil,
        name: String? = nil,
        priority: Int? = nil,
        zipPatterns: [String]? = nil,
        dailyCap: Int? = nil,
        monthlyCap: Int? = nil,
        isActive: Bool? = nil,
        targetUserId: String? = nil,
        description: String? = nil
    ) {
        self.ruleId = ruleId
        self.funnelId = funnelId
        self.orgId = orgId
        self.name = name
        self.priority = priority
        self.zipPatterns = zipPatterns
        self.dailyCap = dailyCap
        self.monthlyCap = monthlyCap
        self.isActive = isActive
        self.targetUserId = targetUserId
        self.description = description
    }
}

/// Paginated rules result
public struct PaginatedRules: Sendable {
    public let items: [AssignmentRule]
    public let nextCursor: String?

    public init(items: [AssignmentRule], nextCursor: String? = nil) {
        self.items = items
        self.nextCursor = nextCursor
    }
}

// MARK: - Rules Service

/// Service for Assignment Rule DynamoDB operations
public actor RulesService {

    // MARK: - Properties

    private let client: DynamoDB
    private let tableName: String
    private let config: AppConfig

    // MARK: - Initialization

    public init(client: AWSClient, config: AppConfig = .shared) {
        self.client = DynamoDB(client: client, region: .init(rawValue: config.awsRegion))
        self.tableName = Self.getRulesTableName(config: config)
        self.config = config
    }

    /// Get the rules table name from environment or config
    private static func getRulesTableName(config: AppConfig) -> String {
        if let tableName = ProcessInfo.processInfo.environment["ASSIGNMENT_RULES_TABLE_NAME"] {
            return tableName
        }
        let baseTable = config.dynamoDBTableName
        if baseTable.hasSuffix("-leads") {
            return baseTable.replacingOccurrences(of: "-leads", with: "-assignment-rules")
        }
        return "\(baseTable)-assignment-rules"
    }

    // MARK: - Create

    /// Create a new assignment rule
    /// - Parameter input: Rule creation input
    /// - Returns: The created rule
    public func createRule(_ input: CreateRuleInput) async throws -> AssignmentRule {
        let ruleId = ULID.generate()
        let now = ISO8601DateFormatter().string(from: Date())

        let rule = AssignmentRule(
            ruleId: ruleId,
            funnelId: input.funnelId,
            orgId: input.orgId,
            targetUserId: input.targetUserId,
            name: input.name,
            priority: input.priority,
            zipPatterns: input.zipPatterns,
            dailyCap: input.dailyCap,
            monthlyCap: input.monthlyCap,
            isActive: input.isActive ?? true,
            description: input.description,
            createdAt: now,
            updatedAt: now
        )

        let dynamoInput = DynamoDB.PutItemInput(
            conditionExpression: "attribute_not_exists(pk)",
            item: try encodeToDynamoDB(rule),
            tableName: tableName
        )

        do {
            _ = try await client.putItem(dynamoInput)
            SecureLogger.info("rule.created", metadata: ["ruleId": ruleId, "funnelId": input.funnelId])
            return rule
        } catch let error as AWSClientError where error.errorCode == "ConditionalCheckFailedException" {
            throw AdminServiceError.conditionalCheckFailed(message: "Rule already exists: \(error.localizedDescription)")
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - Read

    /// Get a rule by ID
    /// - Parameter ruleId: The rule ID
    /// - Returns: The rule if found and not deleted
    public func getRule(_ ruleId: String) async throws -> AssignmentRule? {
        let input = DynamoDB.GetItemInput(
            key: [
                "pk": .s("\(DBPrefixes.rule)\(ruleId)"),
                "sk": .s(DBSortKeys.meta)
            ],
            tableName: tableName
        )

        do {
            let response = try await client.getItem(input)
            guard let item = response.item else { return nil }
            let rule: AssignmentRule = try decodeFromDynamoDB(item)
            if rule.deletedAt != nil { return nil }
            return rule
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - Update

    /// Update a rule
    /// - Parameter input: Update input
    /// - Returns: The updated rule
    public func updateRule(_ input: UpdateRuleInput) async throws -> AssignmentRule {
        let now = ISO8601DateFormatter().string(from: Date())

        var updateParts: [String] = ["#updatedAt = :updatedAt"]
        var expressionNames: [String: String] = ["#updatedAt": "updatedAt"]
        var expressionValues: [String: DynamoDB.AttributeValue] = [":updatedAt": .s(now)]

        if let name = input.name {
            updateParts.append("#name = :name")
            expressionNames["#name"] = "name"
            expressionValues[":name"] = .s(name)
        }
        if let funnelId = input.funnelId {
            updateParts.append("funnelId = :funnelId")
            expressionValues[":funnelId"] = .s(funnelId)
            updateParts.append("gsi1pk = :gsi1pk")
            expressionValues[":gsi1pk"] = .s("\(GSIKeys.funnel)\(funnelId)")
        }
        if let orgId = input.orgId {
            updateParts.append("orgId = :orgId")
            expressionValues[":orgId"] = .s(orgId)
            updateParts.append("gsi2pk = :gsi2pk")
            expressionValues[":gsi2pk"] = .s("\(GSIKeys.org)\(orgId)")
        }
        if let priority = input.priority {
            updateParts.append("priority = :priority")
            expressionValues[":priority"] = .n(String(priority))
            let priorityPadded = String(format: "%04d", priority)
            updateParts.append("gsi1sk = :gsi1sk")
            expressionValues[":gsi1sk"] = .s("\(GSIKeys.priority)\(priorityPadded)")
        }
        if let zipPatterns = input.zipPatterns {
            updateParts.append("zipPatterns = :zp")
            expressionValues[":zp"] = .l(zipPatterns.map { .s($0) })
        }
        if let dailyCap = input.dailyCap {
            updateParts.append("dailyCap = :dc")
            expressionValues[":dc"] = .n(String(dailyCap))
        }
        if let monthlyCap = input.monthlyCap {
            updateParts.append("monthlyCap = :mc")
            expressionValues[":mc"] = .n(String(monthlyCap))
        }
        if let isActive = input.isActive {
            updateParts.append("isActive = :active")
            expressionValues[":active"] = .bool(isActive)
        }
        if let targetUserId = input.targetUserId {
            updateParts.append("targetUserId = :tu")
            expressionValues[":tu"] = .s(targetUserId)
        }
        if let description = input.description {
            updateParts.append("description = :desc")
            expressionValues[":desc"] = .s(description)
        }

        let dynamoInput = DynamoDB.UpdateItemInput(
            conditionExpression: "attribute_exists(pk) AND attribute_not_exists(deletedAt)",
            expressionAttributeNames: expressionNames,
            expressionAttributeValues: expressionValues,
            key: [
                "pk": .s("\(DBPrefixes.rule)\(input.ruleId)"),
                "sk": .s(DBSortKeys.meta)
            ],
            returnValues: .allNew,
            tableName: tableName,
            updateExpression: "SET \(updateParts.joined(separator: ", "))"
        )

        do {
            let response = try await client.updateItem(dynamoInput)
            guard let attributes = response.attributes else {
                throw AdminServiceError.notFound(entity: "Rule", id: input.ruleId)
            }
            return try decodeFromDynamoDB(attributes)
        } catch let error as AWSClientError where error.errorCode == "ConditionalCheckFailedException" {
            throw AdminServiceError.notFound(entity: "Rule", id: input.ruleId)
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - Delete

    /// Soft delete a rule
    /// - Parameter ruleId: The rule ID
    public func softDeleteRule(_ ruleId: String) async throws {
        let now = ISO8601DateFormatter().string(from: Date())

        let input = DynamoDB.UpdateItemInput(
            conditionExpression: "attribute_exists(pk) AND attribute_not_exists(deletedAt)",
            expressionAttributeNames: ["#updatedAt": "updatedAt"],
            expressionAttributeValues: [
                ":d": .s(now),
                ":u": .s(now),
                ":f": .bool(false)
            ],
            key: [
                "pk": .s("\(DBPrefixes.rule)\(ruleId)"),
                "sk": .s(DBSortKeys.meta)
            ],
            tableName: tableName,
            updateExpression: "SET deletedAt = :d, #updatedAt = :u, isActive = :f"
        )

        do {
            _ = try await client.updateItem(input)
            SecureLogger.info("rule.deleted", metadata: ["ruleId": ruleId])
        } catch let error as AWSClientError where error.errorCode == "ConditionalCheckFailedException" {
            throw AdminServiceError.notFound(entity: "Rule", id: ruleId)
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - List

    /// List rules with optional filtering by funnel
    /// - Parameters:
    ///   - funnelId: Optional funnel ID to filter by
    ///   - cursor: Pagination cursor
    ///   - limit: Maximum number of items to return
    /// - Returns: Paginated rules
    public func listRules(
        funnelId: String? = nil,
        cursor: String? = nil,
        limit: Int = 50
    ) async throws -> PaginatedRules {
        var exclusiveStartKey: [String: DynamoDB.AttributeValue]?
        if let cursor = cursor, let decoded = CursorCodec.decode(cursor) {
            exclusiveStartKey = decoded
        }

        if let funnelId = funnelId {
            // Query by funnel using GSI1
            let input = DynamoDB.QueryInput(
                exclusiveStartKey: exclusiveStartKey,
                expressionAttributeValues: [":pk": .s("\(GSIKeys.funnel)\(funnelId)")],
                filterExpression: "attribute_not_exists(deletedAt)",
                indexName: GSIIndexNames.gsi1,
                keyConditionExpression: "gsi1pk = :pk",
                limit: limit,
                scanIndexForward: true, // ascending priority
                tableName: tableName
            )

            do {
                let response = try await client.query(input)
                let items: [AssignmentRule] = try (response.items ?? []).map { try decodeFromDynamoDB($0) }

                var nextCursor: String?
                if let lastKey = response.lastEvaluatedKey {
                    nextCursor = CursorCodec.encode(lastKey)
                }

                return PaginatedRules(items: items, nextCursor: nextCursor)
            } catch {
                throw AdminServiceError.databaseError(underlying: error)
            }
        } else {
            // Scan all rules (less common)
            let input = DynamoDB.ScanInput(
                exclusiveStartKey: exclusiveStartKey,
                expressionAttributeValues: [
                    ":prefix": .s(DBPrefixes.rule),
                    ":meta": .s(DBSortKeys.meta)
                ],
                filterExpression: "begins_with(pk, :prefix) AND sk = :meta AND attribute_not_exists(deletedAt)",
                limit: limit,
                tableName: tableName
            )

            do {
                let response = try await client.scan(input)
                let items: [AssignmentRule] = try (response.items ?? []).map { try decodeFromDynamoDB($0) }

                var nextCursor: String?
                if let lastKey = response.lastEvaluatedKey {
                    nextCursor = CursorCodec.encode(lastKey)
                }

                return PaginatedRules(items: items, nextCursor: nextCursor)
            } catch {
                throw AdminServiceError.databaseError(underlying: error)
            }
        }
    }

    // MARK: - Get Rules By Funnel

    /// Get all active rules for a funnel, sorted by priority ascending
    /// Used by assignment matcher
    /// - Parameter funnelId: The funnel ID
    /// - Returns: All active rules for the funnel
    public func getRulesByFunnel(_ funnelId: String) async throws -> [AssignmentRule] {
        var rules: [AssignmentRule] = []
        var lastKey: [String: DynamoDB.AttributeValue]?

        repeat {
            let input = DynamoDB.QueryInput(
                exclusiveStartKey: lastKey,
                expressionAttributeValues: [
                    ":pk": .s("\(GSIKeys.funnel)\(funnelId)"),
                    ":yes": .bool(true)
                ],
                filterExpression: "isActive = :yes AND attribute_not_exists(deletedAt)",
                indexName: GSIIndexNames.gsi1,
                keyConditionExpression: "gsi1pk = :pk",
                scanIndexForward: true,
                tableName: tableName
            )

            do {
                let response = try await client.query(input)
                let items: [AssignmentRule] = try (response.items ?? []).map { try decodeFromDynamoDB($0) }
                rules.append(contentsOf: items)
                lastKey = response.lastEvaluatedKey
            } catch {
                throw AdminServiceError.databaseError(underlying: error)
            }
        } while lastKey != nil

        return rules
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
