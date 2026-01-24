// =============================================================================
// ValidationLimits.swift
// Shared/Constants
// =============================================================================
// Validation limits and constraints for lead data.
// =============================================================================

import Foundation

/// Validation limits and constraints
public enum ValidationLimits {

    // MARK: - String Length Limits

    /// Email address limits
    public enum Email {
        /// Minimum email length (a@b.co)
        public static let minLength = 6
        /// Maximum email length per RFC 5321
        public static let maxLength = 254
        /// Maximum local part length (before @)
        public static let maxLocalPartLength = 64
        /// Maximum domain length (after @)
        public static let maxDomainLength = 253
    }

    /// Name field limits
    public enum Name {
        /// Minimum name length
        public static let minLength = 1
        /// Maximum name length
        public static let maxLength = 100
    }

    /// Company field limits
    public enum Company {
        /// Maximum company name length
        public static let maxLength = 200
    }

    /// Phone number limits
    public enum Phone {
        /// Minimum phone length (with country code)
        public static let minLength = 7
        /// Maximum phone length
        public static let maxLength = 20
    }

    /// Notes/message field limits
    public enum Notes {
        /// Maximum notes length
        public static let maxLength = 2000
    }

    /// Source field limits
    public enum Source {
        /// Maximum source identifier length
        public static let maxLength = 100
        /// Allowed source values
        public static let allowedSources: Set<String> = [
            "website",
            "landing_page",
            "referral",
            "api",
            "import",
            "manual",
            "social",
            "email_campaign",
            "paid_ads",
            "organic",
            "partner",
            "event",
        ]
    }

    // MARK: - Rate Limiting

    /// Rate limiting configuration
    public enum RateLimit {
        /// Maximum requests per IP per window
        public static let maxRequestsPerIP = 10
        /// Rate limit window in seconds
        public static let windowSeconds = 60
        /// Maximum leads per email per day
        public static let maxLeadsPerEmailPerDay = 3
        /// Burst limit for short windows
        public static let burstLimit = 5
        /// Burst window in seconds
        public static let burstWindowSeconds = 10
    }

    // MARK: - Idempotency

    /// Idempotency configuration
    public enum Idempotency {
        /// Minimum idempotency key length
        public static let keyMinLength = 16
        /// Maximum idempotency key length
        public static let keyMaxLength = 64
        /// Idempotency window in seconds (24 hours)
        public static let windowSeconds = 86400
        /// Key pattern regex
        public static let keyPattern = "^[a-zA-Z0-9_-]+$"
    }

    // MARK: - Regex Patterns

    /// Validation regex patterns (string definitions)
    public enum Patterns {
        /// RFC 5322 compliant email regex (simplified)
        public static let email = #"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"#

        /// E.164 phone number format (international)
        public static let phoneE164 = #"^\+[1-9]\d{6,14}$"#

        /// Loose phone number format (allows various formats)
        public static let phoneLoose = #"^[\d\s\-\(\)\+\.]{7,20}$"#

        /// Name validation (letters, spaces, hyphens, apostrophes)
        public static let name = #"^[\p{L}\s\-'\.]+$"#

        /// Alphanumeric with underscores and hyphens
        public static let alphanumericExtended = #"^[a-zA-Z0-9_-]+$"#

        /// UUID v4 format
        public static let uuidV4 = #"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"#
    }

    // MARK: - Pre-compiled Regex (Performance Optimization)

    /// Pre-compiled regex patterns for validation - compiled once at load time
    /// This avoids the overhead of compiling regex on every validation call
    public enum CompiledPatterns {
        /// Pre-compiled email regex
        public static let email: NSRegularExpression? = {
            try? NSRegularExpression(pattern: Patterns.email, options: .caseInsensitive)
        }()

        /// Pre-compiled E.164 phone regex
        public static let phoneE164: NSRegularExpression? = {
            try? NSRegularExpression(pattern: Patterns.phoneE164)
        }()

        /// Pre-compiled loose phone regex
        public static let phoneLoose: NSRegularExpression? = {
            try? NSRegularExpression(pattern: Patterns.phoneLoose)
        }()

        /// Pre-compiled name regex
        public static let name: NSRegularExpression? = {
            try? NSRegularExpression(pattern: Patterns.name, options: .caseInsensitive)
        }()

        /// Pre-compiled alphanumeric extended regex
        public static let alphanumericExtended: NSRegularExpression? = {
            try? NSRegularExpression(pattern: Patterns.alphanumericExtended)
        }()

        /// Pre-compiled idempotency key regex
        public static let idempotencyKey: NSRegularExpression? = {
            try? NSRegularExpression(pattern: Idempotency.keyPattern)
        }()
    }

    // MARK: - DynamoDB Limits

    /// DynamoDB specific limits
    public enum DynamoDB {
        /// Maximum item size in bytes (400KB)
        public static let maxItemSizeBytes = 400 * 1024
        /// Maximum attribute name length
        public static let maxAttributeNameLength = 65535
        /// Maximum batch write items
        public static let maxBatchWriteItems = 25
        /// Maximum batch get items
        public static let maxBatchGetItems = 100
    }

    // MARK: - API Limits

    /// API request limits
    public enum API {
        /// Maximum request body size in bytes (1MB)
        public static let maxRequestBodyBytes = 1024 * 1024
        /// Request timeout in seconds
        public static let requestTimeoutSeconds = 30
        /// Maximum retries for transient failures
        public static let maxRetries = 3
        /// Retry backoff base in milliseconds
        public static let retryBackoffBaseMs = 100
    }

    // MARK: - Validation Helpers

    /// Validate email format using pre-compiled regex
    /// - Parameter email: The email to validate
    /// - Returns: True if valid
    @inlinable
    public static func isValidEmail(_ email: String) -> Bool {
        guard email.count >= Email.minLength,
              email.count <= Email.maxLength else {
            return false
        }

        let parts = email.split(separator: "@")
        guard parts.count == 2,
              parts[0].count <= Email.maxLocalPartLength,
              parts[1].count <= Email.maxDomainLength else {
            return false
        }

        guard let regex = CompiledPatterns.email else { return false }
        let range = NSRange(email.startIndex..., in: email)
        return regex.firstMatch(in: email, options: [], range: range) != nil
    }

    /// Validate phone number format using pre-compiled regex
    /// - Parameter phone: The phone number to validate
    /// - Parameter strict: Use E.164 strict format
    /// - Returns: True if valid
    @inlinable
    public static func isValidPhone(_ phone: String, strict: Bool = false) -> Bool {
        guard phone.count >= Phone.minLength,
              phone.count <= Phone.maxLength else {
            return false
        }

        let regex = strict ? CompiledPatterns.phoneE164 : CompiledPatterns.phoneLoose
        guard let regex else { return false }
        let range = NSRange(phone.startIndex..., in: phone)
        return regex.firstMatch(in: phone, options: [], range: range) != nil
    }

    /// Validate name format using pre-compiled regex
    /// - Parameter name: The name to validate
    /// - Returns: True if valid
    @inlinable
    public static func isValidName(_ name: String) -> Bool {
        guard name.count >= Name.minLength,
              name.count <= Name.maxLength else {
            return false
        }

        guard let regex = CompiledPatterns.name else { return false }
        let range = NSRange(name.startIndex..., in: name)
        return regex.firstMatch(in: name, options: [], range: range) != nil
    }

    /// Validate idempotency key format using pre-compiled regex
    /// - Parameter key: The idempotency key to validate
    /// - Returns: True if valid
    @inlinable
    public static func isValidIdempotencyKey(_ key: String) -> Bool {
        guard key.count >= Idempotency.keyMinLength,
              key.count <= Idempotency.keyMaxLength else {
            return false
        }

        guard let regex = CompiledPatterns.idempotencyKey else { return false }
        let range = NSRange(key.startIndex..., in: key)
        return regex.firstMatch(in: key, options: [], range: range) != nil
    }

    /// Validate source value
    /// - Parameter source: The source to validate
    /// - Returns: True if valid
    public static func isValidSource(_ source: String) -> Bool {
        guard source.count <= Source.maxLength else {
            return false
        }
        return Source.allowedSources.contains(source.lowercased())
    }

    /// Sanitize string by trimming and limiting length
    /// - Parameters:
    ///   - string: The string to sanitize
    ///   - maxLength: Maximum allowed length
    /// - Returns: Sanitized string
    public static func sanitize(_ string: String, maxLength: Int) -> String {
        let trimmed = string.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.count <= maxLength {
            return trimmed
        }
        return String(trimmed.prefix(maxLength))
    }
}
