// =============================================================================
// TimestampHelpers.swift
// Shared/Types
// =============================================================================
// ISO8601 date formatting and parsing utilities.
// =============================================================================

import Foundation

// MARK: - Timestamp Helpers

/// ISO8601 date formatter for API responses
public let iso8601Formatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
}()

/// Format date to ISO8601 string
public func formatISO8601(_ date: Date) -> String {
    return iso8601Formatter.string(from: date)
}

/// Parse ISO8601 string to date
public func parseISO8601(_ string: String) -> Date? {
    return iso8601Formatter.date(from: string)
}
