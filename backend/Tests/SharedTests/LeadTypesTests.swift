// =============================================================================
// LeadTypesTests.swift
// SharedTests
// =============================================================================
// Tests for LeadTypes enums and helpers.
// =============================================================================

import Testing
import Foundation
@testable import Shared

@Suite("Lead Types Tests")
struct LeadTypesTests {

    // MARK: - LeadStatus Tests

    @Test("LeadStatus all cases exist")
    func testLeadStatus_AllCasesExist() {
        let allStatuses: [LeadStatus] = [
            .new, .contacted, .qualified, .converted, .closed, .quarantined
        ]

        #expect(LeadStatus.allCases.count == allStatuses.count)
        for status in allStatuses {
            #expect(LeadStatus.allCases.contains(status))
        }
    }

    @Test("LeadStatus raw values are correct")
    func testLeadStatus_RawValues() {
        #expect(LeadStatus.new.rawValue == "NEW")
        #expect(LeadStatus.contacted.rawValue == "CONTACTED")
        #expect(LeadStatus.qualified.rawValue == "QUALIFIED")
        #expect(LeadStatus.converted.rawValue == "CONVERTED")
        #expect(LeadStatus.closed.rawValue == "CLOSED")
        #expect(LeadStatus.quarantined.rawValue == "QUARANTINED")
    }

    @Test("LeadStatus isActive property works")
    func testLeadStatus_IsActive() {
        // Active statuses
        #expect(LeadStatus.new.isActive)
        #expect(LeadStatus.contacted.isActive)
        #expect(LeadStatus.qualified.isActive)

        // Inactive statuses
        #expect(!LeadStatus.converted.isActive)
        #expect(!LeadStatus.closed.isActive)
        #expect(!LeadStatus.quarantined.isActive)
    }

    @Test("LeadStatus description is not empty")
    func testLeadStatus_Description() {
        #expect(!LeadStatus.new.description.isEmpty)
        #expect(!LeadStatus.quarantined.description.isEmpty)
    }

    // MARK: - LeadSource Tests

    @Test("LeadSource all cases exist")
    func testLeadSource_AllCasesExist() {
        #expect(LeadSource.allCases.count > 0)
    }

    @Test("LeadSource initializes from string")
    func testLeadSource_InitFromString() {
        #expect(LeadSource(string: "website") == .website)
        #expect(LeadSource(string: "WEBSITE") == .website)
        #expect(LeadSource(string: "LANDING_PAGE") == .landingPage)
        #expect(LeadSource(string: "landing-page") == .landingPage)
    }

    @Test("LeadSource description is correct")
    func testLeadSource_Description() {
        #expect(LeadSource.website.description == "Website")
        #expect(LeadSource.landingPage.description == "Landing Page")
        #expect(LeadSource.paidAds.description == "Paid Advertising")
    }

    // MARK: - LeadEventType Tests

    @Test("LeadEventType detail type is correct")
    func testLeadEventType_DetailType() {
        #expect(LeadEventType.created.detailType == "lead.created")
        #expect(LeadEventType.updated.detailType == "lead.updated")
        #expect(LeadEventType.statusChanged.detailType == "lead.status_changed")
        #expect(LeadEventType.quarantined.detailType == "lead.quarantined")
    }

    // MARK: - QuarantineReason Tests

    @Test("QuarantineReason all cases exist")
    func testQuarantineReason_AllCasesExist() {
        #expect(QuarantineReason.allCases.count > 0)
    }

    @Test("QuarantineReason description is not empty")
    func testQuarantineReason_Description() {
        for reason in QuarantineReason.allCases {
            #expect(!reason.description.isEmpty, "Description should not be empty for \(reason)")
        }
    }

    @Test("QuarantineReason severity is within range")
    func testQuarantineReason_Severity() {
        // Test that severity is within valid range
        for reason in QuarantineReason.allCases {
            #expect((1...5).contains(reason.severity), "Severity should be 1-5 for \(reason)")
        }

        // Test specific severity levels
        #expect(QuarantineReason.testEmail.severity == 1)
        #expect(QuarantineReason.botDetected.severity == 5)
    }

    // MARK: - APIErrorCode Tests

    @Test("APIErrorCode maps to correct HTTP status")
    func testAPIErrorCode_HttpStatus() {
        // 400 errors
        #expect(APIErrorCode.invalidEmail.httpStatus == 400)
        #expect(APIErrorCode.missingRequiredField.httpStatus == 400)

        // 429 errors
        #expect(APIErrorCode.rateLimitExceeded.httpStatus == 429)

        // 409 errors
        #expect(APIErrorCode.duplicateLead.httpStatus == 409)

        // 500 errors
        #expect(APIErrorCode.internalError.httpStatus == 500)

        // Auth errors
        #expect(APIErrorCode.unauthorized.httpStatus == 401)
        #expect(APIErrorCode.forbidden.httpStatus == 403)
    }

    // MARK: - EntityType Tests

    @Test("EntityType PK prefix is correct")
    func testEntityType_PkPrefix() {
        #expect(EntityType.lead.pkPrefix == "LEAD#")
        #expect(EntityType.rateLimit.pkPrefix == "RATELIMIT#")
        #expect(EntityType.idempotency.pkPrefix == "IDEMPOTENCY#")
        #expect(EntityType.emailIndex.pkPrefix == "EMAIL#")
        #expect(EntityType.auditLog.pkPrefix == "AUDIT#")
    }

    @Test("EntityType SK prefix is correct")
    func testEntityType_SkPrefix() {
        #expect(EntityType.lead.skPrefix == "METADATA#")
        #expect(EntityType.rateLimit.skPrefix == "WINDOW#")
        #expect(EntityType.idempotency.skPrefix == "KEY#")
    }

    // MARK: - ISO8601 Helpers Tests

    @Test("formatISO8601 produces valid format")
    func testFormatISO8601_ProducesValidFormat() {
        let date = Date(timeIntervalSince1970: 1704067200) // 2024-01-01 00:00:00 UTC
        let formatted = formatISO8601(date)

        #expect(formatted.contains("2024-01-01"))
        #expect(formatted.contains("T"))
    }

    @Test("parseISO8601 parses valid format")
    func testParseISO8601_ParsesValidFormat() {
        let dateString = "2024-01-01T12:00:00.000Z"
        let parsed = parseISO8601(dateString)

        #expect(parsed != nil)
    }

    @Test("parseISO8601 returns nil for invalid format")
    func testParseISO8601_ReturnsNilForInvalidFormat() {
        let invalidStrings = [
            "not a date",
            "2024-01-01",
            "01/01/2024"
        ]

        for string in invalidStrings {
            #expect(parseISO8601(string) == nil, "Expected nil for '\(string)'")
        }
    }

    @Test("ISO8601 round trip works")
    func testISO8601_RoundTrip() {
        let originalDate = Date()
        let formatted = formatISO8601(originalDate)
        let parsed = parseISO8601(formatted)

        #expect(parsed != nil)

        // Allow for small rounding differences
        if let parsed = parsed {
            let difference = abs(originalDate.timeIntervalSince(parsed))
            #expect(difference < 0.001)
        }
    }
}
