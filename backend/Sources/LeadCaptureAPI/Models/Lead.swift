import Foundation
import Vapor
import Shared

public struct LeadAnalysis: Content {
    public var urgency: String
    public var intent: String
    public var language: String
    public var summary: String

    public init(urgency: String, intent: String, language: String, summary: String) {
        self.urgency = urgency
        self.intent = intent
        self.language = language
        self.summary = summary
    }
}

public struct Lead: Content {
    public var id: UUID?
    public var email: String
    public var phone: String?
    public var name: String?
    public var message: String?
    public var funnelId: String?
    public var status: LeadStatus // Changed to LeadStatus enum
    public var analysis: LeadAnalysis?

    // Added fields to match usage in other files
    public var company: String?
    public var source: String // Changed to String to match usage, ideally enum
    public var createdAt: Date
    public var updatedAt: Date
    public var metadata: [String: String]?
    public var ipAddress: String?
    public var userAgent: String?
    public var quarantineReasons: [String]?
    public var notes: String?
    public var tags: [String]?
    public var ttl: Int?
    public var pk: String? // For DynamoDB mapping
    public var sk: String? // For DynamoDB mapping
    public var gsi1pk: String? // For DynamoDB mapping
    public var gsi1sk: String? // For DynamoDB mapping

    public init(
        id: UUID? = nil,
        email: String,
        phone: String? = nil,
        name: String? = nil,
        message: String? = nil,
        funnelId: String? = nil,
        status: LeadStatus = .new,
        analysis: LeadAnalysis? = nil,
        company: String? = nil,
        source: String = "website",
        createdAt: Date = Date(),
        updatedAt: Date = Date(),
        metadata: [String: String]? = nil,
        ipAddress: String? = nil,
        userAgent: String? = nil,
        quarantineReasons: [String]? = nil,
        notes: String? = nil,
        tags: [String]? = nil,
        ttl: Int? = nil,
        pk: String? = nil,
        sk: String? = nil,
        gsi1pk: String? = nil,
        gsi1sk: String? = nil
    ) {
        self.id = id
        self.email = email
        self.phone = phone
        self.name = name
        self.message = message
        self.funnelId = funnelId
        self.status = status
        self.analysis = analysis
        self.company = company
        self.source = source
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.metadata = metadata
        self.ipAddress = ipAddress
        self.userAgent = userAgent
        self.quarantineReasons = quarantineReasons
        self.notes = notes
        self.tags = tags
        self.ttl = ttl
        self.pk = pk
        self.sk = sk
        self.gsi1pk = gsi1pk
        self.gsi1sk = gsi1sk
    }
}
