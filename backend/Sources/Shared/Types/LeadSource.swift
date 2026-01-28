// =============================================================================
// LeadSource.swift
// Shared/Types
// =============================================================================
// Source channels for lead acquisition.
// =============================================================================

import Foundation

// MARK: - Lead Source

/// Source of the lead
public enum LeadSource: String, Codable, CaseIterable, Sendable {
    case website = "WEBSITE"
    case landingPage = "LANDING_PAGE"
    case referral = "REFERRAL"
    case api = "API"
    case `import` = "IMPORT"
    case manual = "MANUAL"
    case social = "SOCIAL"
    case emailCampaign = "EMAIL_CAMPAIGN"
    case paidAds = "PAID_ADS"
    case organic = "ORGANIC"
    case partner = "PARTNER"
    case event = "EVENT"

    /// Initialize from string (case-insensitive)
    public init?(string: String) {
        let normalized = string.uppercased().replacingOccurrences(of: "-", with: "_")
        self.init(rawValue: normalized)
    }

    /// Human-readable description
    public var description: String {
        switch self {
        case .website: return "Website"
        case .landingPage: return "Landing Page"
        case .referral: return "Referral"
        case .api: return "API"
        case .import: return "Import"
        case .manual: return "Manual Entry"
        case .social: return "Social Media"
        case .emailCampaign: return "Email Campaign"
        case .paidAds: return "Paid Advertising"
        case .organic: return "Organic Search"
        case .partner: return "Partner"
        case .event: return "Event"
        }
    }
}
