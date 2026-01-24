// =============================================================================
// ValidationServiceTests.swift
// LeadCaptureAPITests
// =============================================================================
// Tests for ValidationService.
// =============================================================================

import Foundation
import Testing
@testable import LeadCaptureAPI
@testable import Shared

@Suite("ValidationService Tests")
struct ValidationServiceTests {

    let validationService = ValidationService()

    // MARK: - Valid Request Tests

    @Test("Valid request passes validation")
    func validate_withValidRequest_returnsValid() {
        let request = CreateLeadRequest(
            email: "user@example.com",
            name: "John Doe",
            company: "Acme Corp",
            phone: "+1234567890",
            notes: "Interested in your services",
            source: "website"
        )

        let result = validationService.validate(request)

        #expect(result.isValid)
        #expect(result.errors.isEmpty)
        #expect(!result.honeypotTriggered)
    }

    @Test("Minimal request with only email passes validation")
    func validate_withMinimalRequest_returnsValid() {
        let request = CreateLeadRequest(email: "user@example.com")

        let result = validationService.validate(request)

        #expect(result.isValid)
    }

    // MARK: - Email Validation Tests

    @Test("Empty email fails validation")
    func validate_withEmptyEmail_returnsInvalid() {
        let request = CreateLeadRequest(email: "")

        let result = validationService.validate(request)

        #expect(!result.isValid)
        #expect(result.toAppError() != nil)
    }

    @Test("Invalid email fails validation")
    func validate_withInvalidEmail_returnsInvalid() {
        let invalidEmails = [
            "notanemail",
            "@nodomain.com",
            "spaces in@email.com"
        ]

        for email in invalidEmails {
            let request = CreateLeadRequest(email: email)
            let result = validationService.validate(request)

            #expect(!result.isValid, "Expected \(email) to be invalid")
        }
    }

    @Test("Too long email fails validation")
    func validate_withTooLongEmail_returnsInvalid() {
        let longEmail = String(repeating: "a", count: 300) + "@example.com"
        let request = CreateLeadRequest(email: longEmail)

        let result = validationService.validate(request)

        #expect(!result.isValid)
    }

    // MARK: - Name Validation Tests

    @Test("Invalid name fails validation")
    func validate_withInvalidName_returnsInvalid() {
        let request = CreateLeadRequest(
            email: "user@example.com",
            name: "John123<script>"
        )

        let result = validationService.validate(request)

        #expect(!result.isValid)
    }

    @Test("Too long name fails validation")
    func validate_withTooLongName_returnsInvalid() {
        let request = CreateLeadRequest(
            email: "user@example.com",
            name: String(repeating: "a", count: 150)
        )

        let result = validationService.validate(request)

        #expect(!result.isValid)
    }

    @Test("Empty name passes validation (optional field)")
    func validate_withEmptyName_returnsValid() {
        let request = CreateLeadRequest(
            email: "user@example.com",
            name: ""
        )

        let result = validationService.validate(request)

        #expect(result.isValid)
    }

    // MARK: - Phone Validation Tests

    @Test("Valid phone passes validation")
    func validate_withValidPhone_returnsValid() {
        let validPhones = [
            "+1234567890",
            "(123) 456-7890",
            "123-456-7890"
        ]

        for phone in validPhones {
            let request = CreateLeadRequest(
                email: "user@example.com",
                phone: phone
            )

            let result = validationService.validate(request)

            #expect(result.isValid, "Expected \(phone) to be valid")
        }
    }

    @Test("Invalid phone fails validation")
    func validate_withInvalidPhone_returnsInvalid() {
        let request = CreateLeadRequest(
            email: "user@example.com",
            phone: "abc"
        )

        let result = validationService.validate(request)

        #expect(!result.isValid)
    }

    // MARK: - Notes Validation Tests

    @Test("Too long notes fails validation")
    func validate_withTooLongNotes_returnsInvalid() {
        let request = CreateLeadRequest(
            email: "user@example.com",
            notes: String(repeating: "a", count: 3000)
        )

        let result = validationService.validate(request)

        #expect(!result.isValid)
    }

    // MARK: - Source Validation Tests

    @Test("Valid source passes validation")
    func validate_withValidSource_returnsValid() {
        let validSources = ["website", "landing_page", "referral", "api"]

        for source in validSources {
            let request = CreateLeadRequest(
                email: "user@example.com",
                source: source
            )

            let result = validationService.validate(request)

            #expect(result.isValid, "Expected source '\(source)' to be valid")
        }
    }

    @Test("Invalid source fails validation")
    func validate_withInvalidSource_returnsInvalid() {
        let request = CreateLeadRequest(
            email: "user@example.com",
            source: "invalid_source_value"
        )

        let result = validationService.validate(request)

        #expect(!result.isValid)
    }

    // MARK: - Honeypot Tests

    @Test("Filled honeypot triggers detection")
    func validate_withHoneypotTriggered_returnsHoneypot() {
        let request = CreateLeadRequest(
            email: "user@example.com",
            website: "https://spam.com"
        )

        let result = validationService.validate(request)

        #expect(!result.isValid)
        #expect(result.honeypotTriggered)
    }

    @Test("Empty honeypot passes validation")
    func validate_withEmptyHoneypot_returnsValid() {
        let request = CreateLeadRequest(
            email: "user@example.com",
            website: ""
        )

        let result = validationService.validate(request)

        #expect(result.isValid)
        #expect(!result.honeypotTriggered)
    }

    // MARK: - Idempotency Key Validation Tests

    @Test("Valid idempotency key passes validation")
    func validateIdempotencyKey_withValidKey_returnsTrue() {
        let validKeys: [String?] = [
            "abcdefghij123456",
            "request-12345678901",
            nil // nil is valid (optional)
        ]

        for key in validKeys {
            #expect(
                validationService.validateIdempotencyKey(key),
                "Expected key '\(key ?? "nil")' to be valid"
            )
        }
    }

    @Test("Invalid idempotency key fails validation")
    func validateIdempotencyKey_withInvalidKey_returnsFalse() {
        let invalidKeys = [
            "short",
            "key with spaces",
            String(repeating: "a", count: 100)
        ]

        for key in invalidKeys {
            #expect(
                !validationService.validateIdempotencyKey(key),
                "Expected key '\(key)' to be invalid"
            )
        }
    }

    // MARK: - Security Tests

    @Test("Null byte in email fails validation")
    func validate_withNullByteInEmail_returnsInvalid() {
        let request = CreateLeadRequest(email: "user\0@example.com")

        let result = validationService.validate(request)

        #expect(!result.isValid)
    }

    @Test("Null byte in name fails validation")
    func validate_withNullByteInName_returnsInvalid() {
        let request = CreateLeadRequest(
            email: "user@example.com",
            name: "John\0Doe"
        )

        let result = validationService.validate(request)

        #expect(!result.isValid)
    }

    @Test("Excessive control characters fail validation")
    func validate_withExcessiveControlChars_returnsInvalid() {
        // Create string with >5% control characters
        let controlChars = String(repeating: "\u{01}", count: 10)
        let request = CreateLeadRequest(
            email: "user@example.com",
            notes: controlChars + "short"
        )

        let result = validationService.validate(request)

        #expect(!result.isValid)
    }

    @Test("Normal text with tabs and newlines passes validation")
    func validate_withTabsAndNewlines_returnsValid() {
        let request = CreateLeadRequest(
            email: "user@example.com",
            notes: "Line 1\nLine 2\tTabbed"
        )

        let result = validationService.validate(request)

        #expect(result.isValid)
    }

    @Test("isSafeString detects null bytes")
    func isSafeString_withNullByte_returnsFalse() {
        #expect(!ValidationService.isSafeString("test\0string"))
    }

    @Test("isSafeString allows normal text")
    func isSafeString_withNormalText_returnsTrue() {
        #expect(ValidationService.isSafeString("Hello, World!"))
        #expect(ValidationService.isSafeString("Line 1\nLine 2"))
        #expect(ValidationService.isSafeString("Tab\there"))
    }

    @Test("sanitizeString removes null bytes")
    func sanitizeString_withNullBytes_removesNullBytes() {
        let result = ValidationService.sanitizeString("test\0string")
        #expect(result == "teststring")
    }

    @Test("sanitizeString removes control characters")
    func sanitizeString_withControlChars_removesControlChars() {
        let result = ValidationService.sanitizeString("test\u{01}\u{02}string")
        #expect(result == "teststring")
    }

    @Test("sanitizeString preserves tabs and newlines")
    func sanitizeString_withTabsNewlines_preservesThem() {
        let result = ValidationService.sanitizeString("line1\nline2\ttab")
        #expect(result == "line1\nline2\ttab")
    }
}
