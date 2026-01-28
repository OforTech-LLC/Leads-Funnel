// =============================================================================
// LeadStatus.swift
// Shared/Types
// =============================================================================
// Status of a lead in the system lifecycle.
// =============================================================================

import Foundation

// MARK: - Lead Status

/// Status of a lead in the system
public enum LeadStatus: String, Codable, CaseIterable, Sendable {
    /// New lead, not yet processed
    case new = "NEW"
    /// Lead has been contacted
    case contacted = "CONTACTED"
    /// Lead is qualified and engaged
    case qualified = "QUALIFIED"
    /// Lead converted to customer
    case converted = "CONVERTED"
    /// Lead is not interested or unresponsive
    case closed = "CLOSED"
    /// Lead flagged for review (spam/suspicious)
    case quarantined = "QUARANTINED"

    /// Human-readable description
    public var description: String {
        switch self {
        case .new: return "New Lead"
        case .contacted: return "Contacted"
        case .qualified: return "Qualified"
        case .converted: return "Converted"
        case .closed: return "Closed"
        case .quarantined: return "Quarantined"
        }
    }

    /// Whether this status represents an active lead
    public var isActive: Bool {
        switch self {
        case .new, .contacted, .qualified:
            return true
        case .converted, .closed, .quarantined:
            return false
        }
    }
}
