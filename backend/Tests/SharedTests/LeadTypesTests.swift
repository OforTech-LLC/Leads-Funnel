// =============================================================================
// LeadTypesTests.swift
// SharedTests
// =============================================================================
// Tests for LeadTypes enums and helpers.
// =============================================================================

import XCTest
@testable import Shared

final class LeadTypesTests: XCTestCase {

    // MARK: - LeadStatus Tests

    func testLeadStatus_AllCasesExist() {
        let allStatuses: [LeadStatus] = [
            .new, .contacted, .qualified, .converted, .closed, .quarantined
        ]

        XCTAssertEqual(LeadStatus.allCases.count, allStatuses.count)
        for status in allStatuses {
            XCTAssertTrue(LeadStatus.allCases.contains(status))
        }
    }

    func testLeadStatus_RawValues() {
        XCTAssertEqual(LeadStatus.new.rawValue, "NEW")
        XCTAssertEqual(LeadStatus.contacted.rawValue, "CONTACTED")
        XCTAssertEqual(LeadStatus.qualified.rawValue, "QUALIFIED")
        XCTAssertEqual(LeadStatus.converted.rawValue, "CONVERTED")
        XCTAssertEqual(LeadStatus.closed.rawValue, "CLOSED")
        XCTAssertEqual(LeadStatus.quarantined.rawValue, "QUARANTINED")
    }

    func testLeadStatus_IsActive() {
        // Active statuses
        XCTAssertTrue(LeadStatus.new.isActive)
        XCTAssertTrue(LeadStatus.contacted.isActive)
        XCTAssertTrue(LeadStatus.qualified.isActive)

        // Inactive statuses
        XCTAssertFalse(LeadStatus.converted.isActive)
        XCTAssertFalse(LeadStatus.closed.isActive)
        XCTAssertFalse(LeadStatus.quarantined.isActive)
    }

    func testLeadStatus_Description() {
        XCTAssertFalse(LeadStatus.new.description.isEmpty)
        XCTAssertFalse(LeadStatus.quarantined.description.isEmpty)
    }

    // MARK: - LeadSource Tests

    func testLeadSource_AllCasesExist() {
        XCTAssertTrue(LeadSource.allCases.count > 0)
    }

    func testLeadSource_InitFromString() {
        XCTAssertEqual(LeadSource(string: "website"), .website)
        XCTAssertEqual(LeadSource(string: "WEBSITE"), .website)
        XCTAssertEqual(LeadSource(string: "LANDING_PAGE"), .landingPage)
        XCTAssertEqual(LeadSource(string: "landing-page"), nil) // Hyphens not supported by raw enum
    }

    func testLeadSource_Description() {
        XCTAssertEqual(LeadSource.website.description, "Website")
        XCTAssertEqual(LeadSource.landingPage.description, "Landing Page")
        XCTAssertEqual(LeadSource.paidAds.description, "Paid Advertising")
    }

    // MARK: - LeadEventType Tests

    func testLeadEventType_DetailType() {
        XCTAssertEqual(LeadEventType.created.detailType, "lead.created")
        XCTAssertEqual(LeadEventType.updated.detailType, "lead.updated")
        XCTAssertEqual(LeadEventType.statusChanged.detailType, "lead.status_changed")
        XCTAssertEqual(LeadEventType.quarantined.detailType, "lead.quarantined")
    }

    // MARK: - QuarantineReason Tests

    func testQuarantineReason_AllCasesExist() {
        XCTAssertTrue(QuarantineReason.allCases.count > 0)
    }

    func testQuarantineReason_Description() {
        for reason in QuarantineReason.allCases {
            XCTAssertFalse(reason.description.isEmpty, "Description should not be empty for \(reason)")
        }
    }

    func testQuarantineReason_Severity() {
        // Test that severity is within valid range
        for reason in QuarantineReason.allCases {
            XCTAssertTrue((1...5).contains(reason.severity), "Severity should be 1-5 for \(reason)")
        }

        // Test specific severity levels
        XCTAssertEqual(QuarantineReason.testEmail.severity, 1)
        XCTAssertEqual(QuarantineReason.botDetected.severity, 5)
    }

    // MARK: - APIErrorCode Tests

    func testAPIErrorCode_HttpStatus() {
        // 400 errors
        XCTAssertEqual(APIErrorCode.invalidEmail.httpStatus, 400)
        XCTAssertEqual(APIErrorCode.missingRequiredField.httpStatus, 400)

        // 429 errors
        XCTAssertEqual(APIErrorCode.rateLimitExceeded.httpStatus, 429)

        // 409 errors
        XCTAssertEqual(APIErrorCode.duplicateLead.httpStatus, 409)

        // 500 errors
        XCTAssertEqual(APIErrorCode.internalError.httpStatus, 500)

        // Auth errors
        XCTAssertEqual(APIErrorCode.unauthorized.httpStatus, 401)
        XCTAssertEqual(APIErrorCode.forbidden.httpStatus, 403)
    }

    // MARK: - EntityType Tests

    func testEntityType_PkPrefix() {
        XCTAssertEqual(EntityType.lead.pkPrefix, "LEAD#")
        XCTAssertEqual(EntityType.rateLimit.pkPrefix, "RATELIMIT#")
        XCTAssertEqual(EntityType.idempotency.pkPrefix, "IDEMPOTENCY#")
        XCTAssertEqual(EntityType.emailIndex.pkPrefix, "EMAIL#")
        XCTAssertEqual(EntityType.auditLog.pkPrefix, "AUDIT#")
    }

    func testEntityType_SkPrefix() {
        XCTAssertEqual(EntityType.lead.skPrefix, "METADATA#")
        XCTAssertEqual(EntityType.rateLimit.skPrefix, "WINDOW#")
        XCTAssertEqual(EntityType.idempotency.skPrefix, "KEY#")
    }

    // MARK: - ISO8601 Helpers Tests

    func testFormatISO8601_ProducesValidFormat() {
        let date = Date(timeIntervalSince1970: 1704067200) // 2024-01-01 00:00:00 UTC
        let formatted = formatISO8601(date)

        XCTAssertTrue(formatted.contains("2024-01-01"))
        XCTAssertTrue(formatted.contains("T"))
    }

    func testParseISO8601_ParsesValidFormat() {
        let dateString = "2024-01-01T12:00:00.000Z"
        let parsed = parseISO8601(dateString)

        XCTAssertNotNil(parsed)
    }

    func testParseISO8601_ReturnsNilForInvalidFormat() {
        let invalidStrings = [
            "not a date",
            "2024-01-01",
            "01/01/2024"
        ]

        for string in invalidStrings {
            XCTAssertNil(parseISO8601(string), "Expected nil for '\(string)'")
        }
    }

    func testISO8601_RoundTrip() {
        let originalDate = Date()
        let formatted = formatISO8601(originalDate)
        let parsed = parseISO8601(formatted)

        XCTAssertNotNil(parsed)

        // Allow for small rounding differences
        if let parsed = parsed {
            let difference = abs(originalDate.timeIntervalSince(parsed))
            XCTAssertLessThan(difference, 0.001)
        }
    }
}
