// =============================================================================
// LeadControllerTests.swift
// LeadCaptureAPITests
// =============================================================================
// Tests for LeadController using Swift Testing framework.
// =============================================================================

import Testing
import Foundation
import Vapor
import XCTVapor
@testable import LeadCaptureAPI
@testable import Shared

// MARK: - Storage Keys for Testing

struct TestRateLimiterServiceKey: Vapor.StorageKey {
    typealias Value = RateLimiterService
}

struct TestSpamDetectorServiceKey: Vapor.StorageKey {
    typealias Value = SpamDetectorService
}

@Suite("Lead Controller Tests")
struct LeadControllerTests {

    // MARK: - Test Application Setup

    /// Create a test application with mock services
    private func createTestApp() async throws -> Application {
        let app = try await Application.make(.testing)

        // Configure minimal middleware
        app.middleware = Middlewares()

        // Create mock services (without AWS connection)
        let config = AppConfig.shared
        let rateLimiterService = RateLimiterService(dynamoDBService: nil, config: config)
        let spamDetectorService = SpamDetectorService(config: config)

        // Store services
        app.storage[TestRateLimiterServiceKey.self] = rateLimiterService
        app.storage[TestSpamDetectorServiceKey.self] = spamDetectorService

        return app
    }

    // MARK: - Basic Endpoint Tests

    @Test("Health endpoint returns 200")
    func healthEndpoint() async throws {
        let app = try await createTestApp()
        defer { Task { try? await app.asyncShutdown() } }

        // Register health controller
        let healthController = HealthController()
        try app.register(collection: healthController)

        try await XCTVaporContext.$emitWarningIfCurrentTestInfoIsAvailable.withValue(false) {
            try await app.test(.GET, "/health") { response in
                #expect(response.status == .ok)

                let body = try response.content.decode(HealthResponse.self)
                #expect(body.status == .healthy)
                #expect(!body.version.isEmpty)
            }
        }
    }

    @Test("Liveness endpoint returns 200")
    func livenessEndpoint() async throws {
        let app = try await createTestApp()
        defer { Task { try? await app.asyncShutdown() } }

        let healthController = HealthController()
        try app.register(collection: healthController)

        try await XCTVaporContext.$emitWarningIfCurrentTestInfoIsAvailable.withValue(false) {
            try await app.test(.GET, "/health/live") { response in
                #expect(response.status == .ok)
            }
        }
    }

    @Test("Readiness endpoint returns appropriate status")
    func readinessEndpoint() async throws {
        let app = try await createTestApp()
        defer { Task { try? await app.asyncShutdown() } }

        let healthController = HealthController()
        try app.register(collection: healthController)

        try await XCTVaporContext.$emitWarningIfCurrentTestInfoIsAvailable.withValue(false) {
            try await app.test(.GET, "/health/ready") { response in
                // Should return 200 if configured, 503 if not
                let validStatuses: [HTTPStatus] = [.ok, .serviceUnavailable]
                #expect(validStatuses.contains(response.status))
            }
        }
    }

    // MARK: - Lead Request Validation Tests

    @Test("Valid lead request passes validation")
    func validLeadRequest() async throws {
        let request = LeadRequest(
            email: "test@example.com",
            name: "John Doe",
            company: "Test Corp",
            phone: "+1234567890",
            notes: "Test notes",
            source: "website",
            funnelId: nil,
            metadata: ["key": "value"],
            website: nil,
            formStartTime: nil
        )

        let errors = request.validateComprehensive()
        #expect(errors.isEmpty, "Expected no validation errors")
    }

    @Test("Invalid email fails validation")
    func invalidEmailValidation() async throws {
        let request = LeadRequest(
            email: "invalid-email",
            name: nil,
            company: nil,
            phone: nil,
            notes: nil,
            source: nil,
            funnelId: nil,
            metadata: nil,
            website: nil,
            formStartTime: nil
        )

        let errors = request.validateComprehensive()
        #expect(!errors.isEmpty, "Expected validation errors for invalid email")
        #expect(errors.contains { $0.field == "email" })
    }

    @Test("Empty email fails validation")
    func emptyEmailValidation() async throws {
        let request = LeadRequest(
            email: "",
            name: nil,
            company: nil,
            phone: nil,
            notes: nil,
            source: nil,
            funnelId: nil,
            metadata: nil,
            website: nil,
            formStartTime: nil
        )

        let errors = request.validateComprehensive()
        #expect(!errors.isEmpty, "Expected validation errors for empty email")
    }

    @Test("Honeypot detection works")
    func honeypotDetection() async throws {
        let request = LeadRequest(
            email: "test@example.com",
            name: nil,
            company: nil,
            phone: nil,
            notes: nil,
            source: nil,
            funnelId: nil,
            metadata: nil,
            website: "http://spam.com", // Honeypot filled
            formStartTime: nil
        )

        #expect(request.isHoneypotTriggered, "Honeypot should be triggered")
    }

    @Test("Empty honeypot passes")
    func emptyHoneypot() async throws {
        let request = LeadRequest(
            email: "test@example.com",
            name: nil,
            company: nil,
            phone: nil,
            notes: nil,
            source: nil,
            funnelId: nil,
            metadata: nil,
            website: nil,
            formStartTime: nil
        )

        #expect(!request.isHoneypotTriggered, "Honeypot should not be triggered")
    }

    // MARK: - Normalized Values Tests

    @Test("Email is normalized correctly")
    func emailNormalization() async throws {
        let request = LeadRequest(
            email: "  TEST@EXAMPLE.COM  ",
            name: nil,
            company: nil,
            phone: nil,
            notes: nil,
            source: nil,
            funnelId: nil,
            metadata: nil,
            website: nil,
            formStartTime: nil
        )

        #expect(request.normalizedEmail == "test@example.com")
    }

    @Test("Name is normalized correctly")
    func nameNormalization() async throws {
        let request = LeadRequest(
            email: "test@example.com",
            name: "  John Doe  ",
            company: nil,
            phone: nil,
            notes: nil,
            source: nil,
            funnelId: nil,
            metadata: nil,
            website: nil,
            formStartTime: nil
        )

        #expect(request.normalizedName == "John Doe")
    }

    // MARK: - Disposable Email Tests

    @Test("Disposable email is detected")
    func disposableEmailDetection() async throws {
        let request = LeadRequest(
            email: "test@mailinator.com",
            name: nil,
            company: nil,
            phone: nil,
            notes: nil,
            source: nil,
            funnelId: nil,
            metadata: nil,
            website: nil,
            formStartTime: nil
        )

        #expect(request.isDisposableEmail(), "Mailinator should be detected as disposable")
    }

    @Test("Regular email is not flagged as disposable")
    func regularEmailNotDisposable() async throws {
        let request = LeadRequest(
            email: "test@gmail.com",
            name: nil,
            company: nil,
            phone: nil,
            notes: nil,
            source: nil,
            funnelId: nil,
            metadata: nil,
            website: nil,
            formStartTime: nil
        )

        #expect(!request.isDisposableEmail(), "Gmail should not be detected as disposable")
    }

    // MARK: - Phone Validation Tests

    @Test("Valid phone passes validation")
    func validPhoneValidation() async throws {
        let request = LeadRequest(
            email: "test@example.com",
            name: nil,
            company: nil,
            phone: "+1-555-123-4567",
            notes: nil,
            source: nil,
            funnelId: nil,
            metadata: nil,
            website: nil,
            formStartTime: nil
        )

        #expect(request.isPhoneValid(), "Valid phone should pass validation")
    }

    @Test("Empty phone passes validation")
    func emptyPhoneValidation() async throws {
        let request = LeadRequest(
            email: "test@example.com",
            name: nil,
            company: nil,
            phone: nil,
            notes: nil,
            source: nil,
            funnelId: nil,
            metadata: nil,
            website: nil,
            formStartTime: nil
        )

        #expect(request.isPhoneValid(), "Empty phone should pass validation")
    }

    // MARK: - CreateLeadRequest Conversion Tests

    @Test("LeadRequest converts to CreateLeadRequest correctly")
    func leadRequestConversion() async throws {
        let request = LeadRequest(
            email: "  TEST@EXAMPLE.COM  ",
            name: "  John Doe  ",
            company: "Acme Corp",
            phone: "+1234567890",
            notes: "Some notes",
            source: "website",
            funnelId: "funnel-1",
            metadata: ["key": "value"],
            website: nil,
            formStartTime: nil
        )

        let createRequest = request.toCreateLeadRequest()

        #expect(createRequest.email == "test@example.com")
        #expect(createRequest.name == "John Doe")
        #expect(createRequest.company == "Acme Corp")
        #expect(createRequest.phone == "+1234567890")
        #expect(createRequest.notes == "Some notes")
        #expect(createRequest.metadata?["key"] == "value")
    }
}
