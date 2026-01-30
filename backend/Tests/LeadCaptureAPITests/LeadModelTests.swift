// =============================================================================
// LeadModelTests.swift
// LeadCaptureAPITests
// =============================================================================
// Tests for Lead model and related DTOs.
// =============================================================================

import Testing
import Foundation
@testable import LeadCaptureAPI
@testable import Shared

struct LeadModelTests {

    // MARK: - Lead Initialization Tests

    @Test func testLead_InitWithDefaults() {
        let lead = Lead(email: "user@example.com")

        #expect(lead.id == nil)
        #expect(lead.email == "user@example.com")
        #expect(lead.name == nil)
        #expect(lead.company == nil)
        #expect(lead.source == "website")
        #expect(lead.status == .new)
        #expect(lead.quarantineReasons == nil)
    }

    @Test func testLead_InitWithAllFields() {
        let createdAt = Date()
        let id = UUID()
        let analysis = LeadAnalysis(urgency: "high", intent: "buy", language: "en", summary: "Hot lead")

        let lead = Lead(
            id: id,
            email: "USER@EXAMPLE.COM",
            phone: "+1234567890",
            name: "  John Doe  ",
            message: "Test notes",
            funnelId: "test-funnel",
            status: .contacted,
            analysis: analysis,
            company: "Acme Corp",
            source: "referral",
            createdAt: createdAt,
            updatedAt: createdAt,
            metadata: ["key": "value"],
            ipAddress: "192.168.1.1",
            userAgent: "Mozilla/5.0",
            notes: "Test notes"
        )

        #expect(lead.id == id)
        #expect(lead.email == "USER@EXAMPLE.COM")
        #expect(lead.name == "  John Doe  ")
        #expect(lead.company == "Acme Corp")
        #expect(lead.phone == "+1234567890")
        #expect(lead.message == "Test notes")
        #expect(lead.source == "referral")
        #expect(lead.status == .contacted)
        #expect(lead.createdAt == createdAt)
        #expect(lead.ipAddress == "192.168.1.1")
        #expect(lead.userAgent == "Mozilla/5.0")
        #expect(lead.analysis?.urgency == "high")
    }

    // MARK: - DynamoDB Key Tests

    @Test func testLead_PKFormat() {
        let id = UUID()
        let lead = Lead(id: id, email: "user@example.com")
        #expect(lead.pk == nil)

        // PK logic is in EntityType
        let pk = "\(EntityType.lead.pkPrefix)\(id.uuidString)"
        #expect(pk == "LEAD#\(id.uuidString)")
    }

    // MARK: - CreateLeadRequest Tests

    @Test func testCreateLeadRequest_ToLead() {
        let request = CreateLeadRequest(
            email: "user@example.com",
            name: "John Doe",
            company: "Acme Corp",
            phone: "+1234567890",
            notes: "Test notes",
            source: "referral",
            metadata: ["key": "value"]
        )

        let lead = request.toLead(
            ipAddress: "192.168.1.1",
            userAgent: "Mozilla/5.0"
        )

        #expect(lead.email == "user@example.com")
        #expect(lead.name == "John Doe")
        #expect(lead.company == "Acme Corp")
        #expect(lead.phone == "+1234567890")
        #expect(lead.message == "Test notes")
        #expect(lead.source == "REFERRAL")
        #expect(lead.status == .new)
        #expect(lead.ipAddress == "192.168.1.1")
        #expect(lead.userAgent == "Mozilla/5.0")
        #expect(lead.metadata?["key"] == "value")
    }

    @Test func testCreateLeadRequest_ToLead_WithInvalidSource() {
        let request = CreateLeadRequest(
            email: "user@example.com",
            source: "invalid_source"
        )

        let lead = request.toLead()

        // LeadSource(string:) returns nil for invalid, defaulting to .website ("WEBSITE")
        #expect(lead.source == "WEBSITE")
    }

    @Test func testCreateLeadRequest_ToLead_WithNilSource() {
        let request = CreateLeadRequest(
            email: "user@example.com",
            source: nil
        )

        let lead = request.toLead()

        #expect(lead.source == "WEBSITE")
    }

    // MARK: - LeadResponse Tests

    @Test func testLeadResponse_FromLead() {
        let createdAt = Date()
        let updatedAt = Date()
        let id = UUID()
        let lead = Lead(
            id: id,
            email: "user@example.com",
            phone: "+1234567890",
            name: "John Doe",
            message: "Test notes",
            status: .contacted,
            company: "Acme Corp",
            source: "referral",
            createdAt: createdAt,
            updatedAt: updatedAt,
            metadata: ["key": "value"],
            notes: "Test notes"
        )

        let response = LeadResponse(from: lead)

        #expect(response.id == id.uuidString)
        #expect(response.email == "user@example.com")
        #expect(response.name == "John Doe")
        #expect(response.company == "Acme Corp")
        #expect(response.phone == "+1234567890")
        #expect(response.notes == "Test notes")
        #expect(response.source == "referral")
        #expect(response.status == "contacted")
        #expect(response.createdAt == formatISO8601(createdAt))
        #expect(response.updatedAt == formatISO8601(updatedAt))
        #expect(response.metadata?["key"] == "value")
    }

    // MARK: - Codable Tests

    @Test func testLead_Codable() throws {
        let lead = Lead(
            email: "user@example.com",
            name: "John Doe",
            status: .new,
            source: "website"
        )

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let data = try encoder.encode(lead)

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let decoded = try decoder.decode(Lead.self, from: data)

        #expect(decoded.id == lead.id)
        #expect(decoded.email == lead.email)
        #expect(decoded.name == lead.name)
        #expect(decoded.source == lead.source)
        #expect(decoded.status == lead.status)
    }

    @Test func testCreateLeadRequest_Decodable() throws {
        let json = """
        {
            "email": "user@example.com",
            "name": "John Doe",
            "company": "Acme Corp",
            "source": "website"
        }
        """

        let data = json.data(using: .utf8)!
        let request = try JSONDecoder().decode(CreateLeadRequest.self, from: data)

        #expect(request.email == "user@example.com")
        #expect(request.name == "John Doe")
        #expect(request.company == "Acme Corp")
        #expect(request.source == "website")
    }
}
