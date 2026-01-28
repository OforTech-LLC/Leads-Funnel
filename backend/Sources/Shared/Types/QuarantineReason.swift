// =============================================================================
// QuarantineReason.swift
// Shared/Types
// =============================================================================
// Reasons for quarantining a lead with severity scoring.
// =============================================================================

import Foundation

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
