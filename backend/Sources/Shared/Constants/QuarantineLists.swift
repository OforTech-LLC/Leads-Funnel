// =============================================================================
// QuarantineLists.swift
// Shared/Constants
// =============================================================================
// Known disposable email domains and spam patterns for quarantine detection.
// =============================================================================

import Foundation

/// Lists of known disposable email domains and spam patterns
public enum QuarantineLists {

    // MARK: - Disposable Email Domains

    /// Common disposable/temporary email domains
    public static let disposableEmailDomains: Set<String> = [
        // Popular disposable email services
        "10minutemail.com",
        "10minutemail.net",
        "20minutemail.com",
        "guerrillamail.com",
        "guerrillamail.info",
        "guerrillamail.net",
        "guerrillamail.org",
        "mailinator.com",
        "mailinator.net",
        "mailinator.org",
        "tempmail.com",
        "tempmail.net",
        "temp-mail.org",
        "throwaway.email",
        "throwawaymail.com",
        "fakeinbox.com",
        "fakemailgenerator.com",
        "getnada.com",
        "getairmail.com",
        "dispostable.com",
        "mailnesia.com",
        "maildrop.cc",
        "mintemail.com",
        "mytrashmail.com",
        "sharklasers.com",
        "spamgourmet.com",
        "trashmail.com",
        "trashmail.net",
        "yopmail.com",
        "yopmail.fr",
        "yopmail.net",
        "mohmal.com",
        "discard.email",
        "discardmail.com",
        "mailcatch.com",
        "mailexpire.com",
        "mailnull.com",
        "mailsac.com",
        "spam4.me",
        "spambox.us",
        "spamcannon.com",
        "spamcannon.net",
        "spamcero.com",
        "spamcon.org",
        "spamex.com",
        "spamfree24.org",
        "spamhole.com",
        "spamify.com",
        "spaml.com",
        "spamspot.com",
        "tempr.email",
        "tempinbox.com",
        "tempinbox.co.uk",
        "throwam.com",
        "trash2009.com",
        "trashmail.ws",
        "wegwerfmail.de",
        "wegwerfmail.net",
        "wegwerfmail.org",
        "zoemail.net",
        "emailondeck.com",
        "emkei.cz",
        "anonymbox.com",
        "burnermail.io",
        "jetable.org",
    ]

    // MARK: - Spam Patterns

    /// Patterns commonly found in spam submissions
    public static let spamPatterns: [String] = [
        // Common spam keywords
        "viagra",
        "cialis",
        "casino",
        "lottery",
        "winner",
        "prize",
        "free money",
        "bitcoin",
        "crypto",
        "investment opportunity",
        "make money fast",
        "work from home",
        "click here",
        "act now",
        "limited time",
        "congratulations",
        "you have been selected",
        "nigerian prince",
        "wire transfer",
        "western union",
        "paypal",
        "bank account",
        "credit card",
        "social security",
        "password",
        "verify your account",
        "suspended account",
        "urgent action",
        "dear friend",
        "dear sir/madam",
        "to whom it may concern",
        "100% free",
        "100% satisfied",
        "additional income",
        "be your own boss",
        "cash bonus",
        "double your",
        "earn extra cash",
        "extra cash",
        "financial freedom",
        "free access",
        "free consultation",
        "free gift",
        "free info",
        "free membership",
        "free offer",
        "free preview",
        "free quote",
        "free trial",
        "gift card",
        "great offer",
        "guarantee",
        "increase your",
        "incredible deal",
        "info you requested",
        "information you requested",
        "instant",
        "limited time only",
        "lower your",
        "lowest price",
        "luxury",
        "new customers only",
        "no catch",
        "no cost",
        "no fees",
        "no gimmick",
        "no hidden",
        "no obligation",
        "no purchase necessary",
        "no questions asked",
        "no strings attached",
        "obligation",
        "offer expires",
        "once in a lifetime",
        "one time",
        "opportunity",
        "opt in",
        "order now",
        "please read",
        "potential earnings",
        "pre-approved",
        "promise you",
        "pure profit",
        "risk-free",
        "satisfaction guaranteed",
        "save big",
        "save up to",
        "special promotion",
        "this isn't spam",
        "unsubscribe",
        "urgent",
        "web traffic",
        "while supplies last",
        "why pay more",
        "winner",
        "you are a winner",
        "you have been chosen",
        "you're a winner",
    ]

    // MARK: - Suspicious TLDs

    /// Top-level domains commonly associated with spam
    public static let suspiciousTLDs: Set<String> = [
        ".xyz",
        ".top",
        ".win",
        ".loan",
        ".work",
        ".click",
        ".link",
        ".download",
        ".stream",
        ".gdn",
        ".racing",
        ".review",
        ".country",
        ".science",
        ".party",
        ".date",
        ".faith",
        ".accountant",
        ".cricket",
        ".bid",
        ".trade",
        ".webcam",
        ".men",
        ".kim",
    ]

    // MARK: - Test Email Patterns

    /// Patterns indicating test/fake submissions
    public static let testPatterns: [String] = [
        "test@test",
        "test@example",
        "example@example",
        "foo@bar",
        "asdf@asdf",
        "aaa@aaa",
        "fake@fake",
        "noemail@",
        "no@email",
        "none@none",
        "na@na",
        "null@null",
        "@mailinator",
        "@guerrillamail",
        "@yopmail",
        "admin@admin",
        "user@user",
        "sample@sample",
    ]

    // MARK: - Pre-computed Sets for O(1) Lookups

    /// Pre-computed set of lowercase disposable domains for O(1) lookup
    @usableFromInline
    static let disposableDomainsSet: Set<String> = Set(disposableEmailDomains)

    // MARK: - Validation Methods

    /// Check if an email domain is disposable (O(1) lookup)
    /// - Parameter email: The email address to check
    /// - Returns: True if the domain is known to be disposable
    @inlinable
    public static func isDisposableEmail(_ email: String) -> Bool {
        guard let atIndex = email.lastIndex(of: "@") else {
            return false
        }
        let domain = String(email[email.index(after: atIndex)...]).lowercased()
        return disposableDomainsSet.contains(domain)
    }

    /// Check if an email has a suspicious TLD (early exit on match)
    /// - Parameter email: The email address to check
    /// - Returns: True if the TLD is suspicious
    public static func hasSuspiciousTLD(_ email: String) -> Bool {
        let lowercased = email.lowercased()
        // Early exit on first match
        for tld in suspiciousTLDs {
            if lowercased.hasSuffix(tld) {
                return true
            }
        }
        return false
    }

    /// Check if text contains spam patterns (optimized with early termination option)
    /// - Parameters:
    ///   - text: The text to check
    ///   - limit: Maximum number of patterns to return (0 for all)
    /// - Returns: Array of matched spam patterns
    public static func findSpamPatterns(in text: String, limit: Int = 0) -> [String] {
        let lowercased = text.lowercased()
        var matches: [String] = []
        matches.reserveCapacity(min(5, spamPatterns.count)) // Pre-allocate for typical case

        for pattern in spamPatterns {
            if lowercased.contains(pattern) {
                matches.append(pattern)
                // Early termination if we only need limited results
                if limit > 0 && matches.count >= limit {
                    break
                }
            }
        }
        return matches
    }

    /// Fast check if text contains any spam pattern (early exit on first match)
    /// - Parameter text: The text to check
    /// - Returns: True if any spam pattern is found
    public static func containsSpamPattern(in text: String) -> Bool {
        let lowercased = text.lowercased()
        return spamPatterns.contains { lowercased.contains($0) }
    }

    /// Check if an email matches test patterns (early exit on first match)
    /// - Parameter email: The email to check
    /// - Returns: True if it matches a test pattern
    public static func isTestEmail(_ email: String) -> Bool {
        let lowercased = email.lowercased()
        return testPatterns.contains { lowercased.contains($0) }
    }

    /// Comprehensive quarantine check
    /// - Parameters:
    ///   - email: The email address
    ///   - name: Optional name field
    ///   - company: Optional company field
    ///   - notes: Optional notes field
    /// - Returns: Tuple of (shouldQuarantine, reasons)
    public static func shouldQuarantine(
        email: String,
        name: String? = nil,
        company: String? = nil,
        notes: String? = nil
    ) -> (quarantine: Bool, reasons: [String]) {
        var reasons: [String] = []

        // Check disposable email
        if isDisposableEmail(email) {
            reasons.append("disposable_email_domain")
        }

        // Check suspicious TLD
        if hasSuspiciousTLD(email) {
            reasons.append("suspicious_tld")
        }

        // Check test patterns
        if isTestEmail(email) {
            reasons.append("test_email_pattern")
        }

        // Check spam patterns in all fields
        let allText = [email, name, company, notes].compactMap { $0 }.joined(separator: " ")
        let spamMatches = findSpamPatterns(in: allText)
        if !spamMatches.isEmpty {
            reasons.append("spam_patterns:\(spamMatches.prefix(3).joined(separator: ","))")
        }

        return (!reasons.isEmpty, reasons)
    }
}
