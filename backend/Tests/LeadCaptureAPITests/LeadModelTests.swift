// =============================================================================
// LeadModelTests.swift
// LeadCaptureAPITests
// =============================================================================
// Tests for Lead model and related DTOs.
// =============================================================================

import XCTest
@testable import LeadCaptureAPI
@testable import Shared

final class LeadModelTests: XCTestCase {

    // MARK: - Lead Initialization Tests

    func testLead_InitWithDefaults() {
        let lead = Lead(email: "user@example.com")

        XCTAssertFalse(lead.id.isEmpty)
        XCTAssertEqual(lead.email, "user@example.com")
        XCTAssertNil(lead.name)
        XCTAssertNil(lead.company)
        XCTAssertEqual(lead.source, .website)
        XCTAssertEqual(lead.status, .new)
        XCTAssertNil(lead.quarantineReasons)
    }

    func testLead_InitWithAllFields() {
        let createdAt = Date()
        let lead = Lead(
            id: "test-id",
            email: "USER@EXAMPLE.COM",
            name: "  John Doe  ",
            company: "Acme Corp",
            phone: "+1234567890",
            notes: "Test notes",
            source: .referral,
            status: .contacted,
            createdAt: createdAt,
            ipAddress: "192.168.1.1",
            userAgent: "Mozilla/5.0"
        )

        XCTAssertEqual(lead.id, "test-id")
        XCTAssertEqual(lead.email, "user@example.com") // Lowercased and trimmed
        XCTAssertEqual(lead.name, "John Doe") // Trimmed
        XCTAssertEqual(lead.company, "Acme Corp")
        XCTAssertEqual(lead.phone, "+1234567890")
        XCTAssertEqual(lead.notes, "Test notes")
        XCTAssertEqual(lead.source, .referral)
        XCTAssertEqual(lead.status, .contacted)
        XCTAssertEqual(lead.createdAt, createdAt)
        XCTAssertEqual(lead.ipAddress, "192.168.1.1")
        XCTAssertEqual(lead.userAgent, "Mozilla/5.0")
    }

    // MARK: - DynamoDB Key Tests

    func testLead_PKFormat() {
        let lead = Lead(id: "abc123", email: "user@example.com")
        XCTAssertEqual(lead.pk, "LEAD#abc123")
    }

    func testLead_SKFormat() {
        let date = Date()
        let lead = Lead(email: "user@example.com", createdAt: date)
        XCTAssertTrue(lead.sk.hasPrefix("METADATA#"))
        XCTAssertTrue(lead.sk.contains(formatISO8601(date)))
    }

    func testLead_GSI1PKFormat() {
        let lead = Lead(email: "User@Example.Com")
        XCTAssertEqual(lead.gsi1pk, "EMAIL#user@example.com")
    }

    func testLead_GSI1SKFormat() {
        let lead = Lead(id: "abc123", email: "user@example.com")
        XCTAssertEqual(lead.gsi1sk, "LEAD#abc123")
    }

    // MARK: - CreateLeadRequest Tests

    func testCreateLeadRequest_ToLead() {
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

        XCTAssertEqual(lead.email, "user@example.com")
        XCTAssertEqual(lead.name, "John Doe")
        XCTAssertEqual(lead.company, "Acme Corp")
        XCTAssertEqual(lead.phone, "+1234567890")
        XCTAssertEqual(lead.notes, "Test notes")
        XCTAssertEqual(lead.source, .referral)
        XCTAssertEqual(lead.status, .new)
        XCTAssertEqual(lead.ipAddress, "192.168.1.1")
        XCTAssertEqual(lead.userAgent, "Mozilla/5.0")
        XCTAssertEqual(lead.metadata?["key"], "value")
    }

    func testCreateLeadRequest_ToLead_WithInvalidSource() {
        let request = CreateLeadRequest(
            email: "user@example.com",
            source: "invalid_source"
        )

        let lead = request.toLead()

        XCTAssertEqual(lead.source, .website) // Defaults to website
    }

    func testCreateLeadRequest_ToLead_WithNilSource() {
        let request = CreateLeadRequest(
            email: "user@example.com",
            source: nil
        )

        let lead = request.toLead()

        XCTAssertEqual(lead.source, .website)
    }

    // MARK: - LeadResponse Tests

    func testLeadResponse_FromLead() {
        let createdAt = Date()
        let updatedAt = Date()
        let lead = Lead(
            id: "test-id",
            email: "user@example.com",
            name: "John Doe",
            company: "Acme Corp",
            phone: "+1234567890",
            notes: "Test notes",
            source: .referral,
            status: .contacted,
            createdAt: createdAt,
            updatedAt: updatedAt,
            metadata: ["key": "value"]
        )

        let response = LeadResponse(from: lead)

        XCTAssertEqual(response.id, "test-id")
        XCTAssertEqual(response.email, "user@example.com")
        XCTAssertEqual(response.name, "John Doe")
        XCTAssertEqual(response.company, "Acme Corp")
        XCTAssertEqual(response.phone, "+1234567890")
        XCTAssertEqual(response.notes, "Test notes")
        XCTAssertEqual(response.source, "referral")
        XCTAssertEqual(response.status, "contacted")
        XCTAssertEqual(response.createdAt, formatISO8601(createdAt))
        XCTAssertEqual(response.updatedAt, formatISO8601(updatedAt))
        XCTAssertEqual(response.metadata?["key"], "value")
    }

    // MARK: - APIResponse Tests

    func testAPIResponse_Success() {
        let leadResponse = LeadResponse(from: Lead(email: "user@example.com"))
        let apiResponse = APIResponse.success(leadResponse, requestId: "req-123")

        XCTAssertTrue(apiResponse.success)
        XCTAssertNotNil(apiResponse.data)
        XCTAssertNil(apiResponse.error)
        XCTAssertEqual(apiResponse.requestId, "req-123")
    }

    func testAPIResponse_Error() {
        let errorResponse = APIErrorResponse(
            code: .invalidEmail,
            message: "Invalid email format"
        )
        let apiResponse = APIResponse<EmptyResponse>(
            success: false,
            data: nil,
            error: errorResponse,
            requestId: "req-123"
        )

        XCTAssertFalse(apiResponse.success)
        XCTAssertNil(apiResponse.data)
        XCTAssertNotNil(apiResponse.error)
        XCTAssertEqual(apiResponse.error?.code, "INVALID_EMAIL")
    }

    // MARK: - Codable Tests

    func testLead_Codable() throws {
        let lead = Lead(
            email: "user@example.com",
            name: "John Doe",
            source: .website,
            status: .new
        )

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let data = try encoder.encode(lead)

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let decoded = try decoder.decode(Lead.self, from: data)

        XCTAssertEqual(decoded.id, lead.id)
        XCTAssertEqual(decoded.email, lead.email)
        XCTAssertEqual(decoded.name, lead.name)
        XCTAssertEqual(decoded.source, lead.source)
        XCTAssertEqual(decoded.status, lead.status)
    }

    func testCreateLeadRequest_Decodable() throws {
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

        XCTAssertEqual(request.email, "user@example.com")
        XCTAssertEqual(request.name, "John Doe")
        XCTAssertEqual(request.company, "Acme Corp")
        XCTAssertEqual(request.source, "website")
    }

    // MARK: - Equatable Tests

    func testLead_Equatable() {
        let lead1 = Lead(id: "abc123", email: "user@example.com")
        let lead2 = Lead(id: "abc123", email: "user@example.com")
        let lead3 = Lead(id: "xyz789", email: "user@example.com")

        XCTAssertEqual(lead1, lead2)
        XCTAssertNotEqual(lead1, lead3)
    }
}
