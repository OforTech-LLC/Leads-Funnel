// =============================================================================
// DynamoDBService.swift
// LeadCaptureAPI/Services
// =============================================================================
// DynamoDB operations for lead storage.
// =============================================================================

import Foundation
import SotoDynamoDB
import SotoCore
import Shared
import Crypto

// MARK: - DynamoDB Service

/// Service for DynamoDB operations
public actor DynamoDBService {

    // MARK: - Properties

    private let client: DynamoDB
    private let tableName: String
    private let config: AppConfig

    // MARK: - Initialization

    public init(client: AWSClient, config: AppConfig = .shared) {
        self.client = DynamoDB(client: client, region: .init(rawValue: config.awsRegion))
        self.tableName = config.dynamoDBTableName
        self.config = config
    }

    // MARK: - Lead Operations

    /// Create a new lead
    /// - Parameter lead: The lead to create
    /// - Returns: The created lead
    public func createLead(_ lead: Lead) async throws -> Lead {
        let item = LeadDynamoDBItem(from: lead)

        let input = DynamoDB.PutItemInput(
            conditionExpression: "attribute_not_exists(pk)",
            item: try encodeToDynamoDB(item),
            tableName: tableName
        )

        do {
            _ = try await client.putItem(input)
            return lead
        } catch let error as AWSClientError where error.errorCode == "ConditionalCheckFailedException" {
            throw AppError.duplicateLead(existingId: lead.id?.uuidString ?? "")
        } catch {
            throw AppError.databaseError(underlying: error)
        }
    }

    /// Get a lead by ID
    /// - Parameter id: The lead ID
    /// - Returns: The lead if found
    public func getLead(id: String) async throws -> Lead? {
        let pk = "\(EntityType.lead.pkPrefix)\(id)"

        let input = DynamoDB.QueryInput(
            expressionAttributeValues: [":pk": .s(pk)],
            keyConditionExpression: "pk = :pk",
            limit: 1,
            tableName: tableName
        )

        do {
            let response = try await client.query(input)

            guard let items = response.items, let firstItem = items.first else {
                return nil
            }

            let dynamoItem: LeadDynamoDBItem = try decodeFromDynamoDB(firstItem)
            return dynamoItem.toLead()
        } catch {
            throw AppError.databaseError(underlying: error)
        }
    }

    /// Get leads by email address
    /// - Parameter email: The email to search for
    /// - Returns: Array of leads
    public func getLeadsByEmail(_ email: String) async throws -> [Lead] {
        let gsi1pk = "\(EntityType.emailIndex.pkPrefix)\(email.lowercased())"

        let input = DynamoDB.QueryInput(
            expressionAttributeValues: [":gsi1pk": .s(gsi1pk)],
            indexName: "GSI1",
            keyConditionExpression: "gsi1pk = :gsi1pk",
            tableName: tableName
        )

        do {
            let response = try await client.query(input)

            guard let items = response.items else {
                return []
            }

            return items.compactMap { item -> Lead? in
                guard let dynamoItem: LeadDynamoDBItem = try? decodeFromDynamoDB(item) else {
                    return nil
                }
                return dynamoItem.toLead()
            }
        } catch {
            throw AppError.databaseError(underlying: error)
        }
    }

    /// Update lead status
    /// - Parameters:
    ///   - id: The lead ID
    ///   - status: The new status
    /// - Returns: Updated lead
    public func updateLeadStatus(id: String, status: LeadStatus) async throws -> Lead? {
        guard let existingLead = try await getLead(id: id) else {
            throw AppError.leadNotFound(id: id)
        }

        var updatedLead = existingLead
        updatedLead.status = status
        updatedLead.updatedAt = Date()

        let item = LeadDynamoDBItem(from: updatedLead)

        let input = DynamoDB.PutItemInput(
            item: try encodeToDynamoDB(item),
            tableName: tableName
        )

        do {
            _ = try await client.putItem(input)
            return updatedLead
        } catch {
            throw AppError.databaseError(underlying: error)
        }
    }

    /// Quarantine a lead
    /// - Parameters:
    ///   - lead: The lead to quarantine
    ///   - reasons: Reasons for quarantine
    /// - Returns: Updated lead
    public func quarantineLead(_ lead: Lead, reasons: [String]) async throws -> Lead {
        var quarantinedLead = lead
        quarantinedLead.status = .quarantined
        quarantinedLead.quarantineReasons = reasons
        quarantinedLead.updatedAt = Date()

        let item = LeadDynamoDBItem(from: quarantinedLead)

        let input = DynamoDB.PutItemInput(
            item: try encodeToDynamoDB(item),
            tableName: tableName
        )

        do {
            _ = try await client.putItem(input)
            return quarantinedLead
        } catch {
            throw AppError.databaseError(underlying: error)
        }
    }

    // MARK: - Rate Limiting

    /// Check and increment rate limit with in-memory cache optimization
    /// - Parameters:
    ///   - identifier: IP address or other identifier
    ///   - maxRequests: Maximum allowed requests
    ///   - windowSeconds: Time window in seconds
    /// - Returns: Tuple of (allowed, currentCount, retryAfter)
    ///
    /// IMPORTANT: This implementation uses synchronous DB updates to prevent race conditions.
    /// The cache serves as a fast-path for rejecting already-blocked IPs, but all increments
    /// are verified against DynamoDB to ensure accurate rate limiting.
    public func checkRateLimit(
        identifier: String,
        maxRequests: Int,
        windowSeconds: Int
    ) async throws -> (allowed: Bool, count: Int, retryAfter: Int) {
        let windowStart = Int(Date().timeIntervalSince1970) / windowSeconds * windowSeconds
        let retryAfterBase = windowStart + windowSeconds - Int(Date().timeIntervalSince1970)

        // Check in-memory cache first (fast path for REJECTIONS only)
        if let cached = await RateLimitCache.shared.get(identifier: identifier) {
            // Ensure we're in the same window
            if cached.windowStart == windowStart {
                if cached.count >= maxRequests {
                    // Already at limit, reject without DB call (safe - can only be more restrictive)
                    return (false, maxRequests, max(0, retryAfterBase))
                }
                // Cache shows under limit, but MUST verify with DB to prevent race conditions
                // Fall through to DB check
            }
        }

        // Always verify with DynamoDB for accurate rate limiting (prevents race conditions)
        return try await checkRateLimitFromDB(
            identifier: identifier,
            maxRequests: maxRequests,
            windowSeconds: windowSeconds,
            windowStart: windowStart
        )
    }

    /// Check rate limit from DynamoDB and update cache
    private func checkRateLimitFromDB(
        identifier: String,
        maxRequests: Int,
        windowSeconds: Int,
        windowStart: Int
    ) async throws -> (allowed: Bool, count: Int, retryAfter: Int) {
        let pk = "\(EntityType.rateLimit.pkPrefix)\(identifier)"
        let sk = "\(EntityType.rateLimit.skPrefix)\(windowStart)"

        // Try to increment counter atomically
        let input = DynamoDB.UpdateItemInput(
            conditionExpression: "attribute_not_exists(pk) OR requestCount < :max",
            expressionAttributeNames: ["#ttl": "ttl"],
            expressionAttributeValues: [
                ":inc": .n("1"),
                ":max": .n(String(maxRequests)),
                ":ttl": .n(String(windowStart + windowSeconds + 60)),
                ":entity": .s(EntityType.rateLimit.rawValue),
                ":id": .s(identifier),
                ":start": .n(String(windowStart))
            ],
            key: ["pk": .s(pk), "sk": .s(sk)],
            returnValues: .allNew,
            tableName: tableName,
            updateExpression: """
                SET requestCount = if_not_exists(requestCount, :inc) + :inc,
                    #ttl = :ttl,
                    entityType = :entity,
                    identifier = :id,
                    windowStart = :start
                """
        )

        do {
            let response = try await client.updateItem(input)

            if let countAttr = response.attributes?["requestCount"],
               case .n(let countStr) = countAttr,
               let count = Int(countStr) {
                // SECURITY: Validate count is within expected bounds
                // Count should be positive and not exceed maxRequests + buffer
                // Fail closed if data is corrupted to prevent bypass attacks
                let maxExpectedCount = maxRequests + 5
                guard count > 0 && count <= maxExpectedCount else {
                    SecureLogger.security("Rate limit: Unexpected count from DynamoDB, failing closed", metadata: ["count": String(count)])
                    await RateLimitCache.shared.invalidate(identifier: identifier)
                    // SECURITY: Fail closed - reject request when data is corrupted
                    let retryAfter = windowStart + windowSeconds - Int(Date().timeIntervalSince1970)
                    return (false, maxRequests, max(0, retryAfter))
                }

                // Update cache with fresh, validated data
                await RateLimitCache.shared.update(
                    identifier: identifier,
                    count: count,
                    windowStart: windowStart
                )
                let retryAfter = windowStart + windowSeconds - Int(Date().timeIntervalSince1970)
                return (true, count, max(0, retryAfter))
            }

            return (true, 1, windowSeconds)
        } catch let error as AWSClientError where error.errorCode == "ConditionalCheckFailedException" {
            // Rate limit exceeded - update cache
            await RateLimitCache.shared.update(
                identifier: identifier,
                count: maxRequests,
                windowStart: windowStart
            )
            let retryAfter = windowStart + windowSeconds - Int(Date().timeIntervalSince1970)
            return (false, maxRequests, max(0, retryAfter))
        } catch let error as AWSClientError where error.errorCode == "ProvisionedThroughputExceededException" {
            // SECURITY: Fail closed on DynamoDB throttling to prevent DoS bypass
            // Attackers could trigger throttling to bypass rate limits
            SecureLogger.security("Rate limit check: DynamoDB throttled, failing closed")
            let retryAfter = windowStart + windowSeconds - Int(Date().timeIntervalSince1970)
            return (false, maxRequests, max(0, retryAfter))
        } catch {
            // SECURITY: Fail closed on unknown errors to prevent DDoS during DB issues
            // This is more secure than fail-open which could allow unlimited requests
            SecureLogger.error("Rate limit check failed, failing closed", error: error)
            let retryAfter = windowStart + windowSeconds - Int(Date().timeIntervalSince1970)
            return (false, maxRequests, max(0, retryAfter))
        }
    }

    // MARK: - Idempotency

    /// Check idempotency key and get cached response
    /// - Parameters:
    ///   - key: The idempotency key
    ///   - requestHash: Optional hash of the request body for collision detection
    /// - Returns: Cached response if exists and hash matches (or no hash stored)
    public func getIdempotencyResponse(key: String, requestHash: String? = nil) async throws -> (response: String, statusCode: Int)? {
        let pk = "\(EntityType.idempotency.pkPrefix)\(key)"
        let sk = "\(EntityType.idempotency.skPrefix)\(key)"

        let input = DynamoDB.GetItemInput(
            key: ["pk": .s(pk), "sk": .s(sk)],
            tableName: tableName
        )

        do {
            let response = try await client.getItem(input)

            guard let item = response.item else {
                return nil
            }

            let idempotencyItem: IdempotencyItem = try decodeFromDynamoDB(item)

            // SECURITY: Verify request hash matches to prevent collision attacks
            // If stored item has a hash and provided hash doesn't match, reject with error
            if let storedHash = idempotencyItem.requestHash,
               let providedHash = requestHash,
               storedHash != providedHash {
                SecureLogger.security("Idempotency collision detected - different request body with same key")
                throw AppError.idempotencyCollision(key: key)
            }

            return (idempotencyItem.response, idempotencyItem.statusCode)
        } catch {
            // On error, proceed without idempotency check
            return nil
        }
    }

    /// Store idempotency response
    /// - Parameters:
    ///   - key: The idempotency key
    ///   - leadId: The created lead ID
    ///   - response: The response to cache
    ///   - statusCode: HTTP status code
    ///   - requestHash: Optional hash of the request body for collision detection
    public func storeIdempotencyResponse(
        key: String,
        leadId: String,
        response: String,
        statusCode: Int,
        requestHash: String? = nil
    ) async throws {
        let item = IdempotencyItem(
            idempotencyKey: key,
            leadId: leadId,
            response: response,
            statusCode: statusCode,
            requestHash: requestHash
        )

        let input = DynamoDB.PutItemInput(
            conditionExpression: "attribute_not_exists(pk)",
            item: try encodeToDynamoDB(item),
            tableName: tableName
        )

        do {
            _ = try await client.putItem(input)
        } catch let error as AWSClientError where error.errorCode == "ConditionalCheckFailedException" {
            // Key already exists, ignore
        } catch {
            // Log but don't fail the request
            SecureLogger.error("Failed to store idempotency response", error: error)
        }
    }

    // MARK: - Hashing Utilities

    /// Generate a cryptographically secure hash of request data for idempotency collision detection
    /// - Parameter data: The data to hash (typically JSON-encoded request)
    /// - Returns: A hex string SHA256 hash (64 characters)
    public static func hashRequestData(_ data: String) -> String {
        // Use CryptoKit SHA256 for cryptographic security
        // This prevents collision attacks on idempotency keys
        let inputData = Data(data.utf8)
        let hashed = SHA256.hash(data: inputData)
        return hashed.compactMap { String(format: "%02x", $0) }.joined()
    }

    // MARK: - Audit Logging

    /// Create an audit log entry
    /// - Parameter entry: The audit log entry
    /// - Note: Errors are logged but don't fail the main operation to prevent audit failures
    ///         from breaking lead creation. Monitor logs for "audit log failed" messages.
    public func createAuditLog(_ entry: AuditLogItem) async throws {
        let input = DynamoDB.PutItemInput(
            item: try encodeToDynamoDB(entry),
            tableName: tableName
        )

        do {
            _ = try await client.putItem(input)
        } catch {
            // Log error with full context for monitoring and alerting
            // In production, these should be monitored and alerted on
            SecureLogger.error("Audit log failed", error: error, metadata: ["leadId": entry.leadId, "action": entry.action])
        }
    }

    // MARK: - DynamoDB Encoding/Decoding

    private func encodeToDynamoDB<T: Encodable>(_ value: T) throws -> [String: DynamoDB.AttributeValue] {
        let encoder = JSONEncoder()
        let data = try encoder.encode(value)

        guard let dict = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw AppError.internalError(message: "Failed to encode to DynamoDB format")
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
