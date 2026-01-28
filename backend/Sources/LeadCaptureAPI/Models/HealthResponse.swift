// =============================================================================
// HealthResponse.swift
// LeadCaptureAPI/Models
// =============================================================================
// Response types for health check endpoints.
// =============================================================================

import Foundation
import Vapor

// MARK: - Health Response

/// Basic health response
public struct HealthResponse: Content {
    public let status: HealthStatus
    public let version: String
    public let timestamp: String
    public let environment: String
}

// MARK: - Detailed Health Response

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

// MARK: - Health Status

/// Health status enum
public enum HealthStatus: String, Codable, Sendable {
    case healthy = "healthy"
    case degraded = "degraded"
    case unhealthy = "unhealthy"
}

// MARK: - Health Check Result

/// Individual health check result
public struct HealthCheckResult: Content {
    public let status: HealthStatus
    public let latencyMs: Int?
    public let message: String?
}
