// =============================================================================
// main.swift
// LeadCaptureAPI
// =============================================================================
// Entry point for the Lead Capture API server.
//
// Deployment modes:
// - Standalone HTTP server (local development, containers)
// - AWS Lambda with Lambda Web Adapter (no code changes needed)
//
// The Lambda Web Adapter runs alongside this HTTP server and translates
// Lambda events to HTTP requests. See: https://github.com/awslabs/aws-lambda-web-adapter
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

        // Detect if running in Lambda (Lambda Web Adapter sets AWS_LAMBDA_RUNTIME_API)
        let isLambda = ProcessInfo.processInfo.environment["AWS_LAMBDA_RUNTIME_API"] != nil

        // Configure for Lambda Web Adapter if in Lambda environment
        if isLambda {
            // Lambda Web Adapter expects the app on port 8080 by default
            app.http.server.configuration.port = 8080
            app.http.server.configuration.hostname = "0.0.0.0"
        }

        // Log configuration
        app.logger.info("Starting Lead Capture API", metadata: [
            "environment": .string(config.apiStage),
            "region": .string(config.awsRegion),
            "table": .string(config.dynamoDBTableName),
            "project": .string(ProcessInfo.processInfo.environment["PROJECT"] ?? "kanjona"),
            "isLambda": .string(isLambda ? "true" : "false")
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

        // Create platform services
        let usersService = UsersService(client: awsClient, config: config)
        let orgsService = OrgsService(client: awsClient, config: config)
        let membershipsService = MembershipsService(client: awsClient, config: config)
        let rulesService = RulesService(client: awsClient, config: config)
        let exportsService = ExportsService(client: awsClient, config: config)
        let notificationsService = NotificationsService(client: awsClient, config: config)
        let jwtService = JWTService()

        // Store services in app storage
        app.storage[LeadServiceStorageKey.self] = leadService
        app.storage[AWSClientStorageKey.self] = awsClient
        app.storage[DynamoDBServiceStorageKey.self] = dynamoDBService
        app.storage[ConfigServiceKey.self] = configService
        app.storage[RateLimiterServiceKey.self] = rateLimiterService
        app.storage[SpamDetectorServiceStorageKey.self] = spamDetectorService
        app.storage[UsersServiceStorageKey.self] = usersService
        app.storage[OrgsServiceStorageKey.self] = orgsService
        app.storage[MembershipsServiceStorageKey.self] = membershipsService
        app.storage[RulesServiceStorageKey.self] = rulesService
        app.storage[ExportsServiceStorageKey.self] = exportsService
        app.storage[NotificationsServiceStorageKey.self] = notificationsService
        app.storage[JWTServiceStorageKey.self] = jwtService

        // Configure routes using controllers
        try configureRoutes(
            app,
            leadService: leadService,
            rateLimiterService: rateLimiterService,
            spamDetectorService: spamDetectorService,
            configService: configService,
            dynamoDBService: dynamoDBService,
            usersService: usersService,
            orgsService: orgsService,
            membershipsService: membershipsService,
            rulesService: rulesService,
            exportsService: exportsService,
            notificationsService: notificationsService,
            jwtService: jwtService
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
        dynamoDBService: DynamoDBService,
        usersService: UsersService,
        orgsService: OrgsService,
        membershipsService: MembershipsService,
        rulesService: RulesService,
        exportsService: ExportsService,
        notificationsService: NotificationsService,
        jwtService: JWTService
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

        // Register CSRF Controller
        let csrfController = CSRFController(config: AppConfig.shared)
        try app.register(collection: csrfController)

        // Register Auth Controller
        let authController = AuthController(config: AppConfig.shared)
        try app.register(collection: authController)

        // Register Portal Controller
        let portalController = PortalController(
            usersService: usersService,
            orgsService: orgsService,
            membershipsService: membershipsService,
            jwtService: jwtService,
            config: AppConfig.shared
        )
        try app.register(collection: portalController)

        // Register Admin Controller
        let adminController = AdminController(
            orgsService: orgsService,
            usersService: usersService,
            membershipsService: membershipsService,
            rulesService: rulesService,
            exportsService: exportsService,
            notificationsService: notificationsService,
            config: AppConfig.shared
        )
        try app.register(collection: adminController)

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

struct UsersServiceStorageKey: Vapor.StorageKey {
    typealias Value = UsersService
}

struct OrgsServiceStorageKey: Vapor.StorageKey {
    typealias Value = OrgsService
}

struct MembershipsServiceStorageKey: Vapor.StorageKey {
    typealias Value = MembershipsService
}

struct JWTServiceStorageKey: Vapor.StorageKey {
    typealias Value = JWTService
}

struct RulesServiceStorageKey: Vapor.StorageKey {
    typealias Value = RulesService
}

struct ExportsServiceStorageKey: Vapor.StorageKey {
    typealias Value = ExportsService
}

struct NotificationsServiceStorageKey: Vapor.StorageKey {
    typealias Value = NotificationsService
}

// MARK: - AWS Client Lifecycle

struct AWSClientLifecycle: LifecycleHandler {
    let client: AWSClient

    func shutdown(_ app: Application) {
        try? client.syncShutdown()
    }
}
