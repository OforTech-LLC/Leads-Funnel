// =============================================================================
// DynamoDBItem.swift
// LeadCaptureAPI/Models
// =============================================================================
// Protocol for DynamoDB items in single-table design.
// =============================================================================

import Foundation
import Shared

// MARK: - DynamoDB Item Protocol

/// Protocol for DynamoDB items with pk/sk
public protocol DynamoDBItem: Codable, Sendable {
    var pk: String { get }
    var sk: String { get }
    var entityType: String { get }
}
