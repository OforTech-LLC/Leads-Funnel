// =============================================================================
// QuarantineResult.swift
// LeadCaptureAPI/Models
// =============================================================================
// Result of quarantine check with reasons and severity scoring.
// =============================================================================

import Foundation
import Shared

// MARK: - Quarantine Result

/// Result of quarantine check
public struct QuarantineResult: Sendable {
    /// Whether the lead should be quarantined
    public let shouldQuarantine: Bool

    /// Reasons for quarantine
    public let reasons: [QuarantineReason]

    /// Specific spam patterns detected
    public let spamPatterns: [String]?

    public init(
        shouldQuarantine: Bool,
        reasons: [QuarantineReason],
        spamPatterns: [String]? = nil
    ) {
        self.shouldQuarantine = shouldQuarantine
        self.reasons = reasons
        self.spamPatterns = spamPatterns
    }

    /// Get reason strings for storage
    public var reasonStrings: [String] {
        var strings = reasons.map { $0.rawValue }
        if let patterns = spamPatterns, !patterns.isEmpty {
            strings.append("patterns:\(patterns.joined(separator: ","))")
        }
        return strings
    }

    /// Get human-readable description
    public var description: String {
        if reasons.isEmpty {
            return "No issues detected"
        }
        return reasons.map { $0.description }.joined(separator: "; ")
    }

    /// Get the highest severity level
    public var maxSeverity: Int {
        return reasons.map { $0.severity }.max() ?? 0
    }
}
