// =============================================================================
// QuarantineService.swift
// LeadCaptureAPI/Services
// =============================================================================
// Spam and suspicious submission detection.
// =============================================================================

import Foundation
import Shared

// MARK: - Quarantine Service

/// Service for detecting spam and suspicious submissions
public struct QuarantineService: Sendable {

    // MARK: - Properties

    private let config: AppConfig

    // MARK: - Initialization

    public init(config: AppConfig = .shared) {
        self.config = config
    }

    // MARK: - Quarantine Detection

    /// Check if a lead should be quarantined
    /// - Parameter request: The create lead request
    /// - Returns: Quarantine result
    public func checkQuarantine(_ request: CreateLeadRequest) -> QuarantineResult {
        guard config.quarantineEnabled else {
            return QuarantineResult(shouldQuarantine: false, reasons: [])
        }

        var reasons: [QuarantineReason] = []

        // Check disposable email
        if QuarantineLists.isDisposableEmail(request.email) {
            reasons.append(.disposableEmail)
        }

        // Check suspicious TLD
        if QuarantineLists.hasSuspiciousTLD(request.email) {
            reasons.append(.suspiciousTLD)
        }

        // Check test email patterns
        if QuarantineLists.isTestEmail(request.email) {
            reasons.append(.testEmail)
        }

        // Check spam patterns in all fields
        let allText = [
            request.email,
            request.name,
            request.company,
            request.notes
        ].compactMap { $0 }.joined(separator: " ")

        let spamPatterns = QuarantineLists.findSpamPatterns(in: allText)
        if !spamPatterns.isEmpty {
            reasons.append(.spamPattern)
        }

        // Check honeypot
        if let website = request.website, !website.isEmpty {
            reasons.append(.honeypotTriggered)
        }

        return QuarantineResult(
            shouldQuarantine: !reasons.isEmpty,
            reasons: reasons,
            spamPatterns: spamPatterns.isEmpty ? nil : Array(spamPatterns.prefix(5))
        )
    }

    /// Check if a lead from the same email should be rate limited
    /// - Parameters:
    ///   - email: The email address
    ///   - existingLeads: Existing leads for this email
    /// - Returns: Whether the submission should be rate limited
    public func checkEmailRateLimit(
        email: String,
        existingLeads: [Lead]
    ) -> (rateLimited: Bool, reason: QuarantineReason?) {
        let today = Calendar.current.startOfDay(for: Date())

        let leadsToday = existingLeads.filter { lead in
            Calendar.current.isDate(lead.createdAt, inSameDayAs: today)
        }

        if leadsToday.count >= ValidationLimits.RateLimit.maxLeadsPerEmailPerDay {
            return (true, .rateLimited)
        }

        return (false, nil)
    }

    /// Check for duplicate submissions
    /// - Parameters:
    ///   - request: The create lead request
    ///   - existingLeads: Existing leads for this email
    /// - Returns: Whether this is a duplicate
    public func checkDuplicate(
        _ request: CreateLeadRequest,
        existingLeads: [Lead]
    ) -> (isDuplicate: Bool, existingLead: Lead?) {
        // Check for exact duplicates within the last hour
        let oneHourAgo = Date().addingTimeInterval(-3600)

        for lead in existingLeads {
            if lead.createdAt > oneHourAgo {
                // Check if it's a near-duplicate
                if isSimilarLead(request: request, existing: lead) {
                    return (true, lead)
                }
            }
        }

        return (false, nil)
    }

    // MARK: - Private Methods

    private func isSimilarLead(request: CreateLeadRequest, existing: Lead) -> Bool {
        // Same email is a given since we're checking within email index

        // Check if name is the same (if provided)
        if let requestName = request.name?.lowercased(),
           let existingName = existing.name?.lowercased(),
           requestName == existingName {
            return true
        }

        // Check if company is the same (if provided)
        if let requestCompany = request.company?.lowercased(),
           let existingCompany = existing.company?.lowercased(),
           requestCompany == existingCompany {
            return true
        }

        // Check if notes are very similar (if provided)
        if let requestNotes = request.notes,
           let existingNotes = existing.notes,
           areSimilarStrings(requestNotes, existingNotes) {
            return true
        }

        return false
    }

    private func areSimilarStrings(_ a: String, _ b: String) -> Bool {
        let normalizedA = a.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedB = b.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)

        // Exact match
        if normalizedA == normalizedB {
            return true
        }

        // Length difference check
        let lengthDiff = abs(normalizedA.count - normalizedB.count)
        let maxLength = max(normalizedA.count, normalizedB.count)
        if maxLength > 0 && Double(lengthDiff) / Double(maxLength) > 0.2 {
            return false
        }

        // Simple similarity check - check if one contains the other
        if normalizedA.count > 10 && normalizedB.count > 10 {
            if normalizedA.contains(normalizedB) || normalizedB.contains(normalizedA) {
                return true
            }
        }

        return false
    }
}

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
