// =============================================================================
// FunnelStats.swift
// LeadCaptureAPI/Models
// =============================================================================
// Statistics and reporting types for funnels.
// =============================================================================

import Foundation
import Vapor

// MARK: - Funnel Stats

/// Statistics for a funnel
public struct FunnelStats: Content, Sendable {

    /// Funnel ID
    public let funnelId: String

    /// Total leads captured
    public let totalLeads: Int

    /// Leads captured today
    public let leadsToday: Int

    /// Leads captured this week
    public let leadsThisWeek: Int

    /// Leads captured this month
    public let leadsThisMonth: Int

    /// Conversion rate (if applicable)
    public let conversionRate: Double?

    /// Quarantine rate
    public let quarantineRate: Double

    /// Average spam score
    public let averageSpamScore: Double

    /// Top sources
    public let topSources: [SourceCount]

    /// Stats timestamp
    public let calculatedAt: Date
}

// MARK: - Source Count

/// Source count for stats
public struct SourceCount: Content, Sendable {
    public let source: String
    public let count: Int
}
