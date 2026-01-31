// =============================================================================
// NotificationsService.swift
// LeadCaptureAPI/Services
// =============================================================================
// DynamoDB operations for Notification records.
//
// Single-table access patterns:
//   PK = NOTIFY#<leadId>   SK = <channel>#<timestamp>
//   GSI1PK = NOTIFYLOG     GSI1SK = <timestamp>  (global log)
//
// Note: This service uses NotificationItem internally to avoid conflict
// with NotificationRecord in AdminModels.swift
// =============================================================================

import Foundation
import SotoDynamoDB
import SotoCore

// MARK: - Notification Types

/// Notification channel
public enum NotifyChannel: String, Codable, Sendable {
    case email
    case sms
}

/// Notification status
public enum NotifyStatus: String, Codable, Sendable {
    case sent
    case failed
    case skipped
}

// MARK: - Notification Model (Internal)

/// Notification record entity (internal DynamoDB model)
/// Use NotificationRecord from AdminModels.swift for API responses
public struct NotificationItem: Codable, Sendable, Equatable {
    public let pk: String
    public let sk: String
    public let notificationId: String
    public let leadId: String
    public let funnelId: String
    public let orgId: String?
    public let userId: String?
    public let channel: NotifyChannel
    public let recipient: String // hashed
    public let status: NotifyStatus
    public let errorMessage: String?
    public let sentAt: String
    public let gsi1pk: String
    public let gsi1sk: String

    public init(
        notificationId: String,
        leadId: String,
        funnelId: String,
        orgId: String? = nil,
        userId: String? = nil,
        channel: NotifyChannel,
        recipientHash: String,
        status: NotifyStatus,
        errorMessage: String? = nil,
        sentAt: String
    ) {
        self.pk = "\(DBPrefixes.notify)\(leadId)"
        self.sk = "\(channel.rawValue)#\(sentAt)#\(notificationId)"
        self.notificationId = notificationId
        self.leadId = leadId
        self.funnelId = funnelId
        self.orgId = orgId
        self.userId = userId
        self.channel = channel
        self.recipient = recipientHash
        self.status = status
        self.errorMessage = errorMessage
        self.sentAt = sentAt
        self.gsi1pk = GSIKeys.notifyLog
        self.gsi1sk = sentAt
    }
}

/// Input for recording a notification
public struct RecordNotificationInput: Sendable {
    public let leadId: String
    public let funnelId: String
    public let orgId: String?
    public let userId: String?
    public let channel: NotifyChannel
    public let recipientHash: String
    public let status: NotifyStatus
    public let errorMessage: String?

    public init(
        leadId: String,
        funnelId: String,
        orgId: String? = nil,
        userId: String? = nil,
        channel: NotifyChannel,
        recipientHash: String,
        status: NotifyStatus,
        errorMessage: String? = nil
    ) {
        self.leadId = leadId
        self.funnelId = funnelId
        self.orgId = orgId
        self.userId = userId
        self.channel = channel
        self.recipientHash = recipientHash
        self.status = status
        self.errorMessage = errorMessage
    }
}

/// Paginated notifications result (internal)
public struct NotificationItemsPage: Sendable {
    public let items: [NotificationItem]
    public let nextCursor: String?

    public init(items: [NotificationItem], nextCursor: String? = nil) {
        self.items = items
        self.nextCursor = nextCursor
    }
}

// MARK: - Notifications Service

/// Service for Notification record DynamoDB operations
public actor NotificationsService {

    // MARK: - Properties

    private let client: DynamoDB
    private let tableName: String
    private let config: AppConfig

    // MARK: - Initialization

    public init(client: AWSClient, config: AppConfig = .shared) {
        self.client = DynamoDB(client: client, region: .init(rawValue: config.awsRegion))
        self.tableName = Self.getNotificationsTableName(config: config)
        self.config = config
    }

    /// Get the notifications table name from environment or config
    private static func getNotificationsTableName(config: AppConfig) -> String {
        if let tableName = ProcessInfo.processInfo.environment["NOTIFICATIONS_TABLE_NAME"] {
            return tableName
        }
        let baseTable = config.dynamoDBTableName
        if baseTable.hasSuffix("-leads") {
            return baseTable.replacingOccurrences(of: "-leads", with: "-notifications")
        }
        return "\(baseTable)-notifications"
    }

    // MARK: - Record Notification

    /// Record a notification
    /// - Parameter input: Notification recording input
    /// - Returns: The created notification item
    public func recordNotification(_ input: RecordNotificationInput) async throws -> NotificationItem {
        let id = ULID.generate()
        let now = ISO8601DateFormatter().string(from: Date())

        let record = NotificationItem(
            notificationId: id,
            leadId: input.leadId,
            funnelId: input.funnelId,
            orgId: input.orgId,
            userId: input.userId,
            channel: input.channel,
            recipientHash: input.recipientHash,
            status: input.status,
            errorMessage: input.errorMessage,
            sentAt: now
        )

        let dynamoInput = DynamoDB.PutItemInput(
            item: try encodeToDynamoDB(record),
            tableName: tableName
        )

        do {
            _ = try await client.putItem(dynamoInput)
            return record
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - List By Lead

    /// List notifications for a specific lead
    /// - Parameters:
    ///   - leadId: The lead ID
    ///   - cursor: Pagination cursor
    ///   - limit: Maximum number of items to return
    /// - Returns: Paginated notifications
    public func listNotificationsByLead(
        leadId: String,
        cursor: String? = nil,
        limit: Int = 50
    ) async throws -> NotificationItemsPage {
        var exclusiveStartKey: [String: DynamoDB.AttributeValue]?
        if let cursor = cursor, let decoded = CursorCodec.decode(cursor) {
            exclusiveStartKey = decoded
        }

        let input = DynamoDB.QueryInput(
            exclusiveStartKey: exclusiveStartKey,
            expressionAttributeValues: [":pk": .s("\(DBPrefixes.notify)\(leadId)")],
            keyConditionExpression: "pk = :pk",
            limit: limit,
            scanIndexForward: false,
            tableName: tableName
        )

        do {
            let response = try await client.query(input)
            let items: [NotificationItem] = try (response.items ?? []).map { try decodeFromDynamoDB($0) }

            var nextCursor: String?
            if let lastKey = response.lastEvaluatedKey {
                nextCursor = CursorCodec.encode(lastKey)
            }

            return NotificationItemsPage(items: items, nextCursor: nextCursor)
        } catch {
            throw AdminServiceError.databaseError(underlying: error)
        }
    }

    // MARK: - List All

    /// List recent notifications globally (admin view)
    /// - Parameters:
    ///   - cursor: Pagination cursor
    ///   - limit: Maximum number of items to return
    ///   - startDate: Optional start date filter (ISO8601)
    ///   - endDate: Optional end date filter (ISO8601)
    /// - Returns: Paginated notifications
    public func listNotifications(
        cursor: String? = nil,
        limit: Int = 50,
        startDate: String? = nil,
        endDate: String? = nil
    ) async throws -> NotificationItemsPage {
        var exclusiveStartKey: [String: DynamoDB.AttributeValue]?
        if let cursor = cursor, let decoded = CursorCodec.decode(cursor) {
            exclusiveStartKey = decoded
        }

        var keyCondition = "gsi1pk = :pk"
        var expressionValues: [String: DynamoDB.AttributeValue] = [":pk": .s(GSIKeys.notifyLog)]

        if let startDate = startDate, let endDate = endDate {
            keyCondition += " AND gsi1sk BETWEEN :start AND :end"
            expressionValues[":start"] = .s(startDate)
            expressionValues[":end"] = .s(endDate)
        }

        let input = DynamoDB.QueryInput(
            exclusiveStartKey: exclusiveStartKey,
            expressionAttributeValues: expressionValues,
            indexName: GSIIndexNames.gsi1,
            keyConditionExpression: keyCondition,
            limit: limit,
            scanIndexForward: false,
            tableName: tableName
        )

        do {
            let response = try await client.query(input)
            let items: [NotificationItem] = try (response.items ?? []).map { try decodeFromDynamoDB($0) }

            var nextCursor: String?
            if let lastKey = response.lastEvaluatedKey {
                nextCursor = CursorCodec.encode(lastKey)
            }

            return NotificationItemsPage(items: items, nextCursor: nextCursor)
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
