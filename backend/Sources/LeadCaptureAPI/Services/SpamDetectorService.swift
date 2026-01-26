// =============================================================================
// SpamDetectorService.swift
// LeadCaptureAPI/Services
// =============================================================================
// Basic spam detection service for lead submissions.
// =============================================================================

import Foundation
import Crypto
import Shared

// MARK: - Spam Detector Service

/// Service for detecting spam submissions
public struct SpamDetectorService: Sendable {

    // MARK: - Types

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

    /// Spam handling recommendation
    public enum SpamRecommendation: String, Sendable {
        case allow = "allow"
        case quarantine = "quarantine"
        case block = "block"
    }

    /// Detection weights for scoring
    private struct DetectionWeights {
        static let disposableEmail: Double = 0.9
        static let suspiciousTLD: Double = 0.6
        static let spamPattern: Double = 0.7
        static let testEmail: Double = 0.8
        static let honeypot: Double = 1.0
        static let suspiciousUserAgent: Double = 0.5
        static let rapidSubmission: Double = 0.4
        static let gibberishContent: Double = 0.5
        static let excessiveLinks: Double = 0.6
        static let allCaps: Double = 0.3
    }

    // MARK: - Properties

    private let config: AppConfig

    /// Threshold for spam classification
    private let spamThreshold: Double

    /// Cache for recent submissions (for velocity checks)
    private static var recentSubmissions: [String: [Date]] = [:]
    private static let submissionCacheLock = NSLock()

    // MARK: - Initialization

    public init(config: AppConfig = .shared, spamThreshold: Double = 0.7) {
        self.config = config
        self.spamThreshold = spamThreshold
    }

    // MARK: - Analysis

    /// Analyze a submission for spam indicators
    /// - Parameters:
    ///   - email: Email address
    ///   - name: Optional name
    ///   - company: Optional company
    ///   - notes: Optional notes/message
    ///   - ip: Optional IP address
    ///   - userAgent: Optional user agent
    /// - Returns: Spam analysis result
    public func analyze(
        email: String,
        name: String?,
        company: String?,
        notes: String?,
        ip: String?,
        userAgent: String?
    ) -> SpamResult {
        var scores: [String: Double] = [:]
        var reasons: [String] = []
        var totalScore: Double = 0.0

        // 1. Check disposable email domain
        if QuarantineLists.isDisposableEmail(email) {
            scores["disposable_email"] = DetectionWeights.disposableEmail
            reasons.append("Disposable email domain")
            totalScore += DetectionWeights.disposableEmail
        }

        // 2. Check suspicious TLD
        if QuarantineLists.hasSuspiciousTLD(email) {
            scores["suspicious_tld"] = DetectionWeights.suspiciousTLD
            reasons.append("Suspicious top-level domain")
            totalScore += DetectionWeights.suspiciousTLD
        }

        // 3. Check test email patterns
        if QuarantineLists.isTestEmail(email) {
            scores["test_email"] = DetectionWeights.testEmail
            reasons.append("Test email pattern")
            totalScore += DetectionWeights.testEmail
        }

        // 4. Check spam patterns in all text
        let allText = [email, name, company, notes].compactMap { $0 }.joined(separator: " ")
        let spamPatterns = QuarantineLists.findSpamPatterns(in: allText, limit: 5)
        if !spamPatterns.isEmpty {
            scores["spam_patterns"] = DetectionWeights.spamPattern
            reasons.append("Spam patterns: \(spamPatterns.prefix(3).joined(separator: ", "))")
            totalScore += DetectionWeights.spamPattern
        }

        // 5. Check for suspicious user agent
        if let ua = userAgent {
            let uaScore = analyzeUserAgent(ua)
            if uaScore > 0 {
                scores["suspicious_user_agent"] = uaScore
                reasons.append("Suspicious user agent")
                totalScore += uaScore
            }
        }

        // 6. Check for gibberish content
        if let notes = notes, isGibberish(notes) {
            scores["gibberish_content"] = DetectionWeights.gibberishContent
            reasons.append("Gibberish content detected")
            totalScore += DetectionWeights.gibberishContent
        }

        // 7. Check for excessive links
        if let notes = notes {
            let linkCount = countLinks(in: notes)
            if linkCount > 3 {
                scores["excessive_links"] = DetectionWeights.excessiveLinks
                reasons.append("Excessive links (\(linkCount))")
                totalScore += DetectionWeights.excessiveLinks
            }
        }

        // 8. Check for all caps abuse
        if isExcessiveAllCaps(allText) {
            scores["all_caps"] = DetectionWeights.allCaps
            reasons.append("Excessive capitalization")
            totalScore += DetectionWeights.allCaps
        }

        // 9. Check submission velocity (if IP provided)
        if let ip = ip {
            let velocityScore = checkSubmissionVelocity(ip: ip)
            if velocityScore > 0 {
                scores["rapid_submission"] = velocityScore
                reasons.append("Rapid submission detected")
                totalScore += velocityScore
            }
        }

        // Normalize score to 0-1 range
        let maxPossibleScore: Double = 5.0 // Maximum reasonable cumulative score
        let normalizedScore = min(1.0, totalScore / maxPossibleScore)

        // Determine recommendation
        let recommendation: SpamRecommendation
        if normalizedScore >= 0.9 {
            recommendation = .block
        } else if normalizedScore >= spamThreshold {
            recommendation = .quarantine
        } else {
            recommendation = .allow
        }

        return SpamResult(
            isSpam: normalizedScore >= spamThreshold,
            confidence: normalizedScore,
            reasons: reasons,
            scores: scores,
            recommendation: recommendation
        )
    }

    /// Quick check for honeypot trigger
    /// - Parameter honeypotValue: The value of the honeypot field
    /// - Returns: True if honeypot was triggered
    public func isHoneypotTriggered(_ honeypotValue: String?) -> Bool {
        guard let value = honeypotValue else { return false }
        return !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    // MARK: - Private Analysis Methods

    /// Analyze user agent for bot indicators
    private func analyzeUserAgent(_ ua: String) -> Double {
        let lowercased = ua.lowercased()

        // Known bot patterns
        let botPatterns = [
            "bot", "crawler", "spider", "scraper", "curl", "wget",
            "python", "java/", "ruby", "perl", "php/", "go-http",
            "httpunit", "htmlunit", "selenium", "phantomjs", "headless"
        ]

        for pattern in botPatterns {
            if lowercased.contains(pattern) {
                return DetectionWeights.suspiciousUserAgent
            }
        }

        // Empty or very short user agent
        if ua.count < 10 {
            return DetectionWeights.suspiciousUserAgent * 0.5
        }

        return 0
    }

    /// Check if text appears to be gibberish
    private func isGibberish(_ text: String) -> Bool {
        guard text.count > 20 else { return false }

        // Check consonant-to-vowel ratio
        let vowels = CharacterSet(charactersIn: "aeiouAEIOU")
        let consonants = CharacterSet.letters.subtracting(vowels)

        var vowelCount = 0
        var consonantCount = 0

        for char in text.unicodeScalars {
            if vowels.contains(char) {
                vowelCount += 1
            } else if consonants.contains(char) {
                consonantCount += 1
            }
        }

        // Normal English has roughly 40% vowels
        guard vowelCount + consonantCount > 10 else { return false }

        let vowelRatio = Double(vowelCount) / Double(vowelCount + consonantCount)
        if vowelRatio < 0.15 || vowelRatio > 0.6 {
            return true
        }

        // Check for repeated characters
        var maxRepeats = 0
        var currentRepeats = 1
        var lastChar: Character?

        for char in text {
            if char == lastChar {
                currentRepeats += 1
                maxRepeats = max(maxRepeats, currentRepeats)
            } else {
                currentRepeats = 1
            }
            lastChar = char
        }

        return maxRepeats > 4
    }

    /// Count URLs/links in text
    private func countLinks(in text: String) -> Int {
        let patterns = [
            "http://",
            "https://",
            "www.",
            ".com/",
            ".net/",
            ".org/"
        ]

        var count = 0
        let lowercased = text.lowercased()

        for pattern in patterns {
            var searchRange = lowercased.startIndex..<lowercased.endIndex
            while let range = lowercased.range(of: pattern, range: searchRange) {
                count += 1
                searchRange = range.upperBound..<lowercased.endIndex
            }
        }

        return count
    }

    /// Check for excessive capitalization
    private func isExcessiveAllCaps(_ text: String) -> Bool {
        guard text.count > 20 else { return false }

        let uppercaseCount = text.filter { $0.isUppercase }.count
        let letterCount = text.filter { $0.isLetter }.count

        guard letterCount > 10 else { return false }

        let uppercaseRatio = Double(uppercaseCount) / Double(letterCount)
        return uppercaseRatio > 0.7
    }

    /// Check submission velocity from IP
    private func checkSubmissionVelocity(ip: String) -> Double {
        let now = Date()
        let windowStart = now.addingTimeInterval(-60) // 1 minute window

        Self.submissionCacheLock.lock()
        defer { Self.submissionCacheLock.unlock() }

        // Get recent submissions for this IP
        var submissions = Self.recentSubmissions[ip] ?? []

        // Remove old entries
        submissions = submissions.filter { $0 > windowStart }

        // Add current submission
        submissions.append(now)
        Self.recentSubmissions[ip] = submissions

        // Clean up old IPs periodically
        if Self.recentSubmissions.count > 10000 {
            let cutoff = now.addingTimeInterval(-300) // 5 minutes
            Self.recentSubmissions = Self.recentSubmissions.filter { _, dates in
                dates.contains { $0 > cutoff }
            }
        }

        // Score based on submission count in last minute
        switch submissions.count {
        case 1...3:
            return 0
        case 4...5:
            return DetectionWeights.rapidSubmission * 0.5
        case 6...10:
            return DetectionWeights.rapidSubmission
        default:
            return DetectionWeights.rapidSubmission * 1.5
        }
    }

    // MARK: - Hashing Utilities

    /// Hash a value for safe logging
    /// - Parameter value: Value to hash
    /// - Returns: SHA256 hash prefix
    public static func hashForLogging(_ value: String) -> String {
        let data = Data(value.utf8)
        let hash = SHA256.hash(data: data)
        return hash.prefix(8).map { String(format: "%02x", $0) }.joined()
    }
}
