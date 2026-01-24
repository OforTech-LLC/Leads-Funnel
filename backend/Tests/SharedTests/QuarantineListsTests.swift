// =============================================================================
// QuarantineListsTests.swift
// SharedTests
// =============================================================================
// Tests for QuarantineLists functionality.
// =============================================================================

import Foundation
import Testing
@testable import Shared

@Suite("QuarantineLists Tests")
struct QuarantineListsTests {

    // MARK: - Disposable Email Tests

    @Test("Identifies disposable email domains")
    func isDisposableEmail_withDisposableEmail_returnsTrue() {
        let disposableEmails = [
            "test@mailinator.com",
            "user@10minutemail.com",
            "spam@guerrillamail.com",
            "temp@yopmail.com",
            "fake@tempmail.com"
        ]

        for email in disposableEmails {
            #expect(
                QuarantineLists.isDisposableEmail(email),
                "Expected \(email) to be identified as disposable"
            )
        }
    }

    @Test("Does not flag legitimate email domains")
    func isDisposableEmail_withLegitimateEmail_returnsFalse() {
        let legitimateEmails = [
            "user@gmail.com",
            "business@company.com",
            "contact@example.org",
            "info@startup.io",
            "hello@domain.co"
        ]

        for email in legitimateEmails {
            #expect(
                !QuarantineLists.isDisposableEmail(email),
                "Expected \(email) to not be identified as disposable"
            )
        }
    }

    @Test("Disposable email check is case insensitive")
    func isDisposableEmail_caseInsensitive() {
        #expect(QuarantineLists.isDisposableEmail("TEST@MAILINATOR.COM"))
        #expect(QuarantineLists.isDisposableEmail("User@Yopmail.Com"))
    }

    // MARK: - Suspicious TLD Tests

    @Test("Identifies suspicious TLDs")
    func hasSuspiciousTLD_withSuspiciousTLD_returnsTrue() {
        let suspiciousEmails = [
            "user@domain.xyz",
            "contact@site.top",
            "info@page.win",
            "hello@service.loan"
        ]

        for email in suspiciousEmails {
            #expect(
                QuarantineLists.hasSuspiciousTLD(email),
                "Expected \(email) to have suspicious TLD"
            )
        }
    }

    @Test("Does not flag normal TLDs")
    func hasSuspiciousTLD_withNormalTLD_returnsFalse() {
        let normalEmails = [
            "user@domain.com",
            "contact@site.org",
            "info@page.net",
            "hello@service.io"
        ]

        for email in normalEmails {
            #expect(
                !QuarantineLists.hasSuspiciousTLD(email),
                "Expected \(email) to not have suspicious TLD"
            )
        }
    }

    // MARK: - Spam Pattern Tests

    @Test("Finds spam patterns in text")
    func findSpamPatterns_withSpamText_returnsMatches() {
        let spamTexts: [(String, [String])] = [
            ("I won the lottery prize!", ["lottery", "prize"]),
            ("Free money for everyone", ["free money"]),
            ("Click here for bitcoin investment", ["click here", "bitcoin"])
        ]

        for (text, expectedPatterns) in spamTexts {
            let found = QuarantineLists.findSpamPatterns(in: text)
            for pattern in expectedPatterns {
                #expect(
                    found.contains(where: { $0.lowercased().contains(pattern.lowercased()) }),
                    "Expected to find '\(pattern)' in '\(text)'"
                )
            }
        }
    }

    @Test("Returns empty for clean text")
    func findSpamPatterns_withCleanText_returnsEmpty() {
        let cleanTexts = [
            "I'm interested in your product",
            "Please contact me about services",
            "Looking forward to hearing from you"
        ]

        for text in cleanTexts {
            let found = QuarantineLists.findSpamPatterns(in: text)
            #expect(found.isEmpty, "Expected no spam patterns in '\(text)', but found \(found)")
        }
    }

    // MARK: - Test Email Pattern Tests

    @Test("Identifies test email patterns")
    func isTestEmail_withTestPattern_returnsTrue() {
        let testEmails = [
            "test@test.com",
            "test@example.com",
            "foo@bar.com",
            "asdf@asdf.net",
            "user@mailinator.com"
        ]

        for email in testEmails {
            #expect(
                QuarantineLists.isTestEmail(email),
                "Expected \(email) to be identified as test email"
            )
        }
    }

    @Test("Does not flag real emails as test")
    func isTestEmail_withRealEmail_returnsFalse() {
        let realEmails = [
            "john.doe@company.com",
            "sarah@startup.io",
            "info@business.org"
        ]

        for email in realEmails {
            #expect(
                !QuarantineLists.isTestEmail(email),
                "Expected \(email) to not be identified as test email"
            )
        }
    }

    // MARK: - Comprehensive Quarantine Check Tests

    @Test("Quarantine check returns all reasons for suspicious submission")
    func shouldQuarantine_withMultipleFlags_returnsAllReasons() {
        // test@mailinator.com triggers: disposable_email_domain + test_email_pattern
        // The notes with "Click here for prize" triggers spam_patterns
        let result = QuarantineLists.shouldQuarantine(
            email: "test@mailinator.com",
            name: "Free Money Winner",
            company: nil,
            notes: "Click here for prize"
        )

        #expect(result.quarantine)
        #expect(result.reasons.contains("disposable_email_domain"))
        #expect(result.reasons.contains("test_email_pattern"))
        #expect(result.reasons.contains(where: { $0.hasPrefix("spam_patterns:") }))
    }

    @Test("Suspicious TLD is detected in quarantine check")
    func shouldQuarantine_withSuspiciousTLD_returnsSuspiciousTLD() {
        let result = QuarantineLists.shouldQuarantine(
            email: "user@domain.xyz",
            name: nil,
            company: nil,
            notes: nil
        )

        #expect(result.quarantine)
        #expect(result.reasons.contains("suspicious_tld"))
    }

    @Test("Quarantine check returns false for clean submission")
    func shouldQuarantine_withCleanSubmission_returnsFalse() {
        let result = QuarantineLists.shouldQuarantine(
            email: "john@company.com",
            name: "John Smith",
            company: "Acme Corp",
            notes: "Interested in your services"
        )

        #expect(!result.quarantine)
        #expect(result.reasons.isEmpty)
    }
}
