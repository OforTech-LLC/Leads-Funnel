// =============================================================================
// LeadController.swift
// LeadCaptureAPI/Controllers
// =============================================================================
// Lead capture endpoints with validation, rate limiting, and idempotency.
// =============================================================================

import Foundation
import Vapor
import Shared

// MARK: - Lead Controller

/// Controller for lead capture endpoints
public struct LeadController: RouteCollection {

    // MARK: - Properties

    private let leadService: LeadService
    private let rateLimiterService: RateLimiterService
    private let spamDetectorService: SpamDetectorService
    private let config: AppConfig

    // MARK: - Initialization

    public init(
        leadService: LeadService,
        rateLimiterService: RateLimiterService,
        spamDetectorService: SpamDetectorService,
        config: AppConfig = .shared
    ) {
        self.leadService = leadService
        self.rateLimiterService = rateLimiterService
        self.spamDetectorService = spamDetectorService
        self.config = config
    }

    // MARK: - Route Registration

    public func boot(routes: RoutesBuilder) throws {
        // Lead endpoints
        routes.post("lead", use: createLead)
        routes.post("leads", use: createLead)

        // Funnel-specific endpoint
        routes.group("funnel", ":funnelId") { funnel in
            funnel.post("lead", use: createFunnelLead)
            funnel.post("leads", use: createFunnelLead)
        }
    }

    // MARK: - Create Lead

    /// Create a new lead
    /// - POST /lead or /leads
    @Sendable
    public func createLead(req: Request) async throws -> Response {
        return try await processLeadCreation(req: req, funnelId: nil)
    }

    /// Create a lead for a specific funnel
    /// - POST /funnel/:funnelId/lead
    @Sendable
    public func createFunnelLead(req: Request) async throws -> Response {
        let funnelId = req.parameters.get("funnelId")
        return try await processLeadCreation(req: req, funnelId: funnelId)
    }

    // MARK: - Private Methods

    private func processLeadCreation(req: Request, funnelId: String?) async throws -> Response {
        let requestId = req.headers.first(name: "X-Request-ID") ?? UUID().uuidString
        let clientIP = req.clientIP
        let userAgent = req.clientUserAgent
        let idempotencyKey = req.headers.first(name: "Idempotency-Key")

        // 1. Validate request body using Vapor's Validatable
        let leadRequest: LeadRequest
        do {
            leadRequest = try req.content.decode(LeadRequest.self)
            try LeadRequest.validate(content: req)
        } catch let error as ValidationsError {
            // Get the first failure's key description
            let fieldName = error.failures.first?.key.description ?? "unknown"
            let message = error.failures.first?.result.failureDescription ?? "Validation failed"
            throw AppError.validationFailed(
                field: fieldName,
                message: message
            )
        } catch {
            throw AppError.validationFailed(field: "body", message: "Invalid request format")
        }

        // 2. Rate limiting - 5 req/min/IP/funnel
        let rateLimitKey = buildRateLimitKey(ip: clientIP, funnelId: funnelId)
        let rateLimitResult = await rateLimiterService.checkRateLimit(
            identifier: rateLimitKey,
            maxRequests: config.rateLimitMaxRequests,
            windowSeconds: config.rateLimitWindowSeconds
        )

        if !rateLimitResult.allowed {
            let response = Response(status: .tooManyRequests)
            response.headers.add(name: "Retry-After", value: String(rateLimitResult.retryAfter))
            response.headers.add(name: "X-RateLimit-Remaining", value: "0")
            response.headers.add(name: "X-RateLimit-Reset", value: String(rateLimitResult.retryAfter))
            response.headers.add(name: "X-Request-ID", value: requestId)
            response.headers.contentType = .json

            let errorResponse = APIResponse<EmptyResponse>(
                success: false,
                error: APIErrorResponse(
                    code: .rateLimitExceeded,
                    message: "Rate limit exceeded. Try again in \(rateLimitResult.retryAfter) seconds"
                ),
                requestId: requestId
            )
            response.body = try .init(data: encodeJSON(errorResponse))
            return response
        }

        // 3. Spam detection
        let spamResult = spamDetectorService.analyze(
            email: leadRequest.email,
            name: leadRequest.name,
            company: leadRequest.company,
            notes: leadRequest.notes,
            ip: clientIP,
            userAgent: userAgent
        )

        // Honeypot check - return fake 201 to fool bots
        if leadRequest.website != nil && !leadRequest.website!.isEmpty {
            SecureLogger.security("Honeypot triggered", metadata: [
                "requestId": requestId
            ])
            return createFakeSuccessResponse(requestId: requestId)
        }

        // If spam detected with high confidence, quarantine silently
        if spamResult.isSpam && spamResult.confidence >= 0.8 {
            SecureLogger.security("High confidence spam detected", metadata: [
                "requestId": requestId,
                "reasons": spamResult.reasons.joined(separator: ",")
            ])
        }

        // 4. Convert to CreateLeadRequest for LeadService
        let createRequest = CreateLeadRequest(
            email: leadRequest.email,
            name: leadRequest.name,
            company: leadRequest.company,
            phone: leadRequest.phone,
            notes: leadRequest.notes,
            source: leadRequest.source ?? funnelId ?? "website",
            metadata: leadRequest.metadata,
            website: leadRequest.website
        )

        // 5. Create lead through service
        let result = try await leadService.createLead(
            request: createRequest,
            ipAddress: clientIP,
            userAgent: userAgent,
            idempotencyKey: idempotencyKey
        )

        // 6. Handle idempotent response
        if result.isIdempotent, let cachedResponse = result.cachedResponse {
            let response = Response(status: HTTPResponseStatus(statusCode: result.statusCode))
            response.headers.contentType = .json
            response.headers.add(name: "X-Request-ID", value: requestId)
            response.headers.add(name: "X-Idempotent-Replay", value: "true")
            response.body = .init(string: cachedResponse)
            return response
        }

        // 7. Build success response
        guard let lead = result.lead else {
            throw AppError.internalError(message: "No lead created")
        }

        let leadResponse = LeadResponse(from: lead)
        let apiResponse = APIResponse.success(leadResponse, requestId: requestId)

        let response = Response(status: .created)
        response.headers.contentType = .json
        response.headers.add(name: "X-Request-ID", value: requestId)
        response.headers.add(
            name: "X-RateLimit-Remaining",
            value: String(max(0, config.rateLimitMaxRequests - rateLimitResult.count))
        )
        response.body = try .init(data: encodeJSON(apiResponse))

        return response
    }

    /// Build rate limit key from IP and optional funnel ID
    private func buildRateLimitKey(ip: String?, funnelId: String?) -> String {
        let ipPart = ip ?? "unknown"
        if let funnelId = funnelId {
            return "\(ipPart):\(funnelId)"
        }
        return ipPart
    }

    /// Create a fake success response to fool spam bots
    private func createFakeSuccessResponse(requestId: String) -> Response {
        let fakeId = UUID().uuidString.lowercased()
        let now = formatISO8601(Date())

        let fakeResponse: [String: Any] = [
            "success": true,
            "data": [
                "id": fakeId,
                "email": "submitted@example.com",
                "status": "new",
                "createdAt": now,
                "updatedAt": now
            ],
            "requestId": requestId
        ]

        let response = Response(status: .created)
        response.headers.contentType = .json
        response.headers.add(name: "X-Request-ID", value: requestId)

        if let jsonData = try? JSONSerialization.data(withJSONObject: fakeResponse) {
            response.body = .init(data: jsonData)
        }

        return response
    }
}

// MARK: - Vapor Storage Keys

public struct LeadControllerKey: Vapor.StorageKey {
    public typealias Value = LeadController
}
