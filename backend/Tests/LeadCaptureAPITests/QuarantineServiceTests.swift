// =============================================================================
// QuarantineServiceTests.swift
// LeadCaptureAPITests
// =============================================================================
// Tests for QuarantineService.
// =============================================================================

import Foundation
import Testing
@testable import LeadCaptureAPI
@testable import Shared

@Suite("QuarantineService Tests")
struct QuarantineServiceTests {

    let quarantineService = QuarantineService()

    // MARK: - Clean Submission Tests

    @Test("Clean submission returns no quarantine")
    func checkQuarantine_withCleanSubmission_returnsNoQuarantine() {
        let request = CreateLeadRequest(
            email: "user@company.com",
            name: "John Smith",
            company: "Acme Corp",
            notes: "Interested in your services"
        )

        let result = quarantineService.checkQuarantine(request)

        #expect(!result.shouldQuarantine)
        #expect(result.reasons.isEmpty)
    }

    // MARK: - Disposable Email Tests

    @Test("Disposable email triggers quarantine")
    func checkQuarantine_withDisposableEmail_returnsQuarantine() {
        let request = CreateLeadRequest(
            email: "user@mailinator.com"
        )

        let result = quarantineService.checkQuarantine(request)

        #expect(result.shouldQuarantine)
        #expect(result.reasons.contains(.disposableEmail))
    }

    // MARK: - Suspicious TLD Tests

    @Test("Suspicious TLD triggers quarantine")
    func checkQuarantine_withSuspiciousTLD_returnsQuarantine() {
        let request = CreateLeadRequest(
            email: "user@domain.xyz"
        )

        let result = quarantineService.checkQuarantine(request)

        #expect(result.shouldQuarantine)
        #expect(result.reasons.contains(.suspiciousTLD))
    }

    // MARK: - Test Email Tests

    @Test("Test email triggers quarantine")
    func checkQuarantine_withTestEmail_returnsQuarantine() {
        let request = CreateLeadRequest(
            email: "test@test.com"
        )

        let result = quarantineService.checkQuarantine(request)

        #expect(result.shouldQuarantine)
        #expect(result.reasons.contains(.testEmail))
    }

    // MARK: - Spam Pattern Tests

    @Test("Spam in notes triggers quarantine")
    func checkQuarantine_withSpamInNotes_returnsQuarantine() {
        let request = CreateLeadRequest(
            email: "user@company.com",
            notes: "Click here for free money and bitcoin prizes!"
        )

        let result = quarantineService.checkQuarantine(request)

        #expect(result.shouldQuarantine)
        #expect(result.reasons.contains(.spamPattern))
        #expect(result.spamPatterns != nil)
    }

    @Test("Spam in name triggers quarantine")
    func checkQuarantine_withSpamInName_returnsQuarantine() {
        let request = CreateLeadRequest(
            email: "user@company.com",
            name: "Lottery Winner"
        )

        let result = quarantineService.checkQuarantine(request)

        #expect(result.shouldQuarantine)
        #expect(result.reasons.contains(.spamPattern))
    }

    // MARK: - Honeypot Tests

    @Test("Honeypot field triggers quarantine")
    func checkQuarantine_withHoneypot_returnsQuarantine() {
        let request = CreateLeadRequest(
            email: "user@company.com",
            website: "https://spam.com"
        )

        let result = quarantineService.checkQuarantine(request)

        #expect(result.shouldQuarantine)
        #expect(result.reasons.contains(.honeypotTriggered))
    }

    // MARK: - Multiple Reasons Tests

    @Test("Multiple issues return all reasons")
    func checkQuarantine_withMultipleIssues_returnsAllReasons() {
        // test@mailinator.com triggers: disposableEmail + testEmail
        // "Free Money Winner" triggers: spamPattern
        // website filled triggers: honeypotTriggered
        let request = CreateLeadRequest(
            email: "test@mailinator.com",
            name: "Free Money Winner",
            website: "spam"
        )

        let result = quarantineService.checkQuarantine(request)

        #expect(result.shouldQuarantine)
        #expect(result.reasons.count >= 3)
        #expect(result.reasons.contains(.disposableEmail))
        #expect(result.reasons.contains(.testEmail))
        #expect(result.reasons.contains(.honeypotTriggered))
    }

    // MARK: - Email Rate Limit Tests

    @Test("Within rate limit returns not limited")
    func checkEmailRateLimit_withinLimit_returnsNotLimited() {
        let existingLeads = [
            createMockLead(createdAt: Date()),
            createMockLead(createdAt: Date())
        ]

        let result = quarantineService.checkEmailRateLimit(
            email: "user@example.com",
            existingLeads: existingLeads
        )

        #expect(!result.rateLimited)
        #expect(result.reason == nil)
    }

    @Test("Exceeding rate limit returns limited")
    func checkEmailRateLimit_exceedsLimit_returnsLimited() {
        let existingLeads = [
            createMockLead(createdAt: Date()),
            createMockLead(createdAt: Date()),
            createMockLead(createdAt: Date())
        ]

        let result = quarantineService.checkEmailRateLimit(
            email: "user@example.com",
            existingLeads: existingLeads
        )

        #expect(result.rateLimited)
        #expect(result.reason == .rateLimited)
    }

    @Test("Old leads not counted in rate limit")
    func checkEmailRateLimit_oldLeadsNotCounted() {
        let yesterday = Calendar.current.date(byAdding: .day, value: -1, to: Date())!
        let existingLeads = [
            createMockLead(createdAt: yesterday),
            createMockLead(createdAt: yesterday),
            createMockLead(createdAt: yesterday),
            createMockLead(createdAt: yesterday)
        ]

        let result = quarantineService.checkEmailRateLimit(
            email: "user@example.com",
            existingLeads: existingLeads
        )

        #expect(!result.rateLimited)
    }

    // MARK: - Duplicate Check Tests

    @Test("Recent duplicate returns true")
    func checkDuplicate_withRecentDuplicate_returnsTrue() {
        let existingLead = createMockLead(
            name: "John Doe",
            createdAt: Date().addingTimeInterval(-1800) // 30 minutes ago
        )

        let request = CreateLeadRequest(
            email: "user@example.com",
            name: "John Doe"
        )

        let result = quarantineService.checkDuplicate(request, existingLeads: [existingLead])

        #expect(result.isDuplicate)
        #expect(result.existingLead != nil)
    }

    @Test("Old submission returns false")
    func checkDuplicate_withOldSubmission_returnsFalse() {
        let existingLead = createMockLead(
            name: "John Doe",
            createdAt: Date().addingTimeInterval(-7200) // 2 hours ago
        )

        let request = CreateLeadRequest(
            email: "user@example.com",
            name: "John Doe"
        )

        let result = quarantineService.checkDuplicate(request, existingLeads: [existingLead])

        #expect(!result.isDuplicate)
    }

    @Test("Different data returns false")
    func checkDuplicate_withDifferentData_returnsFalse() {
        let existingLead = createMockLead(
            name: "Jane Smith",
            company: "Other Corp",
            createdAt: Date().addingTimeInterval(-1800)
        )

        let request = CreateLeadRequest(
            email: "user@example.com",
            name: "John Doe",
            company: "Acme Corp"
        )

        let result = quarantineService.checkDuplicate(request, existingLeads: [existingLead])

        #expect(!result.isDuplicate)
    }

    // MARK: - Result Properties Tests

    @Test("QuarantineResult formats reason strings correctly")
    func quarantineResult_reasonStrings() {
        let result = QuarantineResult(
            shouldQuarantine: true,
            reasons: [.disposableEmail, .spamPattern],
            spamPatterns: ["viagra", "lottery"]
        )

        let strings = result.reasonStrings
        #expect(strings.contains("DISPOSABLE_EMAIL"))
        #expect(strings.contains("SPAM_PATTERN"))
        #expect(strings.contains(where: { $0.hasPrefix("patterns:") }))
    }

    @Test("QuarantineResult calculates max severity")
    func quarantineResult_maxSeverity() {
        let lowSeverity = QuarantineResult(
            shouldQuarantine: true,
            reasons: [.testEmail]
        )
        #expect(lowSeverity.maxSeverity == 1)

        let highSeverity = QuarantineResult(
            shouldQuarantine: true,
            reasons: [.testEmail, .botDetected]
        )
        #expect(highSeverity.maxSeverity == 5)
    }

    // MARK: - Helper Methods

    private func createMockLead(
        name: String? = nil,
        company: String? = nil,
        createdAt: Date = Date()
    ) -> Lead {
        return Lead(
            email: "user@example.com",
            name: name,
            company: company,
            createdAt: createdAt
        )
    }
}
