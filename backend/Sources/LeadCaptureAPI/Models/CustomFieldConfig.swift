// =============================================================================
// CustomFieldConfig.swift
// LeadCaptureAPI/Models
// =============================================================================
// Configuration for custom fields in a lead capture funnel.
// =============================================================================

import Foundation
import Vapor

// MARK: - Custom Field Config

/// Configuration for a custom field in a funnel
public struct CustomFieldConfig: Content, Sendable {

    /// Field name/identifier
    public let name: String

    /// Display label
    public let label: String

    /// Field type
    public let type: FieldType

    /// Whether the field is required
    public let required: Bool

    /// Placeholder text
    public let placeholder: String?

    /// Default value
    public let defaultValue: String?

    /// Validation pattern (regex)
    public let pattern: String?

    /// Minimum length
    public let minLength: Int?

    /// Maximum length
    public let maxLength: Int?

    /// Options for select/radio fields
    public let options: [FieldOption]?

    /// Help text
    public let helpText: String?

    // MARK: - Field Type

    public enum FieldType: String, Codable, Sendable {
        case text
        case email
        case phone
        case number
        case date
        case select
        case radio
        case checkbox
        case textarea
        case url
        case hidden
    }

    // MARK: - Initialization

    public init(
        name: String,
        label: String,
        type: FieldType = .text,
        required: Bool = false,
        placeholder: String? = nil,
        defaultValue: String? = nil,
        pattern: String? = nil,
        minLength: Int? = nil,
        maxLength: Int? = nil,
        options: [FieldOption]? = nil,
        helpText: String? = nil
    ) {
        self.name = name
        self.label = label
        self.type = type
        self.required = required
        self.placeholder = placeholder
        self.defaultValue = defaultValue
        self.pattern = pattern
        self.minLength = minLength
        self.maxLength = maxLength
        self.options = options
        self.helpText = helpText
    }
}

// MARK: - Field Option

/// Option for select/radio fields
public struct FieldOption: Content, Sendable {
    /// Option value
    public let value: String

    /// Display label
    public let label: String

    /// Whether this is the default selection
    public let isDefault: Bool

    public init(value: String, label: String, isDefault: Bool = false) {
        self.value = value
        self.label = label
        self.isDefault = isDefault
    }
}
