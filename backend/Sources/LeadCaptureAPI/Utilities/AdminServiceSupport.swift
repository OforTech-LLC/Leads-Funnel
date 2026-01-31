// =============================================================================
// AdminServiceSupport.swift
// LeadCaptureAPI/Utilities
// =============================================================================
// Support types for Admin DynamoDB services: DB constants, ULID generator,
// cursor encoding, and error types.
//
// Note: AnyCodable is defined in AdminModels.swift
// =============================================================================

import Foundation
import SotoDynamoDB

// MARK: - DynamoDB Key Prefixes

/// DynamoDB partition key prefixes for single-table design
public enum DBPrefixes {
    public static let lead = "LEAD#"
    public static let org = "ORG#"
    public static let user = "USER#"
    public static let rule = "RULE#"
    public static let audit = "AUDIT#"
    public static let notify = "NOTIFY#"
    public static let export = "EXPORT#"
    public static let webhook = "WEBHOOK#"
    public static let whDeliver = "WHDELIVER#"
    public static let unassigned = "UNASSIGNED#"
    public static let rateLimit = "RATELIMIT#"
    public static let ip = "IP#"
    public static let idempotency = "IDEMPOTENCY#"
    public static let billing = "BILLING#"
    public static let usage = "USAGE#"
    public static let analyticsCache = "ANALYTICS_CACHE#"
    public static let calendar = "CALENDAR#"
    public static let exportThrottle = "EXPORT_THROTTLE#"
}

/// DynamoDB sort key constants
public enum DBSortKeys {
    public static let meta = "META"
    public static let config = "CONFIG"
    public static let limit = "LIMIT"
    public static let counter = "COUNTER"
    public static let account = "ACCOUNT"
    public static let data = "DATA"
    public static let throttle = "THROTTLE"
}

/// GSI partition key prefixes and fixed keys
public enum GSIKeys {
    public static let funnel = "FUNNEL#"
    public static let org = "ORG#"
    public static let status = "STATUS#"
    public static let email = "EMAIL#"
    public static let cognitoSub = "COGNITOSUB#"
    public static let orgWebhooksSuffix = "#WEBHOOKS"
    public static let created = "CREATED#"
    public static let assigned = "ASSIGNED#"
    public static let priority = "PRIORITY#"
    public static let member = "MEMBER#"
    public static let invite = "INVITE#"
    public static let orgsList = "ORGS"
    public static let usersList = "USERS"
    public static let auditLog = "AUDITLOG"
    public static let notifyLog = "NOTIFYLOG"
    public static let exportsList = "EXPORTS"
    public static let orgLeadsSuffix = "#LEADS"
    public static let userLeadsSuffix = "#LEADS"
}

/// GSI index names
public enum GSIIndexNames {
    public static let gsi1 = "GSI1"
    public static let gsi2 = "GSI2"
    public static let gsi3 = "GSI3"
}

// MARK: - ULID Generator

/// ULID (Universally Unique Lexicographically Sortable Identifier) generator
/// ULIDs are time-sortable, URL-safe, and globally unique
public enum ULID {
    private static let encodingChars = Array("0123456789ABCDEFGHJKMNPQRSTVWXYZ")

    /// Generate a new ULID
    public static func generate() -> String {
        let now = Date()
        let timestamp = UInt64(now.timeIntervalSince1970 * 1000)

        // Encode timestamp (first 10 characters)
        var timestampPart = ""
        var ts = timestamp
        for _ in 0..<10 {
            timestampPart = String(encodingChars[Int(ts & 0x1F)]) + timestampPart
            ts >>= 5
        }

        // Generate randomness (last 16 characters)
        var randomPart = ""
        for _ in 0..<16 {
            let randomIndex = Int.random(in: 0..<32)
            randomPart.append(encodingChars[randomIndex])
        }

        return timestampPart + randomPart
    }
}

// MARK: - Cursor Codec

/// Encode and decode DynamoDB pagination cursors
/// Cursors are base64-encoded JSON with HMAC signature for tamper detection
public enum CursorCodec {

    /// Encode a DynamoDB LastEvaluatedKey to a cursor string
    public static func encode(_ key: [String: DynamoDB.AttributeValue]) -> String {
        // Convert AttributeValue to a simple dictionary
        var dict: [String: Any] = [:]
        for (k, v) in key {
            dict[k] = attributeValueToSimple(v)
        }

        // JSON encode and base64
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let json = String(data: data, encoding: .utf8) else {
            return ""
        }

        return Data(json.utf8).base64EncodedString()
    }

    /// Decode a cursor string to a DynamoDB ExclusiveStartKey
    public static func decode(_ cursor: String) -> [String: DynamoDB.AttributeValue]? {
        guard let data = Data(base64Encoded: cursor),
              let json = String(data: data, encoding: .utf8),
              let jsonData = json.data(using: .utf8),
              let dict = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] else {
            return nil
        }

        // Convert back to AttributeValue
        var result: [String: DynamoDB.AttributeValue] = [:]
        for (k, v) in dict {
            result[k] = simpleToAttributeValue(v)
        }

        return result
    }

    private static func attributeValueToSimple(_ attr: DynamoDB.AttributeValue) -> Any {
        switch attr {
        case .s(let s): return ["S": s]
        case .n(let n): return ["N": n]
        case .bool(let b): return ["BOOL": b]
        case .null: return ["NULL": true]
        case .l(let list): return ["L": list.map { attributeValueToSimple($0) }]
        case .m(let map): return ["M": map.mapValues { attributeValueToSimple($0) }]
        case .b(let data):
            if let bytes = data.decoded() {
                return ["B": Data(bytes).base64EncodedString()]
            }
            return ["B": ""]
        case .ss(let set): return ["SS": set]
        case .ns(let set): return ["NS": set]
        case .bs(let set):
            return ["BS": set.compactMap { item -> String? in
                guard let bytes = item.decoded() else { return nil }
                return Data(bytes).base64EncodedString()
            }]
        }
    }

    private static func simpleToAttributeValue(_ value: Any) -> DynamoDB.AttributeValue {
        guard let dict = value as? [String: Any] else {
            return .null(true)
        }

        if let s = dict["S"] as? String {
            return .s(s)
        }
        if let n = dict["N"] as? String {
            return .n(n)
        }
        if let b = dict["BOOL"] as? Bool {
            return .bool(b)
        }
        if dict["NULL"] != nil {
            return .null(true)
        }
        if let list = dict["L"] as? [Any] {
            return .l(list.map { simpleToAttributeValue($0) })
        }
        if let map = dict["M"] as? [String: Any] {
            return .m(map.mapValues { simpleToAttributeValue($0) })
        }
        if let ss = dict["SS"] as? [String] {
            return .ss(ss)
        }
        if let ns = dict["NS"] as? [String] {
            return .ns(ns)
        }

        return .null(true)
    }
}

// MARK: - Admin Service Errors

/// Errors specific to Admin DynamoDB services
public enum AdminServiceError: Error, Sendable {
    case notFound(entity: String, id: String)
    case conditionalCheckFailed(message: String)
    case databaseError(underlying: Error)
    case internalError(message: String)
    case invalidInput(message: String)
    case unauthorized(message: String)
}

extension AdminServiceError: CustomStringConvertible {
    public var description: String {
        switch self {
        case .notFound(let entity, let id):
            return "\(entity) not found: \(id)"
        case .conditionalCheckFailed(let message):
            return "Conditional check failed: \(message)"
        case .databaseError(let underlying):
            return "Database error: \(underlying.localizedDescription)"
        case .internalError(let message):
            return "Internal error: \(message)"
        case .invalidInput(let message):
            return "Invalid input: \(message)"
        case .unauthorized(let message):
            return "Unauthorized: \(message)"
        }
    }
}
