// =============================================================================
// SpamResult.swift
// LeadCaptureAPI/Models
// =============================================================================
// Spam detection analysis result with scoring and recommendations.
// =============================================================================

import Foundation

// MARK: - Spam Result

/// Spam detection result
public struct SpamResult: Sendable {
    /// Whether the submission is considered spam
    public let isSpam: Bool
    /// Confidence score (0.0 - 1.0)
    public let confidence: Double
    /// Reasons for spam classification
    public let reasons: [String]
    /// Individual check scores
    public let scores: [String: Double]
    /// Recommendation (allow, quarantine, block)
    public let recommendation: SpamRecommendation
}

// MARK: - Spam Recommendation

/// Spam handling recommendation
public enum SpamRecommendation: String, Sendable {
    case allow = "allow"
    case quarantine = "quarantine"
    case block = "block"
}
