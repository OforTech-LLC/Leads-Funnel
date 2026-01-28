// =============================================================================
// EntityType.swift
// Shared/Types
// =============================================================================
// DynamoDB entity types for single-table design with key prefixes.
// =============================================================================

import Foundation

// MARK: - DynamoDB Entity Types

/// Entity types for single-table design
public enum EntityType: String, Codable, Sendable {
    case lead = "LEAD"
    case rateLimit = "RATE_LIMIT"
    case idempotency = "IDEMPOTENCY"
    case emailIndex = "EMAIL_INDEX"
    case auditLog = "AUDIT_LOG"

    /// Prefix for partition key
    public var pkPrefix: String {
        switch self {
        case .lead: return "LEAD#"
        case .rateLimit: return "RATELIMIT#"
        case .idempotency: return "IDEMPOTENCY#"
        case .emailIndex: return "EMAIL#"
        case .auditLog: return "AUDIT#"
        }
    }

    /// Prefix for sort key
    public var skPrefix: String {
        switch self {
        case .lead: return "METADATA#"
        case .rateLimit: return "WINDOW#"
        case .idempotency: return "KEY#"
        case .emailIndex: return "LEAD#"
        case .auditLog: return "LOG#"
        }
    }
}
