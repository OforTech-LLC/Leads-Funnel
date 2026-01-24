// =============================================================================
// ValidationLimitsTests.swift
// SharedTests
// =============================================================================
// Tests for ValidationLimits functionality.
// =============================================================================

import Foundation
import Testing
@testable import Shared

@Suite("ValidationLimits Tests")
struct ValidationLimitsTests {

    // MARK: - Email Validation Tests

    @Test("Validates correct email formats")
    func isValidEmail_withValidEmails_returnsTrue() {
        let validEmails = [
            "user@example.com",
            "john.doe@company.org",
            "contact+tag@domain.net",
            "user123@sub.domain.co.uk",
            "a@b.co"
        ]

        for email in validEmails {
            #expect(
                ValidationLimits.isValidEmail(email),
                "Expected \(email) to be valid"
            )
        }
    }

    @Test("Rejects invalid email formats")
    func isValidEmail_withInvalidEmails_returnsFalse() {
        let invalidEmails = [
            "",
            "notanemail",
            "@nodomain.com",
            "noat.com",
            "spaces in@email.com",
            "a@b.c", // TLD too short
            String(repeating: "a", count: 255) + "@example.com" // Too long
        ]

        for email in invalidEmails {
            #expect(
                !ValidationLimits.isValidEmail(email),
                "Expected \(email) to be invalid"
            )
        }
    }

    @Test("Rejects email with overly long local part")
    func isValidEmail_withLongLocalPart_returnsFalse() {
        let longLocalPart = String(repeating: "a", count: 65) + "@example.com"
        #expect(!ValidationLimits.isValidEmail(longLocalPart))
    }

    // MARK: - Phone Validation Tests

    @Test("Validates correct phone formats")
    func isValidPhone_withValidPhones_returnsTrue() {
        let validPhones = [
            "+1234567890",
            "(123) 456-7890",
            "123-456-7890",
            "+44 20 7946 0958",
            "1234567"
        ]

        for phone in validPhones {
            #expect(
                ValidationLimits.isValidPhone(phone),
                "Expected \(phone) to be valid"
            )
        }
    }

    @Test("Rejects invalid phone formats")
    func isValidPhone_withInvalidPhones_returnsFalse() {
        let invalidPhones = [
            "",
            "123", // Too short
            "abcdefghij", // Letters
            String(repeating: "1", count: 25) // Too long
        ]

        for phone in invalidPhones {
            #expect(
                !ValidationLimits.isValidPhone(phone),
                "Expected \(phone) to be invalid"
            )
        }
    }

    @Test("Validates strict E.164 phone format")
    func isValidPhone_withStrictE164_validatesCorrectly() {
        // Valid E.164 format
        #expect(ValidationLimits.isValidPhone("+12025551234", strict: true))
        #expect(ValidationLimits.isValidPhone("+442079460958", strict: true))

        // Invalid E.164 format
        #expect(!ValidationLimits.isValidPhone("(202) 555-1234", strict: true))
        #expect(!ValidationLimits.isValidPhone("2025551234", strict: true))
    }

    // MARK: - Name Validation Tests

    @Test("Validates correct name formats")
    func isValidName_withValidNames_returnsTrue() {
        let validNames = [
            "John",
            "John Doe",
            "Mary-Jane",
            "O'Connor",
            "José García",
            "李明"
        ]

        for name in validNames {
            #expect(
                ValidationLimits.isValidName(name),
                "Expected '\(name)' to be valid"
            )
        }
    }

    @Test("Rejects invalid name formats")
    func isValidName_withInvalidNames_returnsFalse() {
        let invalidNames = [
            "",
            "John123", // Numbers
            "User<script>", // Special characters
            String(repeating: "a", count: 101) // Too long
        ]

        for name in invalidNames {
            #expect(
                !ValidationLimits.isValidName(name),
                "Expected '\(name)' to be invalid"
            )
        }
    }

    // MARK: - Idempotency Key Validation Tests

    @Test("Validates correct idempotency key formats")
    func isValidIdempotencyKey_withValidKeys_returnsTrue() {
        let validKeys = [
            "abcdefghij123456", // 16 chars minimum
            "user-request-12345",
            "ABC_DEF_123_456_789",
            String(repeating: "a", count: 64) // 64 chars maximum
        ]

        for key in validKeys {
            #expect(
                ValidationLimits.isValidIdempotencyKey(key),
                "Expected '\(key)' to be valid"
            )
        }
    }

    @Test("Rejects invalid idempotency key formats")
    func isValidIdempotencyKey_withInvalidKeys_returnsFalse() {
        let invalidKeys = [
            "short", // Too short (< 16)
            String(repeating: "a", count: 65), // Too long (> 64)
            "key with spaces",
            "key@special#chars"
        ]

        for key in invalidKeys {
            #expect(
                !ValidationLimits.isValidIdempotencyKey(key),
                "Expected '\(key)' to be invalid"
            )
        }
    }

    // MARK: - Source Validation Tests

    @Test("Validates correct source values")
    func isValidSource_withValidSources_returnsTrue() {
        let validSources = [
            "website",
            "landing_page",
            "referral",
            "api",
            "social"
        ]

        for source in validSources {
            #expect(
                ValidationLimits.isValidSource(source),
                "Expected '\(source)' to be valid"
            )
        }
    }

    @Test("Source validation is case insensitive")
    func isValidSource_caseInsensitive() {
        #expect(ValidationLimits.isValidSource("WEBSITE"))
        #expect(ValidationLimits.isValidSource("Website"))
    }

    @Test("Rejects invalid source values")
    func isValidSource_withInvalidSources_returnsFalse() {
        let invalidSources = [
            "invalid_source",
            "random",
            String(repeating: "a", count: 101)
        ]

        for source in invalidSources {
            #expect(
                !ValidationLimits.isValidSource(source),
                "Expected '\(source)' to be invalid"
            )
        }
    }

    // MARK: - Sanitize Tests

    @Test("Sanitize trims whitespace")
    func sanitize_trimsWhitespace() {
        let input = "  hello world  "
        let result = ValidationLimits.sanitize(input, maxLength: 100)
        #expect(result == "hello world")
    }

    @Test("Sanitize truncates to max length")
    func sanitize_truncatesToMaxLength() {
        let input = "this is a long string"
        let result = ValidationLimits.sanitize(input, maxLength: 10)
        #expect(result == "this is a ")
        #expect(result.count == 10)
    }

    @Test("Sanitize handles empty string")
    func sanitize_handlesEmptyString() {
        let result = ValidationLimits.sanitize("", maxLength: 100)
        #expect(result == "")
    }
}
