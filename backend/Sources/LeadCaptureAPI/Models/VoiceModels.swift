// =============================================================================
// VoiceModels.swift
// LeadCaptureAPI/Models
// =============================================================================
// Request and response types for voice agent endpoints.
// =============================================================================

import Foundation
import Vapor

// MARK: - Call Request/Response

/// Request to initiate a call
public struct InitiateCallRequest: Content {
    public let phoneNumber: String
    public let leadId: String?
    public let agentId: String?
    public let metadata: [String: String]?
}

/// Response for initiated call
public struct InitiateCallResponse: Content {
    public let callId: String
    public let status: String
    public let phoneNumber: String
    public let estimatedStartTime: String
    public let queuePosition: Int
}

// MARK: - Webhook Types

/// Call status webhook update
public struct CallStatusUpdate: Content {
    public let callId: String
    public let status: String
    public let timestamp: String
    public let duration: Int?
    public let outcome: String?
}

/// Recording webhook update
public struct RecordingUpdate: Content {
    public let callId: String
    public let recordingUrl: String
    public let durationSeconds: Int
    public let timestamp: String
}

// MARK: - Voice Agent

/// Voice agent model
public struct VoiceAgent: Content {
    public let id: String
    public let name: String
    public let description: String
    public let status: String
    public let language: String
}

/// List agents response
public struct ListAgentsResponse: Content {
    public let agents: [VoiceAgent]
    public let total: Int
}

// MARK: - Call History

/// Call summary for listings
public struct CallSummary: Content {
    public let callId: String
    public let phoneNumber: String
    public let status: String
    public let duration: Int?
    public let createdAt: String
}

/// List calls response
public struct ListCallsResponse: Content {
    public let calls: [CallSummary]
    public let total: Int
    public let hasMore: Bool
}

// MARK: - Feature Disabled Response

/// Voice feature disabled response
public struct VoiceFeatureDisabledResponse: Content {
    public let success: Bool
    public let error: VoiceFeatureError
    public let requestId: String
}

/// Voice feature error
public struct VoiceFeatureError: Content {
    public let code: String
    public let message: String
    public let retryAfter: Int
}
