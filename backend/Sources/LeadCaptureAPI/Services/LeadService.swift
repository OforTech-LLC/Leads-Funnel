// =============================================================================
// LeadService.swift
// LeadCaptureAPI/Services
// =============================================================================
// Main business logic for lead operations.
// =============================================================================

import Foundation
import SotoCore
import Shared

// MARK: - Lead Service

/// Main service orchestrating lead operations
public actor LeadService {

    // MARK: - Properties

    private let dynamoDBService: DynamoDBService
    private let eventBridgeService: EventBridgeService
    private let validationService: ValidationService
    private let quarantineService: QuarantineService
    private let config: AppConfig

    // MARK: - Initialization

    public init(
        awsClient: AWSClient,
        config: AppConfig = .shared
    ) {
        self.dynamoDBService = DynamoDBService(client: awsClient, config: config)
        self.eventBridgeService = EventBridgeService(client: awsClient, config: config)
        self.validationService = ValidationService(config: config)
        self.quarantineService = QuarantineService(config: config)
        self.config = config
    }

    // MARK: - Create Lead

    /// Create a new lead with maximum parallelization for performance
    /// - Parameters:
    ///   - request: The create lead request
    ///   - ipAddress: Client IP address
    ///   - userAgent: Client user agent
    ///   - idempotencyKey: Optional idempotency key
    /// - Returns: Result containing lead or error
    public func createLead(
        request: CreateLeadRequest,
        ipAddress: String?,
        userAgent: String?,
        idempotencyKey: String?
    ) async throws -> CreateLeadResult {
        // 1. Fast sync validations first (no I/O)
        if let key = idempotencyKey {
            if !validationService.validateIdempotencyKey(key) {
                throw AppError.validationFailed(
                    field: "Idempotency-Key",
                    message: "Invalid idempotency key format"
                )
            }
        }

        let validationResult = validationService.validate(request)

        if validationResult.honeypotTriggered {
            throw AppError.honeypotTriggered
        }

        if !validationResult.isValid {
            throw validationResult.toAppError() ?? AppError.validationFailed(
                field: "unknown",
                message: "Validation failed"
            )
        }

        // 2. Run quarantine check in parallel with DB calls (it's CPU-only)
        let quarantineCheck = quarantineService.checkQuarantine(request)

        // 2.5 Compute request hash for idempotency collision detection
        let requestHash: String? = {
            guard idempotencyKey != nil else { return nil }
            if let json = try? encodeToJSON(request) {
                return DynamoDBService.hashRequestData(json)
            }
            return nil
        }()

        // 3. PARALLEL: Run all independent DB lookups concurrently
        // This is a major optimization - these 3 calls can take 50-150ms each sequentially
        let (idempotencyResult, rateLimitResult, existingLeads) = try await fetchPrerequisitesInParallel(
            idempotencyKey: idempotencyKey,
            ipAddress: ipAddress,
            email: request.email,
            requestHash: requestHash
        )

        // 4. Check idempotency result first (short-circuit if cached)
        if let cached = idempotencyResult {
            return CreateLeadResult(
                lead: nil,
                cachedResponse: cached.response,
                statusCode: cached.statusCode,
                isIdempotent: true
            )
        }

        // 5. Check rate limit result
        if let rateLimit = rateLimitResult, !rateLimit.allowed {
            throw AppError.rateLimitExceeded(retryAfter: rateLimit.retryAfter)
        }

        // 6. Check email-based rate limiting
        let emailRateLimit = quarantineService.checkEmailRateLimit(
            email: request.email,
            existingLeads: existingLeads
        )

        if emailRateLimit.rateLimited {
            return try await createQuarantinedLead(
                request: request,
                ipAddress: ipAddress,
                userAgent: userAgent,
                reasons: [emailRateLimit.reason?.rawValue ?? "RATE_LIMITED"],
                idempotencyKey: idempotencyKey,
                requestHash: requestHash
            )
        }

        // 7. Check for duplicates
        let duplicateCheck = quarantineService.checkDuplicate(request, existingLeads: existingLeads)

        if duplicateCheck.isDuplicate, let existingLead = duplicateCheck.existingLead {
            throw AppError.duplicateLead(existingId: existingLead.id)
        }

        // 8. Check quarantine criteria (already computed above)
        if quarantineCheck.shouldQuarantine {
            return try await createQuarantinedLead(
                request: request,
                ipAddress: ipAddress,
                userAgent: userAgent,
                reasons: quarantineCheck.reasonStrings,
                idempotencyKey: idempotencyKey,
                requestHash: requestHash
            )
        }

        // 9. Create the lead
        var lead = request.toLead(ipAddress: ipAddress, userAgent: userAgent)
        lead = try await dynamoDBService.createLead(lead)

        // 10. Fire-and-forget post-creation tasks (don't wait for completion)
        // This returns immediately while tasks run in background
        spawnPostCreationTasks(
            lead: lead,
            ipAddress: ipAddress,
            idempotencyKey: idempotencyKey,
            requestHash: requestHash,
            action: "created"
        )

        return CreateLeadResult(lead: lead, isQuarantined: false)
    }

    // MARK: - Parallel Fetch Helpers

    /// Fetch all prerequisites in parallel for maximum speed
    /// Returns: (idempotencyResponse, rateLimitResult, existingLeads)
    private func fetchPrerequisitesInParallel(
        idempotencyKey: String?,
        ipAddress: String?,
        email: String,
        requestHash: String?
    ) async throws -> (
        idempotency: (response: String, statusCode: Int)?,
        rateLimit: (allowed: Bool, count: Int, retryAfter: Int)?,
        leads: [Lead]
    ) {
        // Use async let for true parallelism
        async let idempotencyTask: (response: String, statusCode: Int)? = {
            guard let key = idempotencyKey else { return nil }
            return try? await self.dynamoDBService.getIdempotencyResponse(key: key, requestHash: requestHash)
        }()

        async let rateLimitTask: (allowed: Bool, count: Int, retryAfter: Int)? = {
            guard let ip = ipAddress, self.config.rateLimitEnabled else { return nil }
            return try? await self.dynamoDBService.checkRateLimit(
                identifier: ip,
                maxRequests: self.config.rateLimitMaxRequests,
                windowSeconds: self.config.rateLimitWindowSeconds
            )
        }()

        async let leadsTask: [Lead] = {
            (try? await self.dynamoDBService.getLeadsByEmail(email)) ?? []
        }()

        // Await all in parallel
        let idempotency = await idempotencyTask
        let rateLimit = await rateLimitTask
        let leads = await leadsTask

        return (idempotency, rateLimit, leads)
    }

    /// Spawn post-creation tasks without waiting (fire-and-forget with error logging)
    /// - Note: These tasks run in background but errors are logged for monitoring.
    ///         Monitor logs for "[POST-CREATION ERROR]" messages to detect issues.
    private func spawnPostCreationTasks(
        lead: Lead,
        ipAddress: String?,
        idempotencyKey: String?,
        requestHash: String?,
        action: String
    ) {
        // Pre-compute JSON synchronously (fast)
        let leadJSON = try? encodeToJSON(lead)
        let responseJSON = try? encodeToJSON(LeadResponse(from: lead))
        let leadId = lead.id  // Capture for logging

        // Spawn detached tasks that run independently
        Task.detached(priority: .utility) { [dynamoDBService, eventBridgeService] in
            // Run all post-creation tasks in parallel
            await withTaskGroup(of: Void.self) { group in
                // Publish event
                group.addTask {
                    if action == "created" {
                        do {
                            try await eventBridgeService.publishLeadCreated(lead)
                        } catch {
                            SecureLogger.error("Failed to publish lead.created event", error: error, metadata: ["leadId": leadId])
                        }
                    }
                }

                // Create audit log
                group.addTask {
                    do {
                        try await dynamoDBService.createAuditLog(AuditLogItem(
                            leadId: lead.id,
                            action: action,
                            actor: "api",
                            newState: leadJSON,
                            context: [
                                "ip": ipAddress ?? "unknown",
                                "source": lead.source.rawValue
                            ]
                        ))
                    } catch {
                        SecureLogger.error("Failed to create audit log", error: error, metadata: ["leadId": leadId, "action": action])
                    }
                }

                // Store idempotency response with request hash for collision detection
                if let key = idempotencyKey, let json = responseJSON {
                    group.addTask {
                        do {
                            try await dynamoDBService.storeIdempotencyResponse(
                                key: key,
                                leadId: lead.id,
                                response: json,
                                statusCode: 201,
                                requestHash: requestHash
                            )
                        } catch {
                            SecureLogger.error("Failed to store idempotency response", error: error, metadata: ["leadId": leadId])
                        }
                    }
                }
            }
        }
    }

    // MARK: - Private Methods

    private func createQuarantinedLead(
        request: CreateLeadRequest,
        ipAddress: String?,
        userAgent: String?,
        reasons: [String],
        idempotencyKey: String?,
        requestHash: String?
    ) async throws -> CreateLeadResult {
        var lead = request.toLead(ipAddress: ipAddress, userAgent: userAgent)

        lead = try await dynamoDBService.quarantineLead(lead, reasons: reasons)

        // Fire-and-forget post-creation tasks for quarantined leads
        spawnQuarantinePostTasks(
            lead: lead,
            ipAddress: ipAddress,
            reasons: reasons,
            idempotencyKey: idempotencyKey,
            requestHash: requestHash
        )

        return CreateLeadResult(lead: lead, isQuarantined: true, quarantineReasons: reasons)
    }

    /// Spawn post-quarantine tasks without waiting (fire-and-forget with error logging)
    /// - Note: These tasks run in background but errors are logged for monitoring.
    ///         Monitor logs for "[POST-QUARANTINE ERROR]" messages to detect issues.
    private func spawnQuarantinePostTasks(
        lead: Lead,
        ipAddress: String?,
        reasons: [String],
        idempotencyKey: String?,
        requestHash: String?
    ) {
        // Pre-compute JSON synchronously (fast)
        let leadJSON = try? encodeToJSON(lead)
        let responseJSON = try? encodeToJSON(LeadResponse(from: lead))
        let leadId = lead.id  // Capture for logging

        // Spawn detached tasks that run independently
        Task.detached(priority: .utility) { [dynamoDBService, eventBridgeService] in
            await withTaskGroup(of: Void.self) { group in
                // Publish quarantine event
                group.addTask {
                    do {
                        try await eventBridgeService.publishLeadQuarantined(lead, reasons: reasons)
                    } catch {
                        SecureLogger.error("Failed to publish lead.quarantined event", error: error, metadata: ["leadId": leadId])
                    }
                }

                // Create audit log
                group.addTask {
                    do {
                        try await dynamoDBService.createAuditLog(AuditLogItem(
                            leadId: lead.id,
                            action: "quarantined",
                            actor: "api",
                            newState: leadJSON,
                            context: [
                                "ip": ipAddress ?? "unknown",
                                "reasons": reasons.joined(separator: ",")
                            ]
                        ))
                    } catch {
                        SecureLogger.error("Failed to create quarantine audit log", error: error, metadata: ["leadId": leadId])
                    }
                }

                // Store idempotency response with request hash for collision detection
                if let key = idempotencyKey, let json = responseJSON {
                    group.addTask {
                        do {
                            try await dynamoDBService.storeIdempotencyResponse(
                                key: key,
                                leadId: lead.id,
                                response: json,
                                statusCode: 201,
                                requestHash: requestHash
                            )
                        } catch {
                            SecureLogger.error("Failed to store quarantine idempotency response", error: error, metadata: ["leadId": leadId])
                        }
                    }
                }
            }
        }
    }

    private func encodeToJSON<T: Encodable>(_ value: T) throws -> String {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let data = try encoder.encode(value)
        return String(data: data, encoding: .utf8) ?? "{}"
    }
}

// MARK: - Create Lead Result

/// Result of create lead operation
public struct CreateLeadResult: Sendable {
    /// The created lead (nil if returning cached response)
    public let lead: Lead?

    /// Cached response for idempotent requests
    public let cachedResponse: String?

    /// HTTP status code
    public let statusCode: Int

    /// Whether this is a cached idempotent response
    public let isIdempotent: Bool

    /// Whether the lead was quarantined
    public let isQuarantined: Bool

    /// Quarantine reasons if applicable
    public let quarantineReasons: [String]?

    public init(
        lead: Lead?,
        cachedResponse: String? = nil,
        statusCode: Int = 201,
        isIdempotent: Bool = false,
        isQuarantined: Bool = false,
        quarantineReasons: [String]? = nil
    ) {
        self.lead = lead
        self.cachedResponse = cachedResponse
        self.statusCode = statusCode
        self.isIdempotent = isIdempotent
        self.isQuarantined = isQuarantined
        self.quarantineReasons = quarantineReasons
    }
}
