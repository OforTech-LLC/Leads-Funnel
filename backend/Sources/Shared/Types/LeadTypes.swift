// =============================================================================
// LeadTypes.swift
// Shared/Types
// =============================================================================
// Common types and enums for lead management.
// =============================================================================

import Foundation

// MARK: - Lead Status

/// Status of a lead in the system
public enum LeadStatus: String, Codable, CaseIterable, Sendable {
    /// New lead, not yet processed
    case new = "NEW"
    /// Lead has been contacted
    case contacted = "CONTACTED"
    /// Lead is qualified and engaged
    case qualified = "QUALIFIED"
    /// Lead converted to customer
    case converted = "CONVERTED"
    /// Lead is not interested or unresponsive
    case closed = "CLOSED"
    /// Lead flagged for review (spam/suspicious)
    case quarantined = "QUARANTINED"

    /// Human-readable description
    public var description: String {
        switch self {
        case .new: return "New Lead"
        case .contacted: return "Contacted"
        case .qualified: return "Qualified"
        case .converted: return "Converted"
        case .closed: return "Closed"
        case .quarantined: return "Quarantined"
        }
    }

    /// Whether this status represents an active lead
    public var isActive: Bool {
        switch self {
        case .new, .contacted, .qualified:
            return true
        case .converted, .closed, .quarantined:
            return false
        }
    }
}

// MARK: - Lead Source

/// Source of the lead
public enum LeadSource: String, Codable, CaseIterable, Sendable {
    case website = "WEBSITE"
    case landingPage = "LANDING_PAGE"
    case referral = "REFERRAL"
    case api = "API"
    case `import` = "IMPORT"
    case manual = "MANUAL"
    case social = "SOCIAL"
    case emailCampaign = "EMAIL_CAMPAIGN"
    case paidAds = "PAID_ADS"
    case organic = "ORGANIC"
    case partner = "PARTNER"
    case event = "EVENT"

    /// Initialize from string (case-insensitive)
    public init?(string: String) {
        let normalized = string.uppercased().replacingOccurrences(of: "-", with: "_")
        self.init(rawValue: normalized)
    }

    /// Human-readable description
    public var description: String {
        switch self {
        case .website: return "Website"
        case .landingPage: return "Landing Page"
        case .referral: return "Referral"
        case .api: return "API"
        case .import: return "Import"
        case .manual: return "Manual Entry"
        case .social: return "Social Media"
        case .emailCampaign: return "Email Campaign"
        case .paidAds: return "Paid Advertising"
        case .organic: return "Organic Search"
        case .partner: return "Partner"
        case .event: return "Event"
        }
    }
}

// MARK: - Event Types

/// Types of events emitted to EventBridge
public enum LeadEventType: String, Codable, Sendable {
    case created = "lead.created"
    case updated = "lead.updated"
    case statusChanged = "lead.status_changed"
    case quarantined = "lead.quarantined"
    case converted = "lead.converted"
    case deleted = "lead.deleted"

    /// EventBridge detail type
    public var detailType: String {
        return rawValue
    }
}

// MARK: - Quarantine Reason

/// Reasons for quarantining a lead
public enum QuarantineReason: String, Codable, CaseIterable, Sendable {
    case disposableEmail = "DISPOSABLE_EMAIL"
    case suspiciousTLD = "SUSPICIOUS_TLD"
    case spamPattern = "SPAM_PATTERN"
    case testEmail = "TEST_EMAIL"
    case rateLimited = "RATE_LIMITED"
    case duplicateSubmission = "DUPLICATE_SUBMISSION"
    case invalidData = "INVALID_DATA"
    case blacklistedDomain = "BLACKLISTED_DOMAIN"
    case honeypotTriggered = "HONEYPOT_TRIGGERED"
    case botDetected = "BOT_DETECTED"

    /// Human-readable description
    public var description: String {
        switch self {
        case .disposableEmail: return "Disposable email domain detected"
        case .suspiciousTLD: return "Suspicious top-level domain"
        case .spamPattern: return "Spam patterns in submission"
        case .testEmail: return "Test email pattern detected"
        case .rateLimited: return "Rate limit exceeded"
        case .duplicateSubmission: return "Duplicate submission detected"
        case .invalidData: return "Invalid data format"
        case .blacklistedDomain: return "Blacklisted domain"
        case .honeypotTriggered: return "Honeypot field triggered"
        case .botDetected: return "Bot behavior detected"
        }
    }

    /// Severity level (1-5, 5 being most severe)
    public var severity: Int {
        switch self {
        case .testEmail, .duplicateSubmission: return 1
        case .rateLimited, .invalidData: return 2
        case .disposableEmail, .suspiciousTLD: return 3
        case .spamPattern, .honeypotTriggered: return 4
        case .blacklistedDomain, .botDetected: return 5
        }
    }
}

// MARK: - API Error Codes

/// API error codes for client responses
public enum APIErrorCode: String, Codable, Sendable {
    // Validation errors (400)
    case invalidEmail = "INVALID_EMAIL"
    case invalidPhone = "INVALID_PHONE"
    case invalidName = "INVALID_NAME"
    case invalidSource = "INVALID_SOURCE"
    case missingRequiredField = "MISSING_REQUIRED_FIELD"
    case fieldTooLong = "FIELD_TOO_LONG"
    case invalidFormat = "INVALID_FORMAT"

    // Rate limiting (429)
    case rateLimitExceeded = "RATE_LIMIT_EXCEEDED"
    case burstLimitExceeded = "BURST_LIMIT_EXCEEDED"

    // Conflict (409)
    case duplicateLead = "DUPLICATE_LEAD"
    case idempotencyConflict = "IDEMPOTENCY_CONFLICT"

    // Server errors (500)
    case internalError = "INTERNAL_ERROR"
    case databaseError = "DATABASE_ERROR"
    case eventPublishError = "EVENT_PUBLISH_ERROR"

    // Authentication (401/403)
    case unauthorized = "UNAUTHORIZED"
    case forbidden = "FORBIDDEN"

    /// HTTP status code for this error
    public var httpStatus: Int {
        switch self {
        case .invalidEmail, .invalidPhone, .invalidName, .invalidSource,
             .missingRequiredField, .fieldTooLong, .invalidFormat:
            return 400
        case .rateLimitExceeded, .burstLimitExceeded:
            return 429
        case .duplicateLead, .idempotencyConflict:
            return 409
        case .internalError, .databaseError, .eventPublishError:
            return 500
        case .unauthorized:
            return 401
        case .forbidden:
            return 403
        }
    }
}

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

// MARK: - Timestamp Helpers

/// ISO8601 date formatter for API responses
public let iso8601Formatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
}()

/// Format date to ISO8601 string
public func formatISO8601(_ date: Date) -> String {
    return iso8601Formatter.string(from: date)
}

/// Parse ISO8601 string to date
public func parseISO8601(_ string: String) -> Date? {
    return iso8601Formatter.date(from: string)
}
