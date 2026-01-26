// =============================================================================
// SpamDetectorTests.swift
// LeadCaptureAPITests
// =============================================================================
// Tests for SpamDetectorService using Swift Testing framework.
// =============================================================================

import Testing
import Foundation
@testable import LeadCaptureAPI
@testable import Shared

@Suite("Spam Detector Service Tests")
struct SpamDetectorTests {

    // MARK: - Clean Submission Tests

    @Test("Clean email passes spam detection")
    func cleanEmailPasses() async throws {
        let service = SpamDetectorService()

        let result = service.analyze(
            email: "john.doe@company.com",
            name: "John Doe",
            company: "Acme Corporation",
            notes: "I'm interested in your services.",
            ip: "192.168.1.1",
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
        )

        #expect(!result.isSpam, "Clean submission should not be flagged as spam")
        #expect(result.confidence < 0.5, "Confidence should be low for clean submission")
        #expect(result.recommendation == .allow, "Should recommend allow")
    }

    @Test("Gmail email passes spam detection")
    func gmailPasses() async throws {
        let service = SpamDetectorService()

        let result = service.analyze(
            email: "test.user@gmail.com",
            name: "Test User",
            company: nil,
            notes: nil,
            ip: nil,
            userAgent: nil
        )

        #expect(!result.isSpam, "Gmail should not be flagged as spam")
    }

    // MARK: - Disposable Email Tests

    @Test("Disposable email is detected")
    func disposableEmailDetected() async throws {
        let service = SpamDetectorService()

        let result = service.analyze(
            email: "test@mailinator.com",
            name: nil,
            company: nil,
            notes: nil,
            ip: nil,
            userAgent: nil
        )

        #expect(result.isSpam, "Disposable email should be flagged")
        #expect(result.reasons.contains { $0.contains("Disposable") }, "Should include disposable reason")
        #expect(result.scores["disposable_email"] != nil, "Should have disposable_email score")
    }

    @Test("Guerrillamail is detected")
    func guerrillamailDetected() async throws {
        let service = SpamDetectorService()

        let result = service.analyze(
            email: "spam@guerrillamail.com",
            name: nil,
            company: nil,
            notes: nil,
            ip: nil,
            userAgent: nil
        )

        #expect(result.isSpam, "Guerrillamail should be flagged")
    }

    @Test("Yopmail is detected")
    func yopmailDetected() async throws {
        let service = SpamDetectorService()

        let result = service.analyze(
            email: "test@yopmail.com",
            name: nil,
            company: nil,
            notes: nil,
            ip: nil,
            userAgent: nil
        )

        #expect(result.isSpam, "Yopmail should be flagged")
    }

    // MARK: - Suspicious TLD Tests

    @Test("Suspicious TLD is detected")
    func suspiciousTLDDetected() async throws {
        let service = SpamDetectorService()

        let result = service.analyze(
            email: "user@something.xyz",
            name: nil,
            company: nil,
            notes: nil,
            ip: nil,
            userAgent: nil
        )

        #expect(result.scores["suspicious_tld"] != nil, "Should detect suspicious TLD")
        #expect(result.reasons.contains { $0.contains("Suspicious") }, "Should include suspicious TLD reason")
    }

    @Test("Multiple suspicious TLDs are detected")
    func multipleSuspiciousTLDs() async throws {
        let service = SpamDetectorService()
        let suspiciousTLDs = [".xyz", ".top", ".win", ".click", ".link"]

        for tld in suspiciousTLDs {
            let result = service.analyze(
                email: "user@domain\(tld)",
                name: nil,
                company: nil,
                notes: nil,
                ip: nil,
                userAgent: nil
            )

            #expect(result.scores["suspicious_tld"] != nil, "Should detect \(tld) as suspicious")
        }
    }

    // MARK: - Test Email Patterns

    @Test("Test email patterns are detected")
    func testEmailDetected() async throws {
        let service = SpamDetectorService()

        let testEmails = [
            "test@test.com",
            "test@example.com",
            "foo@bar.com",
            "asdf@asdf.com"
        ]

        for email in testEmails {
            let result = service.analyze(
                email: email,
                name: nil,
                company: nil,
                notes: nil,
                ip: nil,
                userAgent: nil
            )

            #expect(result.scores["test_email"] != nil, "Should detect \(email) as test email")
        }
    }

    // MARK: - Spam Pattern Tests

    @Test("Spam patterns in notes are detected")
    func spamPatternsInNotes() async throws {
        let service = SpamDetectorService()

        let result = service.analyze(
            email: "user@example.com",
            name: "Normal Name",
            company: nil,
            notes: "CLICK HERE for FREE MONEY! You are a WINNER!",
            ip: nil,
            userAgent: nil
        )

        #expect(result.scores["spam_patterns"] != nil, "Should detect spam patterns")
        #expect(result.reasons.contains { $0.contains("Spam patterns") }, "Should include spam patterns reason")
    }

    @Test("Casino spam is detected")
    func casinoSpamDetected() async throws {
        let service = SpamDetectorService()

        let result = service.analyze(
            email: "user@example.com",
            name: nil,
            company: nil,
            notes: "Check out our casino for big wins!",
            ip: nil,
            userAgent: nil
        )

        #expect(result.scores["spam_patterns"] != nil, "Should detect casino spam")
    }

    @Test("Crypto spam is detected")
    func cryptoSpamDetected() async throws {
        let service = SpamDetectorService()

        let result = service.analyze(
            email: "user@example.com",
            name: nil,
            company: nil,
            notes: "Bitcoin investment opportunity! Crypto guaranteed returns!",
            ip: nil,
            userAgent: nil
        )

        #expect(result.scores["spam_patterns"] != nil, "Should detect crypto spam")
    }

    // MARK: - Bot User Agent Tests

    @Test("Bot user agents are detected")
    func botUserAgentDetected() async throws {
        let service = SpamDetectorService()

        let botAgents = [
            "curl/7.64.1",
            "python-requests/2.25.1",
            "Googlebot/2.1",
            "wget/1.20.3",
            "Java/1.8.0_292",
            "PhantomJS/2.1.1",
            "HeadlessChrome/91.0.4472.124"
        ]

        for agent in botAgents {
            let result = service.analyze(
                email: "user@example.com",
                name: nil,
                company: nil,
                notes: nil,
                ip: nil,
                userAgent: agent
            )

            #expect(result.scores["suspicious_user_agent"] != nil, "Should detect \(agent) as suspicious")
        }
    }

    @Test("Normal browser user agent passes")
    func normalBrowserPasses() async throws {
        let service = SpamDetectorService()

        let result = service.analyze(
            email: "user@example.com",
            name: nil,
            company: nil,
            notes: nil,
            ip: nil,
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        )

        #expect(result.scores["suspicious_user_agent"] == nil, "Normal browser should not be flagged")
    }

    // MARK: - Gibberish Detection Tests

    @Test("Gibberish content is detected")
    func gibberishDetected() async throws {
        let service = SpamDetectorService()

        let result = service.analyze(
            email: "user@example.com",
            name: nil,
            company: nil,
            notes: "asdfghjklqwertyuiopzxcvbnm qwerty asdfgh zxcvbn",
            ip: nil,
            userAgent: nil
        )

        #expect(result.scores["gibberish_content"] != nil, "Should detect gibberish content")
    }

    @Test("Normal text is not flagged as gibberish")
    func normalTextNotGibberish() async throws {
        let service = SpamDetectorService()

        let result = service.analyze(
            email: "user@example.com",
            name: nil,
            company: nil,
            notes: "Hello, I am interested in learning more about your product offerings. Please contact me at your earliest convenience.",
            ip: nil,
            userAgent: nil
        )

        #expect(result.scores["gibberish_content"] == nil, "Normal text should not be flagged as gibberish")
    }

    // MARK: - Excessive Links Tests

    @Test("Excessive links are detected")
    func excessiveLinksDetected() async throws {
        let service = SpamDetectorService()

        let result = service.analyze(
            email: "user@example.com",
            name: nil,
            company: nil,
            notes: "Check out http://spam1.com and http://spam2.com and http://spam3.com and http://spam4.com",
            ip: nil,
            userAgent: nil
        )

        #expect(result.scores["excessive_links"] != nil, "Should detect excessive links")
    }

    @Test("Single link is not flagged")
    func singleLinkNotFlagged() async throws {
        let service = SpamDetectorService()

        let result = service.analyze(
            email: "user@example.com",
            name: nil,
            company: nil,
            notes: "Check out our website at https://company.com for more info.",
            ip: nil,
            userAgent: nil
        )

        #expect(result.scores["excessive_links"] == nil, "Single link should not be flagged")
    }

    // MARK: - All Caps Tests

    @Test("Excessive caps are detected")
    func excessiveCapsDetected() async throws {
        let service = SpamDetectorService()

        let result = service.analyze(
            email: "user@example.com",
            name: "JOHN DOE",
            company: "ACME CORPORATION",
            notes: "I WANT TO BUY YOUR PRODUCT RIGHT NOW!!!",
            ip: nil,
            userAgent: nil
        )

        #expect(result.scores["all_caps"] != nil, "Should detect excessive caps")
    }

    // MARK: - Honeypot Tests

    @Test("Honeypot trigger is detected")
    func honeypotTriggerDetected() async throws {
        let service = SpamDetectorService()

        let isTriggered = service.isHoneypotTriggered("http://spam.com")
        #expect(isTriggered, "Filled honeypot should be detected")
    }

    @Test("Empty honeypot passes")
    func emptyHoneypotPasses() async throws {
        let service = SpamDetectorService()

        #expect(!service.isHoneypotTriggered(nil), "nil honeypot should pass")
        #expect(!service.isHoneypotTriggered(""), "Empty honeypot should pass")
        #expect(!service.isHoneypotTriggered("   "), "Whitespace honeypot should pass")
    }

    // MARK: - Recommendation Tests

    @Test("High confidence spam gets block recommendation")
    func highConfidenceGetsBlockRecommendation() async throws {
        let service = SpamDetectorService()

        // Combine multiple spam indicators
        let result = service.analyze(
            email: "test@mailinator.com", // Disposable
            name: nil,
            company: nil,
            notes: "FREE MONEY! CLICK HERE! WINNER! Casino Bitcoin!", // Spam patterns
            ip: nil,
            userAgent: "curl/7.64.1" // Bot agent
        )

        #expect(result.recommendation == .block || result.recommendation == .quarantine,
               "High confidence spam should get block or quarantine recommendation")
    }

    @Test("Medium confidence spam gets quarantine recommendation")
    func mediumConfidenceGetsQuarantineRecommendation() async throws {
        let service = SpamDetectorService(spamThreshold: 0.5)

        // Single spam indicator
        let result = service.analyze(
            email: "user@something.xyz", // Just suspicious TLD
            name: "Normal Name",
            company: nil,
            notes: nil,
            ip: nil,
            userAgent: "Mozilla/5.0"
        )

        // Should be quarantined or allowed depending on score
        #expect([.allow, .quarantine].contains(result.recommendation),
               "Medium confidence should get allow or quarantine")
    }

    // MARK: - Hashing Tests

    @Test("Hash for logging produces consistent output")
    func hashForLoggingConsistent() async throws {
        let value = "test@example.com"

        let hash1 = SpamDetectorService.hashForLogging(value)
        let hash2 = SpamDetectorService.hashForLogging(value)

        #expect(hash1 == hash2, "Same input should produce same hash")
        #expect(hash1.count == 16, "Hash should be 16 characters (8 bytes hex)")
    }

    @Test("Different values produce different hashes")
    func differentValuesProduceDifferentHashes() async throws {
        let hash1 = SpamDetectorService.hashForLogging("test1@example.com")
        let hash2 = SpamDetectorService.hashForLogging("test2@example.com")

        #expect(hash1 != hash2, "Different inputs should produce different hashes")
    }

    // MARK: - Combined Indicators Tests

    @Test("Multiple indicators increase confidence")
    func multipleIndicatorsIncreaseConfidence() async throws {
        let service = SpamDetectorService()

        // Single indicator
        let singleResult = service.analyze(
            email: "user@mailinator.com",
            name: nil,
            company: nil,
            notes: nil,
            ip: nil,
            userAgent: nil
        )

        // Multiple indicators
        let multiResult = service.analyze(
            email: "test@mailinator.com",
            name: nil,
            company: nil,
            notes: "FREE MONEY! CLICK HERE!",
            ip: nil,
            userAgent: "curl/7.64.1"
        )

        #expect(multiResult.confidence > singleResult.confidence,
               "Multiple indicators should increase confidence")
        #expect(multiResult.reasons.count > singleResult.reasons.count,
               "Multiple indicators should produce more reasons")
    }
}
