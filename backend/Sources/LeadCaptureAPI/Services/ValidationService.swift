// =============================================================================
// ValidationService.swift
// LeadCaptureAPI/Services
// =============================================================================
// Input validation for lead data.
// =============================================================================

import Foundation
import Shared

// MARK: - Validation Service

/// Service for validating lead input data
public struct ValidationService: Sendable {

    // MARK: - Properties

    private let config: AppConfig

    // MARK: - Initialization

    public init(config: AppConfig = .shared) {
        self.config = config
    }

    // MARK: - Validation Methods

    /// Validate a create lead request
    /// - Parameter request: The request to validate
    /// - Returns: Validation result with errors if any
    public func validate(_ request: CreateLeadRequest) -> ValidationResult {
        var errors = ValidationErrors()

        // SECURITY: Check for dangerous characters in all fields first
        if !Self.isSafeString(request.email) {
            errors.add(field: "email", message: "Email contains invalid characters")
            return ValidationResult(isValid: false, errors: errors)
        }
        if let name = request.name, !Self.isSafeString(name) {
            errors.add(field: "name", message: "Name contains invalid characters")
            return ValidationResult(isValid: false, errors: errors)
        }
        if let company = request.company, !Self.isSafeString(company) {
            errors.add(field: "company", message: "Company contains invalid characters")
            return ValidationResult(isValid: false, errors: errors)
        }
        if let notes = request.notes, !Self.isSafeString(notes) {
            errors.add(field: "notes", message: "Notes contains invalid characters")
            return ValidationResult(isValid: false, errors: errors)
        }

        // Validate email (required)
        validateEmail(request.email, errors: &errors)

        // Validate name (optional)
        if let name = request.name {
            validateName(name, errors: &errors)
        }

        // Validate company (optional)
        if let company = request.company {
            validateCompany(company, errors: &errors)
        }

        // Validate phone (optional)
        if let phone = request.phone {
            validatePhone(phone, errors: &errors)
        }

        // Validate notes (optional)
        if let notes = request.notes {
            validateNotes(notes, errors: &errors)
        }

        // Validate source (optional)
        if let source = request.source {
            validateSource(source, errors: &errors)
        }

        // Check honeypot field
        if let website = request.website, !website.isEmpty {
            return ValidationResult(
                isValid: false,
                errors: errors,
                honeypotTriggered: true
            )
        }

        return ValidationResult(isValid: errors.isEmpty, errors: errors)
    }

    // MARK: - Field Validators

    private func validateEmail(_ email: String, errors: inout ValidationErrors) {
        let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines)

        // Check if empty
        if trimmed.isEmpty {
            errors.add(field: "email", message: "Email is required")
            return
        }

        // Check length
        if trimmed.count < ValidationLimits.Email.minLength {
            errors.add(field: "email", message: "Email is too short")
            return
        }

        if trimmed.count > ValidationLimits.Email.maxLength {
            errors.add(field: "email", message: "Email exceeds maximum length of \(ValidationLimits.Email.maxLength)")
            return
        }

        // Check format
        if !ValidationLimits.isValidEmail(trimmed) {
            errors.add(field: "email", message: "Invalid email format")
            return
        }

        // Check local part and domain lengths
        let parts = trimmed.split(separator: "@")
        if parts.count == 2 {
            if parts[0].count > ValidationLimits.Email.maxLocalPartLength {
                errors.add(field: "email", message: "Email local part exceeds maximum length")
                return
            }
            if parts[1].count > ValidationLimits.Email.maxDomainLength {
                errors.add(field: "email", message: "Email domain exceeds maximum length")
                return
            }
        }
    }

    private func validateName(_ name: String, errors: inout ValidationErrors) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)

        if trimmed.isEmpty {
            return // Name is optional, empty is allowed
        }

        if trimmed.count > ValidationLimits.Name.maxLength {
            errors.add(field: "name", message: "Name exceeds maximum length of \(ValidationLimits.Name.maxLength)")
            return
        }

        if !ValidationLimits.isValidName(trimmed) {
            errors.add(field: "name", message: "Name contains invalid characters")
        }
    }

    private func validateCompany(_ company: String, errors: inout ValidationErrors) {
        let trimmed = company.trimmingCharacters(in: .whitespacesAndNewlines)

        if trimmed.isEmpty {
            return // Company is optional
        }

        if trimmed.count > ValidationLimits.Company.maxLength {
            errors.add(field: "company", message: "Company exceeds maximum length of \(ValidationLimits.Company.maxLength)")
        }
    }

    private func validatePhone(_ phone: String, errors: inout ValidationErrors) {
        let trimmed = phone.trimmingCharacters(in: .whitespacesAndNewlines)

        if trimmed.isEmpty {
            return // Phone is optional
        }

        if trimmed.count < ValidationLimits.Phone.minLength {
            errors.add(field: "phone", message: "Phone number is too short")
            return
        }

        if trimmed.count > ValidationLimits.Phone.maxLength {
            errors.add(field: "phone", message: "Phone exceeds maximum length of \(ValidationLimits.Phone.maxLength)")
            return
        }

        if !ValidationLimits.isValidPhone(trimmed) {
            errors.add(field: "phone", message: "Invalid phone number format")
        }
    }

    private func validateNotes(_ notes: String, errors: inout ValidationErrors) {
        let trimmed = notes.trimmingCharacters(in: .whitespacesAndNewlines)

        if trimmed.count > ValidationLimits.Notes.maxLength {
            errors.add(field: "notes", message: "Notes exceeds maximum length of \(ValidationLimits.Notes.maxLength)")
        }
    }

    private func validateSource(_ source: String, errors: inout ValidationErrors) {
        let trimmed = source.trimmingCharacters(in: .whitespacesAndNewlines)

        if trimmed.isEmpty {
            return // Source is optional, will default to "website"
        }

        if trimmed.count > ValidationLimits.Source.maxLength {
            errors.add(field: "source", message: "Source exceeds maximum length of \(ValidationLimits.Source.maxLength)")
            return
        }

        // Check if it's a valid source value
        if LeadSource(string: trimmed) == nil {
            errors.add(field: "source", message: "Invalid source value")
        }
    }

    // MARK: - Idempotency Key Validation

    /// Validate idempotency key format
    /// - Parameter key: The key to validate
    /// - Returns: True if valid
    public func validateIdempotencyKey(_ key: String?) -> Bool {
        guard let key = key else { return true } // Optional

        return ValidationLimits.isValidIdempotencyKey(key)
    }

    // MARK: - Character Validation

    /// Check if string contains potentially dangerous characters
    /// - Parameter text: Text to validate
    /// - Returns: True if the text is safe
    public static func isSafeString(_ text: String) -> Bool {
        // Check for null bytes (can cause issues in C-based systems)
        if text.contains("\0") {
            return false
        }

        // Check for excessive control characters (< 5% of string)
        let controlCharCount = text.unicodeScalars.filter { scalar in
            // Control characters are 0x00-0x1F (except common whitespace) and 0x7F-0x9F
            let value = scalar.value
            let isControlChar = (value < 0x20 && value != 0x09 && value != 0x0A && value != 0x0D) ||
                               (value >= 0x7F && value <= 0x9F)
            return isControlChar
        }.count

        let maxControlChars = max(1, text.count / 20)  // Allow up to 5%
        if controlCharCount > maxControlChars {
            return false
        }

        return true
    }

    /// Sanitize string by removing null bytes and excessive control characters
    /// - Parameter text: Text to sanitize
    /// - Returns: Sanitized text
    public static func sanitizeString(_ text: String) -> String {
        // Remove null bytes
        var sanitized = text.replacingOccurrences(of: "\0", with: "")

        // Remove other control characters (keep tabs, newlines, carriage returns)
        sanitized = String(sanitized.unicodeScalars.filter { scalar in
            let value = scalar.value
            // Keep printable characters, tabs, newlines, carriage returns
            return value >= 0x20 || value == 0x09 || value == 0x0A || value == 0x0D
        })

        return sanitized
    }
}
