// =============================================================================
// main.swift
// LeadCaptureAPI
// =============================================================================
// Entry point for the Lead Capture API server.
// Can be deployed as a standalone HTTP server or containerized.
// =============================================================================

import Foundation
import Vapor
import SotoCore
import Shared

// Run the application
try await LeadCaptureApp.run()

enum LeadCaptureApp {
    static func run() async throws {
        var env = try Environment.detect()
        try LoggingSystem.bootstrap(from: &env)

        let app = try await Application.make(env)
        defer { Task { try? await app.asyncShutdown() } }

        // Configure the application
        try await configure(app)

        // Run the server
        try await app.execute()
    }

    static func configure(_ app: Application) async throws {
        let config = AppConfig.shared

        // Log configuration
        app.logger.info("Starting Lead Capture API", metadata: [
            "environment": .string(config.apiStage),
            "region": .string(config.awsRegion),
            "table": .string(config.dynamoDBTableName)
        ])

        // Configure middleware (order matters)
        // 1. Error handling first (catches all errors from later middleware)
        // 2. Security headers (applied to all responses)
        // 3. CORS (must be before API key check for preflight)
        // 4. API key authentication
        // 5. Request logging (logs all requests)
        app.middleware = Middlewares()
        app.middleware.use(CustomErrorMiddleware(config: config))
        app.middleware.use(SecurityHeadersMiddleware(config: config))
        app.middleware.use(CustomCORSMiddleware(configuration: CORSConfiguration.fromConfig(config)))
        app.middleware.use(APIKeyMiddleware(config: config))
        app.middleware.use(RequestLoggingMiddleware(config: config))

        // Create AWS client and services
        let awsClient = AWSClientFactory.createClient(config: config)
        let leadService = LeadService(awsClient: awsClient, config: config)

        // Store services in app storage
        app.storage[LeadServiceKey.self] = leadService
        app.storage[AWSClientKey.self] = awsClient

        // Configure routes
        configureRoutes(app, leadService: leadService)

        // Cleanup on shutdown
        app.lifecycle.use(AWSClientLifecycle(client: awsClient))

        app.logger.info("Application configured successfully")
    }

    static func configureRoutes(_ app: Application, leadService: LeadService) {
        // Health check
        app.get("health") { req -> HealthResponse in
            return HealthResponse(
                status: "healthy",
                version: "1.0.0",
                timestamp: formatISO8601(Date())
            )
        }

        // Create lead - main endpoint
        app.post("lead") { req async throws -> Response in
            let createRequest = try req.content.decode(CreateLeadRequest.self)

            let result = try await leadService.createLead(
                request: createRequest,
                ipAddress: req.clientIP,
                userAgent: req.clientUserAgent,
                idempotencyKey: req.headers.first(name: "Idempotency-Key")
            )

            // Handle idempotent response
            if result.isIdempotent, let cachedResponse = result.cachedResponse {
                let response = Response(status: HTTPResponseStatus(statusCode: result.statusCode))
                response.headers.contentType = .json
                response.body = .init(string: cachedResponse)
                return response
            }

            guard let lead = result.lead else {
                throw AppError.internalError(message: "No lead created")
            }

            let leadResponse = LeadResponse(from: lead)
            let apiResponse = APIResponse.success(leadResponse, requestId: req.headers.first(name: "X-Request-ID"))

            let response = Response(status: .created)
            response.headers.contentType = .json
            response.body = try .init(data: encodeJSON(apiResponse))
            return response
        }

        // Also support /leads endpoint
        app.post("leads") { req async throws -> Response in
            let createRequest = try req.content.decode(CreateLeadRequest.self)

            let result = try await leadService.createLead(
                request: createRequest,
                ipAddress: req.clientIP,
                userAgent: req.clientUserAgent,
                idempotencyKey: req.headers.first(name: "Idempotency-Key")
            )

            // Handle idempotent response
            if result.isIdempotent, let cachedResponse = result.cachedResponse {
                let response = Response(status: HTTPResponseStatus(statusCode: result.statusCode))
                response.headers.contentType = .json
                response.body = .init(string: cachedResponse)
                return response
            }

            guard let lead = result.lead else {
                throw AppError.internalError(message: "No lead created")
            }

            let leadResponse = LeadResponse(from: lead)
            let apiResponse = APIResponse.success(leadResponse, requestId: req.headers.first(name: "X-Request-ID"))

            let response = Response(status: .created)
            response.headers.contentType = .json
            response.body = try .init(data: encodeJSON(apiResponse))
            return response
        }
    }
}

// MARK: - Storage Keys

struct LeadServiceKey: StorageKey {
    typealias Value = LeadService
}

struct AWSClientKey: StorageKey {
    typealias Value = AWSClient
}

// MARK: - AWS Client Lifecycle

struct AWSClientLifecycle: LifecycleHandler {
    let client: AWSClient

    func shutdown(_ app: Application) {
        try? client.syncShutdown()
    }
}

// MARK: - Health Response

struct HealthResponse: Content {
    let status: String
    let version: String
    let timestamp: String
}
