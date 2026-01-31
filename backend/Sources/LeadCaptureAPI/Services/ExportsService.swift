// =============================================================================
// ExportsService.swift
// LeadCaptureAPI/Services
// =============================================================================
// DynamoDB operations for Export Jobs.
//
// Single-table access patterns:
//   PK = EXPORT#<exportId>   SK = META
//   GSI1PK = EXPORTS         GSI1SK = CREATED#<iso>  (list all)
// =============================================================================

import Foundation
import SotoDynamoDB
import SotoCore

// MARK: - Export Types

/// Export job status
public enum ExportStatus: String, Codable, Sendable {
    case pending
    case processing
    case completed
    case failed
}

/// Export file format
public enum ExportFormat: String, Codable, Sendable {
    case csv
    case xlsx
    case json
}

// MARK: - Export Model

/// Export job entity
public struct ExportJob: Codable, Sendable, Equatable {
    public let pk: String
    public let sk: String
    public let exportId: String
    public let requestedBy: String // admin email hash or userId
    public let funnelId: String?
    public let orgId: String?
    public let format: ExportFormat
    public let filters: [String: AnyCodable]
    public var status: ExportStatus
    public var s3Key: String?
    public var recordCount: Int?
    public var errorMessage: String?
    public let createdAt: String
    public var completedAt: String?
    public let expiresAt: String
    public let ttl: Int
    public let gsi1pk: String
    public let gsi1sk: String

    public init(
        exportId: String,
        requestedBy: String,
        funnelId: String? = nil,
        orgId: String? = nil,
        format: ExportFormat,
        filters: [String: AnyCodable] = [:],
        status: ExportStatus = .pending,
        s3Key: String? = nil,
        recordCount: Int? = nil,
        errorMessage: String? = nil,
        createdAt: String,
        completedAt: String? = nil,
        expiresAt: String,
        ttl: Int
    ) {
        self.pk = "\(DBPrefixes.export)\(exportId)"
        self.sk = DBSortKeys.meta
        self.exportId = exportId
        self.requestedBy = requestedBy
        self.funnelId = funnelId
        self.orgId = orgId
        self.format = format
        self.filters = filters
        self.status = status
        self.s3Key = s3Key
        self.recordCount = recordCount
        self.errorMessage = errorMessage
        self.createdAt = createdAt
        self.completedAt = completedAt
        self.expiresAt = expiresAt
        self.ttl = ttl
        self.gsi1pk = GSIKeys.exportsList
        self.gsi1sk = "\(GSIKeys.created)\(createdAt)"
    }
}

/// Input for creating an export
public struct CreateExportInput: Sendable {
    public let requestedBy: String
    public let funnelId: String?
    public let orgId: String?
    public let format: ExportFormat
    public let filters: [String: AnyCodable]?

    public init(
        requestedBy: String,
        funnelId: String? = nil,
        orgId: String? = nil,
        format: ExportFormat,
        filters: [String: AnyCodable]? = nil
    ) {
        self.requestedBy = requestedBy
        self.funnelId = funnelId
        self.orgId = orgId
        self.format = format
        self.filters = filters
    }
}

/// Input for updating an export
public struct UpdateExportInput: Sendable {
    public let status: ExportStatus?
    public let s3Key: String?
    public let recordCount: Int?
    public let errorMessage: String?

    public init(
        status: ExportStatus? = nil,
        s3Key: String? = nil,
        recordCount: Int? = nil,
        errorMessage: String? = nil
    ) {
        self.status = status
        self.s3Key = s3Key
        self.recordCount = recordCount
        self.errorMessage = errorMessage
    }
}

/// Paginated exports result
public struct PaginatedExports: Sendable {
    public let items: [ExportJob]
    public let nextCursor: String?

    public init(items: [ExportJob], nextCursor: String? = nil) {
        self.items = items
        self.nextCursor = nextCursor
    }
}

// MARK: - Exports Service

/// Service for Export job DynamoDB operations
public actor ExportsService {

    // MARK: - Properties

    private let client: DynamoDB
    private let tableName: String
    private let config: AppConfig

    /// Export expiry in hours
    private static let exportExpiryHours = 24

    // MARK: - Initialization

    public init(client: AWSClient, config: AppConfig = .shared) {
        self.client = DynamoDB(client: client, region: .init(rawValue: config.awsRegion))
        self.tableName = Self.getExportsTableName(config: config)
        self.config = config
    }

    /// Get the exports table name from environment or config
    private static func getExportsTableName(config: AppConfig) -> String {
        if let tableName = ProcessInfo.processInfo.environment["EXPORTS_TABLE_NAME"] {
            return tableName
        }
        let baseTable = config.dynamoDBTableName
        if baseTable.hasSuffix("-leads") {
            return baseTable.replacingOccurrences(of: "-leads", with: "-exports")
        }
        return "\(baseTable)-exports"
    }

    // MARK: - Create

    /// Create a new export job
    /// - Parameter input: Export creation input
    /// - Returns: The created export job
    public func createExport(_ input: CreateExportInput) async throws -> ExportJob {
        let exportId = ULID.generate()
        let now = Date()
        let nowIso = ISO8601DateFormatter().string(from: now)
        let expiresAt = ISO8601DateFormatter().string(from: now.addingTimeInterval(TimeInterval(Self.exportExpiryHours * 3600)))
        let ttl = Int(now.timeIntervalSince1970) + (Self.exportExpiryHours * 3600)

        let job = ExportJob(
            exportId: exportId,
            requestedBy: input.requestedBy,
            funnelId: input.funnelId,
            orgId: input.orgId,
            format: input.format,
            filters: input.filters ?? [:],
            status: .pending,
            createdAt: nowIso,
            expiresAt: expiresAt,
            ttl: ttl
        )

        let dynamoInput = DynamoDB.PutItemInput(
            item: try encodeToDynamoDB(job),
            tableName: tableName
        )

        do {
            _ = try await client.putItem(dynamoInput)
            SecureLogger.info("export.created", metadata: ["exportId": exportId])
            return job
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - Read

    /// Get an export job by ID
    /// - Parameter exportId: The export ID
    /// - Returns: The export job if found
    public func getExport(_ exportId: String) async throws -> ExportJob? {
        let input = DynamoDB.GetItemInput(
            key: [
                "pk": .s("\(DBPrefixes.export)\(exportId)"),
                "sk": .s(DBSortKeys.meta)
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

    // MARK: - Update

    /// Update an export job
    /// - Parameters:
    ///   - exportId: The export ID
    ///   - updates: Update input
    /// - Returns: The updated export job
    public func updateExport(_ exportId: String, updates: UpdateExportInput) async throws -> ExportJob {
        let now = ISO8601DateFormatter().string(from: Date())

        var updateParts: [String] = []
        var expressionNames: [String: String] = [:]
        var expressionValues: [String: DynamoDB.AttributeValue] = [:]

        if let status = updates.status {
            updateParts.append("#status = :status")
            expressionNames["#status"] = "status"
            expressionValues[":status"] = .s(status.rawValue)

            if status == .completed || status == .failed {
                updateParts.append("completedAt = :completedAt")
                expressionValues[":completedAt"] = .s(now)
            }
        }
        if let s3Key = updates.s3Key {
            updateParts.append("s3Key = :s3Key")
            expressionValues[":s3Key"] = .s(s3Key)
        }
        if let recordCount = updates.recordCount {
            updateParts.append("recordCount = :rc")
            expressionValues[":rc"] = .n(String(recordCount))
        }
        if let errorMessage = updates.errorMessage {
            updateParts.append("errorMessage = :em")
            expressionValues[":em"] = .s(errorMessage)
        }

        // If no updates, just return the existing export
        if updateParts.isEmpty {
            guard let existing = try await getExport(exportId) else {
                throw AdminServiceError.notFound(entity: "Export", id: exportId)
            }
            return existing
        }

        let dynamoInput = DynamoDB.UpdateItemInput(
            conditionExpression: "attribute_exists(pk)",
            expressionAttributeNames: expressionNames.isEmpty ? nil : expressionNames,
            expressionAttributeValues: expressionValues,
            key: [
                "pk": .s("\(DBPrefixes.export)\(exportId)"),
                "sk": .s(DBSortKeys.meta)
            ],
            returnValues: .allNew,
            tableName: tableName,
            updateExpression: "SET \(updateParts.joined(separator: ", "))"
        )

        do {
            let response = try await client.updateItem(dynamoInput)
            guard let attributes = response.attributes else {
                throw AdminServiceError.notFound(entity: "Export", id: exportId)
            }
            return try decodeFromDynamoDB(attributes)
        } catch let error as AWSClientError where error.errorCode == "ConditionalCheckFailedException" {
            throw AdminServiceError.notFound(entity: "Export", id: exportId)
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - List

    /// List export jobs with pagination
    /// - Parameters:
    ///   - cursor: Pagination cursor
    ///   - limit: Maximum number of items to return
    /// - Returns: Paginated exports
    public func listExports(cursor: String? = nil, limit: Int = 25) async throws -> PaginatedExports {
        var exclusiveStartKey: [String: DynamoDB.AttributeValue]?
        if let cursor = cursor, let decoded = CursorCodec.decode(cursor) {
            exclusiveStartKey = decoded
        }

        let input = DynamoDB.QueryInput(
            exclusiveStartKey: exclusiveStartKey,
            expressionAttributeValues: [":pk": .s(GSIKeys.exportsList)],
            indexName: GSIIndexNames.gsi1,
            keyConditionExpression: "gsi1pk = :pk",
            limit: limit,
            scanIndexForward: false,
            tableName: tableName
        )

        do {
            let response = try await client.query(input)
            let items: [ExportJob] = try (response.items ?? []).map { try decodeFromDynamoDB($0) }

            var nextCursor: String?
            if let lastKey = response.lastEvaluatedKey {
                nextCursor = CursorCodec.encode(lastKey)
            }

            return PaginatedExports(items: items, nextCursor: nextCursor)
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
