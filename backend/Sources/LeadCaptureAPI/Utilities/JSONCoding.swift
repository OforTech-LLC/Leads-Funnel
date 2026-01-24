// =============================================================================
// JSONCoding.swift
// LeadCaptureAPI/Utilities
// =============================================================================
// JSON encoding and decoding utilities.
// =============================================================================

import Foundation

// MARK: - JSON Encoder/Decoder Instances

/// Configured JSON encoder for API responses
public let apiJSONEncoder: JSONEncoder = {
    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .iso8601
    encoder.outputFormatting = [.sortedKeys]
    return encoder
}()

/// Pretty-printed JSON encoder for debugging
public let prettyJSONEncoder: JSONEncoder = {
    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .iso8601
    encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    return encoder
}()

/// Configured JSON decoder for API requests
public let apiJSONDecoder: JSONDecoder = {
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    return decoder
}()

// MARK: - Encoding Utilities

/// Encode a value to JSON data
/// - Parameter value: The value to encode
/// - Returns: JSON data
public func encodeJSON<T: Encodable>(_ value: T) throws -> Data {
    return try apiJSONEncoder.encode(value)
}

/// Encode a value to JSON string
/// - Parameter value: The value to encode
/// - Returns: JSON string
public func encodeJSONString<T: Encodable>(_ value: T) throws -> String {
    let data = try encodeJSON(value)
    guard let string = String(data: data, encoding: .utf8) else {
        throw JSONError.encodingFailed
    }
    return string
}

/// Encode a value to pretty-printed JSON string
/// - Parameter value: The value to encode
/// - Returns: Pretty-printed JSON string
public func encodePrettyJSON<T: Encodable>(_ value: T) throws -> String {
    let data = try prettyJSONEncoder.encode(value)
    guard let string = String(data: data, encoding: .utf8) else {
        throw JSONError.encodingFailed
    }
    return string
}

// MARK: - Decoding Utilities

/// Decode JSON data to a value
/// - Parameters:
///   - type: The type to decode to
///   - data: JSON data
/// - Returns: Decoded value
public func decodeJSON<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
    return try apiJSONDecoder.decode(type, from: data)
}

/// Decode JSON string to a value
/// - Parameters:
///   - type: The type to decode to
///   - string: JSON string
/// - Returns: Decoded value
public func decodeJSON<T: Decodable>(_ type: T.Type, from string: String) throws -> T {
    guard let data = string.data(using: .utf8) else {
        throw JSONError.invalidString
    }
    return try decodeJSON(type, from: data)
}

// MARK: - JSON Error

/// Errors during JSON encoding/decoding
public enum JSONError: Error, LocalizedError {
    case encodingFailed
    case decodingFailed
    case invalidString

    public var errorDescription: String? {
        switch self {
        case .encodingFailed:
            return "Failed to encode value to JSON"
        case .decodingFailed:
            return "Failed to decode JSON"
        case .invalidString:
            return "Invalid UTF-8 string"
        }
    }
}

// MARK: - Dictionary Conversion

extension Encodable {
    /// Convert to dictionary
    public func toDictionary() throws -> [String: Any] {
        let data = try apiJSONEncoder.encode(self)
        guard let dict = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw JSONError.encodingFailed
        }
        return dict
    }
}

extension Decodable {
    /// Initialize from dictionary
    public init(from dictionary: [String: Any]) throws {
        let data = try JSONSerialization.data(withJSONObject: dictionary)
        self = try apiJSONDecoder.decode(Self.self, from: data)
    }
}
