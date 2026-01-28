// =============================================================================
// LeadRequest.swift
// LeadCaptureAPI/Models
// =============================================================================
// Request payload with Vapor Validatable for lead capture.
// =============================================================================

import Foundation
import Vapor
import Shared

// MARK: - Lead Request

/// Request body for creating a lead with Vapor validation
public struct LeadRequest: Content, Validatable {

    // MARK: - Properties

    /// Email address (required)
    public let email: String

    /// Full name (optional)
    public let name: String?

    /// Company name (optional)
    public let company: String?

    /// Phone number (optional)
    public let phone: String?

    /// Additional notes or message (optional)
    public let notes: String?

    /// Lead source identifier (optional)
    public let source: String?

    /// Funnel ID (optional, can come from URL)
    public let funnelId: String?

    /// Custom metadata (optional)
    public let metadata: [String: String]?

    /// Honeypot field - should be empty (bots fill this)
    public let website: String?

    /// Timestamp field for bot detection
    public let formStartTime: String?

    // MARK: - Coding Keys

    private enum CodingKeys: String, CodingKey {
        case email
        case name
        case company
        case phone
        case notes
        case source
        case funnelId = "funnel_id"
        case metadata
        case website
        case formStartTime = "form_start_time"
    }

    // MARK: - Initialization

    /// Public initializer for creating LeadRequest instances
    public init(
        email: String,
        name: String? = nil,
        company: String? = nil,
        phone: String? = nil,
        notes: String? = nil,
        source: String? = nil,
        funnelId: String? = nil,
        metadata: [String: String]? = nil,
        website: String? = nil,
        formStartTime: String? = nil
    ) {
        self.email = email
        self.name = name
        self.company = company
        self.phone = phone
        self.notes = notes
        self.source = source
        self.funnelId = funnelId
        self.metadata = metadata
        self.website = website
        self.formStartTime = formStartTime
    }

    // MARK: - Validation

    public static func validations(_ validations: inout Validations) {
        // Email validation - required
        validations.add("email", as: String.self, is: !.empty, required: true)
        validations.add("email", as: String.self, is: .email)
        validations.add("email", as: String.self, is: .count(ValidationLimits.Email.minLength...ValidationLimits.Email.maxLength))

        // Name validation - optional but must be valid if provided
        validations.add("name", as: String?.self, is: .nil || .count(0...ValidationLimits.Name.maxLength), required: false)

        // Company validation - optional
        validations.add("company", as: String?.self, is: .nil || .count(0...ValidationLimits.Company.maxLength), required: false)

        // Phone validation - optional but must be valid format if provided
        validations.add("phone", as: String?.self, is: .nil || .count(0...ValidationLimits.Phone.maxLength), required: false)

        // Notes validation - optional with length limit
        validations.add("notes", as: String?.self, is: .nil || .count(0...ValidationLimits.Notes.maxLength), required: false)

        // Source validation - optional with length limit
        validations.add("source", as: String?.self, is: .nil || .count(0...ValidationLimits.Source.maxLength), required: false)
    }

    // MARK: - Convenience Methods

    /// Check if phone number is valid (if provided)
    public func isPhoneValid() -> Bool {
        guard let phone = phone, !phone.isEmpty else { return true }
        return ValidationLimits.isValidPhone(phone)
    }

    /// Check if email domain is disposable
    public func isDisposableEmail() -> Bool {
        return QuarantineLists.isDisposableEmail(email)
    }

    /// Get normalized email (lowercased, trimmed)
    public var normalizedEmail: String {
        return email.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Get normalized name (trimmed)
    public var normalizedName: String? {
        return name?.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Check if honeypot was triggered
    public var isHoneypotTriggered: Bool {
        guard let website = website else { return false }
        return !website.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    /// Check form timing for bot detection
    /// - Parameter minSeconds: Minimum seconds expected for human submission
    /// - Returns: True if submission time is suspiciously fast
    public func isSuspiciouslyFast(minSeconds: TimeInterval = 3.0) -> Bool {
        guard let formStartTime = formStartTime,
              let startTime = parseISO8601(formStartTime) else {
            return false
        }

        let elapsed = Date().timeIntervalSince(startTime)
        return elapsed < minSeconds
    }

    /// Convert to CreateLeadRequest for LeadService
    public func toCreateLeadRequest() -> CreateLeadRequest {
        return CreateLeadRequest(
            email: normalizedEmail,
            name: normalizedName,
            company: company?.trimmingCharacters(in: .whitespacesAndNewlines),
            phone: phone?.trimmingCharacters(in: .whitespacesAndNewlines),
            notes: notes?.trimmingCharacters(in: .whitespacesAndNewlines),
            source: source ?? funnelId,
            metadata: metadata,
            website: website
        )
    }
}

// MARK: - Extended Validation

extension LeadRequest {

    /// Perform comprehensive validation beyond Vapor's built-in
    /// - Returns: Array of validation errors (empty if valid)
    public func validateComprehensive() -> [ValidationError] {
        var errors: [ValidationError] = []

        // Validate email format more strictly
        if !ValidationLimits.isValidEmail(email) {
            errors.append(ValidationError(field: "email", message: "Invalid email format"))
        }

        // Check email parts length
        let emailParts = email.split(separator: "@")
        if emailParts.count == 2 {
            if emailParts[0].count > ValidationLimits.Email.maxLocalPartLength {
                errors.append(ValidationError(field: "email", message: "Email local part too long"))
            }
            if emailParts[1].count > ValidationLimits.Email.maxDomainLength {
                errors.append(ValidationError(field: "email", message: "Email domain too long"))
            }
        }

        // Validate phone if provided
        if let phone = phone, !phone.isEmpty {
            if !ValidationLimits.isValidPhone(phone) {
                errors.append(ValidationError(field: "phone", message: "Invalid phone number format"))
            }
        }

        // Validate name if provided
        if let name = name, !name.isEmpty {
            if !ValidationLimits.isValidName(name) {
                errors.append(ValidationError(field: "name", message: "Name contains invalid characters"))
            }
        }

        // Validate source if provided
        if let source = source, !source.isEmpty {
            if !ValidationLimits.isValidSource(source.lowercased()) {
                // Don't fail, but note it - we'll default to "website"
            }
        }

        // Check for dangerous characters
        if !ValidationService.isSafeString(email) {
            errors.append(ValidationError(field: "email", message: "Email contains invalid characters"))
        }

        if let name = name, !ValidationService.isSafeString(name) {
            errors.append(ValidationError(field: "name", message: "Name contains invalid characters"))
        }

        if let notes = notes, !ValidationService.isSafeString(notes) {
            errors.append(ValidationError(field: "notes", message: "Notes contains invalid characters"))
        }

        return errors
    }
}
