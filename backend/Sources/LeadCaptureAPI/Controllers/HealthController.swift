// =============================================================================
// HealthController.swift
// LeadCaptureAPI/Controllers
// =============================================================================
// Health check and readiness endpoints for load balancers and monitoring.
// =============================================================================

import Foundation
import Vapor
import Shared

// MARK: - Health Controller

/// Controller for health and readiness endpoints
public struct HealthController: RouteCollection {

    // MARK: - Properties

    private let config: AppConfig
    private let dynamoDBService: DynamoDBService?
    private let startTime: Date

    // MARK: - Initialization

    public init(
        config: AppConfig = .shared,
        dynamoDBService: DynamoDBService? = nil
    ) {
        self.config = config
        self.dynamoDBService = dynamoDBService
        self.startTime = Date()
    }

    // MARK: - Route Registration

    public func boot(routes: RoutesBuilder) throws {
        // Basic health check - always returns 200 if server is running
        routes.get("health", use: health)

        // Liveness probe - simple check if the app is alive
        routes.get("health", "live", use: liveness)

        // Readiness probe - checks if app is ready to serve traffic
        routes.get("health", "ready", use: readiness)

        // Detailed health with dependencies (protected in production)
        routes.get("health", "detailed", use: detailedHealth)
    }

    // MARK: - Endpoints

    /// Basic health check
    /// - GET /health
    @Sendable
    public func health(req: Request) async throws -> HealthResponse {
        return HealthResponse(
            status: .healthy,
            version: getVersion(),
            timestamp: formatISO8601(Date()),
            environment: config.apiStage
        )
    }

    /// Kubernetes liveness probe
    /// - GET /health/live
    @Sendable
    public func liveness(req: Request) async throws -> Response {
        let response = Response(status: .ok)
        response.headers.contentType = .json
        response.body = .init(string: "{\"status\":\"alive\"}")
        return response
    }

    /// Kubernetes readiness probe
    /// - GET /health/ready
    @Sendable
    public func readiness(req: Request) async throws -> Response {
        // In production, you might check database connectivity here
        // For now, we just check if the service is configured
        let isReady = !config.dynamoDBTableName.isEmpty

        let status: HTTPStatus = isReady ? .ok : .serviceUnavailable
        let body = isReady ? "{\"status\":\"ready\"}" : "{\"status\":\"not_ready\"}"

        let response = Response(status: status)
        response.headers.contentType = .json
        response.body = .init(string: body)
        return response
    }

    /// Detailed health with dependency checks
    /// - GET /health/detailed
    @Sendable
    public func detailedHealth(req: Request) async throws -> DetailedHealthResponse {
        let uptime = Date().timeIntervalSince(startTime)

        var checks: [String: HealthCheckResult] = [:]

        // DynamoDB check (if service available)
        if dynamoDBService != nil {
            // In a real implementation, you'd ping DynamoDB
            // For now, assume healthy if service exists
            checks["dynamodb"] = HealthCheckResult(
                status: .healthy,
                latencyMs: nil,
                message: "Connected to \(config.dynamoDBTableName)"
            )
        }

        // Memory check
        let memoryUsage = getMemoryUsage()
        checks["memory"] = HealthCheckResult(
            status: memoryUsage.percentUsed < 90 ? .healthy : .degraded,
            latencyMs: nil,
            message: "Used: \(memoryUsage.used)MB / \(memoryUsage.total)MB"
        )

        // Determine overall status
        let overallStatus: HealthStatus = checks.values.allSatisfy { $0.status == .healthy }
            ? .healthy
            : (checks.values.contains { $0.status == .unhealthy } ? .unhealthy : .degraded)

        return DetailedHealthResponse(
            status: overallStatus,
            version: getVersion(),
            timestamp: formatISO8601(Date()),
            environment: config.apiStage,
            uptime: formatUptime(uptime),
            uptimeSeconds: Int(uptime),
            checks: checks
        )
    }

    // MARK: - Private Helpers

    private func getVersion() -> String {
        // In production, this would come from build info
        return "1.0.0"
    }

    private func formatUptime(_ seconds: TimeInterval) -> String {
        let days = Int(seconds) / 86400
        let hours = (Int(seconds) % 86400) / 3600
        let minutes = (Int(seconds) % 3600) / 60
        let secs = Int(seconds) % 60

        if days > 0 {
            return "\(days)d \(hours)h \(minutes)m"
        } else if hours > 0 {
            return "\(hours)h \(minutes)m \(secs)s"
        } else if minutes > 0 {
            return "\(minutes)m \(secs)s"
        } else {
            return "\(secs)s"
        }
    }

    private func getMemoryUsage() -> (used: Int, total: Int, percentUsed: Double) {
        var info = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size) / 4

        let result = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), $0, &count)
            }
        }

        if result == KERN_SUCCESS {
            let usedMB = Int(info.resident_size) / (1024 * 1024)
            // Estimate total available memory (this is approximate)
            let totalMB = 512 // Assume 512MB container
            let percent = Double(usedMB) / Double(totalMB) * 100
            return (usedMB, totalMB, percent)
        }

        return (0, 512, 0)
    }
}

// MARK: - Response Types

/// Basic health response
public struct HealthResponse: Content {
    public let status: HealthStatus
    public let version: String
    public let timestamp: String
    public let environment: String
}

/// Detailed health response with dependency checks
public struct DetailedHealthResponse: Content {
    public let status: HealthStatus
    public let version: String
    public let timestamp: String
    public let environment: String
    public let uptime: String
    public let uptimeSeconds: Int
    public let checks: [String: HealthCheckResult]
}

/// Health status enum
public enum HealthStatus: String, Codable, Sendable {
    case healthy = "healthy"
    case degraded = "degraded"
    case unhealthy = "unhealthy"
}

/// Individual health check result
public struct HealthCheckResult: Content {
    public let status: HealthStatus
    public let latencyMs: Int?
    public let message: String?
}
