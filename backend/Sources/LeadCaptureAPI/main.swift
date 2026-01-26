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
            "table": .string(config.dynamoDBTableName),
            "project": .string(ProcessInfo.processInfo.environment["PROJECT"] ?? "kanjona")
        ])

        // Configure middleware (order matters)
        // 1. Error handling first (catches all errors from later middleware)
        // 2. Security headers (applied to all responses)
        // 3. CORS (must be before API key check for preflight)
        // 4. Origin validation (validates request origins)
        // 5. API key authentication
        // 6. Request logging (logs all requests)
        app.middleware = Middlewares()
        app.middleware.use(CustomErrorMiddleware(config: config))
        app.middleware.use(SecurityHeadersMiddleware(config: config))
        app.middleware.use(CustomCORSMiddleware(configuration: CORSConfiguration.fromConfig(config)))
        app.middleware.use(OriginValidationMiddleware(config: config, strictMode: config.isProduction))
        app.middleware.use(APIKeyMiddleware(config: config))
        app.middleware.use(RequestLoggingMiddleware(config: config))

        // Create AWS client
        let awsClient = AWSClientFactory.createClient(config: config)

        // Create services
        let dynamoDBService = DynamoDBService(client: awsClient, config: config)
        let configService = ConfigService(awsClient: awsClient, config: config)
        let rateLimiterService = RateLimiterService(dynamoDBService: dynamoDBService, config: config)
        let spamDetectorService = SpamDetectorService(config: config)
        let leadService = LeadService(awsClient: awsClient, config: config)

        // Store services in app storage
        app.storage[LeadServiceStorageKey.self] = leadService
        app.storage[AWSClientStorageKey.self] = awsClient
        app.storage[DynamoDBServiceStorageKey.self] = dynamoDBService
        app.storage[ConfigServiceKey.self] = configService
        app.storage[RateLimiterServiceKey.self] = rateLimiterService
        app.storage[SpamDetectorServiceStorageKey.self] = spamDetectorService

        // Configure routes using controllers
        try configureRoutes(
            app,
            leadService: leadService,
            rateLimiterService: rateLimiterService,
            spamDetectorService: spamDetectorService,
            configService: configService,
            dynamoDBService: dynamoDBService
        )

        // Cleanup on shutdown
        app.lifecycle.use(AWSClientLifecycle(client: awsClient))

        app.logger.info("Application configured successfully")
    }

    static func configureRoutes(
        _ app: Application,
        leadService: LeadService,
        rateLimiterService: RateLimiterService,
        spamDetectorService: SpamDetectorService,
        configService: ConfigService,
        dynamoDBService: DynamoDBService
    ) throws {
        // Register Health Controller
        let healthController = HealthController(
            config: AppConfig.shared,
            dynamoDBService: dynamoDBService
        )
        try app.register(collection: healthController)

        // Register Lead Controller
        let leadController = LeadController(
            leadService: leadService,
            rateLimiterService: rateLimiterService,
            spamDetectorService: spamDetectorService,
            config: AppConfig.shared
        )
        try app.register(collection: leadController)

        // Register Voice Controller
        let voiceController = VoiceController(
            config: AppConfig.shared,
            configService: configService
        )
        try app.register(collection: voiceController)

        // Root endpoint
        app.get { req -> Response in
            let response = Response(status: .ok)
            response.headers.contentType = .json
            response.body = .init(string: """
            {
                "name": "Kanjona Lead Capture API",
                "version": "1.0.0",
                "status": "running",
                "documentation": "/docs"
            }
            """)
            return response
        }
    }
}

// MARK: - Vapor Storage Keys

struct LeadServiceStorageKey: Vapor.StorageKey {
    typealias Value = LeadService
}

struct AWSClientStorageKey: Vapor.StorageKey {
    typealias Value = AWSClient
}

struct DynamoDBServiceStorageKey: Vapor.StorageKey {
    typealias Value = DynamoDBService
}

struct SpamDetectorServiceStorageKey: Vapor.StorageKey {
    typealias Value = SpamDetectorService
}

// MARK: - AWS Client Lifecycle

struct AWSClientLifecycle: LifecycleHandler {
    let client: AWSClient

    func shutdown(_ app: Application) {
        try? client.syncShutdown()
    }
}
