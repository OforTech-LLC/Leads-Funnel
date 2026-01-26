// =============================================================================
// VoiceController.swift
// LeadCaptureAPI/Controllers
// =============================================================================
// Voice agent endpoints that return 503 when feature is disabled.
// =============================================================================

import Foundation
import Vapor
import Shared

// MARK: - Voice Controller

/// Controller for voice agent endpoints
/// Returns 503 Service Unavailable when voice feature is disabled
public struct VoiceController: RouteCollection {

    // MARK: - Properties

    private let config: AppConfig
    private let configService: ConfigService

    // MARK: - Initialization

    public init(
        config: AppConfig = .shared,
        configService: ConfigService
    ) {
        self.config = config
        self.configService = configService
    }

    // MARK: - Route Registration

    public func boot(routes: RoutesBuilder) throws {
        let voice = routes.grouped("voice")

        // Voice call initiation
        voice.post("call", use: initiateCall)

        // Voice webhook endpoints
        voice.post("webhook", "status", use: callStatusWebhook)
        voice.post("webhook", "recording", use: recordingWebhook)

        // Voice agent configuration
        voice.get("agents", use: listAgents)
        voice.get("agents", ":agentId", use: getAgent)

        // Call history
        voice.get("calls", use: listCalls)
        voice.get("calls", ":callId", use: getCall)
    }

    // MARK: - Call Endpoints

    /// Initiate a voice call
    /// - POST /voice/call
    @Sendable
    public func initiateCall(req: Request) async throws -> Response {
        try await checkVoiceFeatureEnabled(req: req)

        // Voice feature is enabled - process the call initiation
        let callRequest = try req.content.decode(InitiateCallRequest.self)
        let requestId = req.headers.first(name: "X-Request-ID") ?? UUID().uuidString

        // Validate phone number
        if !ValidationLimits.isValidPhone(callRequest.phoneNumber) {
            throw AppError.validationFailed(field: "phoneNumber", message: "Invalid phone number format")
        }

        // In a real implementation, this would integrate with a voice provider
        // For now, return a stub response indicating the call was queued
        let callId = UUID().uuidString.lowercased()
        let response = InitiateCallResponse(
            callId: callId,
            status: "queued",
            phoneNumber: maskPhoneNumber(callRequest.phoneNumber),
            estimatedStartTime: formatISO8601(Date().addingTimeInterval(5)),
            queuePosition: 1
        )

        let apiResponse = APIResponse.success(response, requestId: requestId)

        let httpResponse = Response(status: .accepted)
        httpResponse.headers.contentType = .json
        httpResponse.headers.add(name: "X-Request-ID", value: requestId)
        httpResponse.body = try .init(data: encodeJSON(apiResponse))

        return httpResponse
    }

    /// Call status webhook
    /// - POST /voice/webhook/status
    @Sendable
    public func callStatusWebhook(req: Request) async throws -> Response {
        try await checkVoiceFeatureEnabled(req: req)

        // Verify webhook signature in production
        if config.isProduction {
            try verifyWebhookSignature(req: req)
        }

        let statusUpdate = try req.content.decode(CallStatusUpdate.self)

        SecureLogger.info("Call status update received", metadata: [
            "callId": statusUpdate.callId,
            "status": statusUpdate.status
        ])

        // Process the status update (in a real app, update database)
        // For now, just acknowledge receipt

        return Response(status: .ok)
    }

    /// Recording webhook
    /// - POST /voice/webhook/recording
    @Sendable
    public func recordingWebhook(req: Request) async throws -> Response {
        try await checkVoiceFeatureEnabled(req: req)

        // Verify webhook signature in production
        if config.isProduction {
            try verifyWebhookSignature(req: req)
        }

        let recording = try req.content.decode(RecordingUpdate.self)

        SecureLogger.info("Recording received", metadata: [
            "callId": recording.callId,
            "duration": String(recording.durationSeconds)
        ])

        // Process the recording (in a real app, store URL and update database)

        return Response(status: .ok)
    }

    // MARK: - Agent Endpoints

    /// List available voice agents
    /// - GET /voice/agents
    @Sendable
    public func listAgents(req: Request) async throws -> Response {
        try await checkVoiceFeatureEnabled(req: req)

        let requestId = req.headers.first(name: "X-Request-ID") ?? UUID().uuidString

        // In a real implementation, fetch from database
        let agents: [VoiceAgent] = [
            VoiceAgent(
                id: "agent-sales-001",
                name: "Sales Assistant",
                description: "Handles initial sales inquiries and qualification",
                status: "active",
                language: "en-US"
            ),
            VoiceAgent(
                id: "agent-support-001",
                name: "Support Assistant",
                description: "Handles customer support inquiries",
                status: "active",
                language: "en-US"
            )
        ]

        let response = ListAgentsResponse(agents: agents, total: agents.count)
        let apiResponse = APIResponse.success(response, requestId: requestId)

        let httpResponse = Response(status: .ok)
        httpResponse.headers.contentType = .json
        httpResponse.headers.add(name: "X-Request-ID", value: requestId)
        httpResponse.body = try .init(data: encodeJSON(apiResponse))

        return httpResponse
    }

    /// Get a specific voice agent
    /// - GET /voice/agents/:agentId
    @Sendable
    public func getAgent(req: Request) async throws -> Response {
        try await checkVoiceFeatureEnabled(req: req)

        guard let agentId = req.parameters.get("agentId") else {
            throw AppError.validationFailed(field: "agentId", message: "Agent ID is required")
        }

        let requestId = req.headers.first(name: "X-Request-ID") ?? UUID().uuidString

        // In a real implementation, fetch from database
        let agent = VoiceAgent(
            id: agentId,
            name: "Sales Assistant",
            description: "Handles initial sales inquiries and qualification",
            status: "active",
            language: "en-US"
        )

        let apiResponse = APIResponse.success(agent, requestId: requestId)

        let httpResponse = Response(status: .ok)
        httpResponse.headers.contentType = .json
        httpResponse.headers.add(name: "X-Request-ID", value: requestId)
        httpResponse.body = try .init(data: encodeJSON(apiResponse))

        return httpResponse
    }

    // MARK: - Call History Endpoints

    /// List calls
    /// - GET /voice/calls
    @Sendable
    public func listCalls(req: Request) async throws -> Response {
        try await checkVoiceFeatureEnabled(req: req)

        let requestId = req.headers.first(name: "X-Request-ID") ?? UUID().uuidString

        // In a real implementation, fetch from database with pagination
        let calls: [CallSummary] = []
        let response = ListCallsResponse(calls: calls, total: 0, hasMore: false)
        let apiResponse = APIResponse.success(response, requestId: requestId)

        let httpResponse = Response(status: .ok)
        httpResponse.headers.contentType = .json
        httpResponse.headers.add(name: "X-Request-ID", value: requestId)
        httpResponse.body = try .init(data: encodeJSON(apiResponse))

        return httpResponse
    }

    /// Get a specific call
    /// - GET /voice/calls/:callId
    @Sendable
    public func getCall(req: Request) async throws -> Response {
        try await checkVoiceFeatureEnabled(req: req)

        guard let callId = req.parameters.get("callId") else {
            throw AppError.validationFailed(field: "callId", message: "Call ID is required")
        }

        let requestId = req.headers.first(name: "X-Request-ID") ?? UUID().uuidString

        // In a real implementation, fetch from database
        // For now, return 404 since we don't have actual calls
        throw AppError.leadNotFound(id: callId)
    }

    // MARK: - Private Helpers

    /// Check if voice feature is enabled, throw 503 if not
    private func checkVoiceFeatureEnabled(req: Request) async throws {
        let isEnabled = await configService.isFeatureEnabled(.voiceAgent)

        if !isEnabled {
            let requestId = req.headers.first(name: "X-Request-ID") ?? UUID().uuidString

            let errorResponse = VoiceFeatureDisabledResponse(
                success: false,
                error: VoiceFeatureError(
                    code: "VOICE_FEATURE_DISABLED",
                    message: "Voice agent feature is currently disabled",
                    retryAfter: 3600
                ),
                requestId: requestId
            )

            let response = Response(status: .serviceUnavailable)
            response.headers.contentType = .json
            response.headers.add(name: "Retry-After", value: "3600")
            response.headers.add(name: "X-Request-ID", value: requestId)
            response.body = try .init(data: encodeJSON(errorResponse))

            throw Abort(.serviceUnavailable, reason: "Voice feature disabled")
        }
    }

    /// Verify webhook signature from voice provider
    private func verifyWebhookSignature(req: Request) throws {
        // In production, verify the signature from your voice provider
        // This is a placeholder for the actual implementation
        guard let signature = req.headers.first(name: "X-Webhook-Signature") else {
            SecureLogger.security("Missing webhook signature")
            throw AppError.unauthorized(message: "Invalid webhook signature")
        }

        // Verify signature against shared secret
        // For now, just check it's not empty
        if signature.isEmpty {
            throw AppError.unauthorized(message: "Invalid webhook signature")
        }
    }

    /// Mask phone number for logging
    private func maskPhoneNumber(_ phone: String) -> String {
        guard phone.count > 4 else { return "****" }
        let lastFour = String(phone.suffix(4))
        let masked = String(repeating: "*", count: phone.count - 4)
        return masked + lastFour
    }
}

// MARK: - Request/Response Types

/// Request to initiate a call
public struct InitiateCallRequest: Content {
    public let phoneNumber: String
    public let leadId: String?
    public let agentId: String?
    public let metadata: [String: String]?
}

/// Response for initiated call
public struct InitiateCallResponse: Content {
    public let callId: String
    public let status: String
    public let phoneNumber: String
    public let estimatedStartTime: String
    public let queuePosition: Int
}

/// Call status webhook update
public struct CallStatusUpdate: Content {
    public let callId: String
    public let status: String
    public let timestamp: String
    public let duration: Int?
    public let outcome: String?
}

/// Recording webhook update
public struct RecordingUpdate: Content {
    public let callId: String
    public let recordingUrl: String
    public let durationSeconds: Int
    public let timestamp: String
}

/// Voice agent model
public struct VoiceAgent: Content {
    public let id: String
    public let name: String
    public let description: String
    public let status: String
    public let language: String
}

/// List agents response
public struct ListAgentsResponse: Content {
    public let agents: [VoiceAgent]
    public let total: Int
}

/// Call summary for listings
public struct CallSummary: Content {
    public let callId: String
    public let phoneNumber: String
    public let status: String
    public let duration: Int?
    public let createdAt: String
}

/// List calls response
public struct ListCallsResponse: Content {
    public let calls: [CallSummary]
    public let total: Int
    public let hasMore: Bool
}

/// Voice feature disabled response
public struct VoiceFeatureDisabledResponse: Content {
    public let success: Bool
    public let error: VoiceFeatureError
    public let requestId: String
}

/// Voice feature error
public struct VoiceFeatureError: Content {
    public let code: String
    public let message: String
    public let retryAfter: Int
}
