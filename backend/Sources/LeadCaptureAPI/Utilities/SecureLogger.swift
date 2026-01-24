// =============================================================================
// SecureLogger.swift
// LeadCaptureAPI/Utilities
// =============================================================================
// Secure logging utility with PII redaction.
// =============================================================================

import Foundation
import Logging

// MARK: - Secure Logger

/// Thread-safe logger with automatic PII redaction
/// Use this instead of print() for all logging
public enum SecureLogger {

    /// Shared logger instance
    private static let logger: Logger = {
        var logger = Logger(label: "com.kanjona.leads")
        logger.logLevel = AppConfig.shared.debugEnabled ? .debug : .info
        return logger
    }()

    // MARK: - Log Levels

    /// Log debug message (only in debug mode)
    public static func debug(_ message: String, metadata: [String: String]? = nil, file: String = #file, function: String = #function, line: UInt = #line) {
        let redacted = redactPII(message)
        let logMetadata = buildMetadata(metadata, file: file, function: function, line: line)
        logger.debug("\(redacted)", metadata: logMetadata)
    }

    /// Log info message
    public static func info(_ message: String, metadata: [String: String]? = nil, file: String = #file, function: String = #function, line: UInt = #line) {
        let redacted = redactPII(message)
        let logMetadata = buildMetadata(metadata, file: file, function: function, line: line)
        logger.info("\(redacted)", metadata: logMetadata)
    }

    /// Log warning message
    public static func warning(_ message: String, metadata: [String: String]? = nil, file: String = #file, function: String = #function, line: UInt = #line) {
        let redacted = redactPII(message)
        let logMetadata = buildMetadata(metadata, file: file, function: function, line: line)
        logger.warning("\(redacted)", metadata: logMetadata)
    }

    /// Log error message
    public static func error(_ message: String, error: Error? = nil, metadata: [String: String]? = nil, file: String = #file, function: String = #function, line: UInt = #line) {
        let redacted = redactPII(message)
        var logMetadata = buildMetadata(metadata, file: file, function: function, line: line)
        if let error = error {
            // Redact error message too
            logMetadata["error"] = .string(redactPII(String(describing: error)))
        }
        logger.error("\(redacted)", metadata: logMetadata)
    }

    /// Log security-related message (always logged regardless of level)
    public static func security(_ message: String, metadata: [String: String]? = nil, file: String = #file, function: String = #function, line: UInt = #line) {
        let redacted = redactPII(message)
        var logMetadata = buildMetadata(metadata, file: file, function: function, line: line)
        logMetadata["category"] = .string("SECURITY")
        logger.warning("\(redacted)", metadata: logMetadata)
    }

    // MARK: - PII Redaction

    /// Redact PII from log messages
    /// - Parameter message: The message to redact
    /// - Returns: Message with PII replaced by [REDACTED]
    private static func redactPII(_ message: String) -> String {
        var redacted = message

        // Redact email addresses
        let emailPattern = #"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"#
        if let regex = try? NSRegularExpression(pattern: emailPattern) {
            redacted = regex.stringByReplacingMatches(
                in: redacted,
                range: NSRange(redacted.startIndex..., in: redacted),
                withTemplate: "[EMAIL]"
            )
        }

        // Redact IP addresses
        let ipPattern = #"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}"#
        if let regex = try? NSRegularExpression(pattern: ipPattern) {
            redacted = regex.stringByReplacingMatches(
                in: redacted,
                range: NSRange(redacted.startIndex..., in: redacted),
                withTemplate: "[IP]"
            )
        }

        // Redact phone numbers (various formats)
        let phonePattern = #"(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"#
        if let regex = try? NSRegularExpression(pattern: phonePattern) {
            redacted = regex.stringByReplacingMatches(
                in: redacted,
                range: NSRange(redacted.startIndex..., in: redacted),
                withTemplate: "[PHONE]"
            )
        }

        // Redact API keys (common patterns)
        let apiKeyPattern = #"(api[_-]?key|apikey|token|secret|password|credential)[=:\s]+['\"]?[\w\-]{8,}['\"]?"#
        if let regex = try? NSRegularExpression(pattern: apiKeyPattern, options: .caseInsensitive) {
            redacted = regex.stringByReplacingMatches(
                in: redacted,
                range: NSRange(redacted.startIndex..., in: redacted),
                withTemplate: "[CREDENTIAL]"
            )
        }

        // Redact file paths
        let pathPattern = #"(/[a-zA-Z0-9_.-]+){3,}"#
        if let regex = try? NSRegularExpression(pattern: pathPattern) {
            redacted = regex.stringByReplacingMatches(
                in: redacted,
                range: NSRange(redacted.startIndex..., in: redacted),
                withTemplate: "[PATH]"
            )
        }

        return redacted
    }

    /// Build metadata dictionary for logging
    private static func buildMetadata(_ custom: [String: String]?, file: String, function: String, line: UInt) -> Logger.Metadata {
        var metadata: Logger.Metadata = [:]

        // Add custom metadata (redacted)
        if let custom = custom {
            for (key, value) in custom {
                // Don't redact certain safe keys
                let safeKeys = ["leadId", "action", "requestId", "status", "duration"]
                if safeKeys.contains(key) {
                    metadata[key] = .string(value)
                } else {
                    metadata[key] = .string(redactPII(value))
                }
            }
        }

        // Add source location in debug mode
        if AppConfig.shared.debugEnabled {
            let fileName = (file as NSString).lastPathComponent
            metadata["source"] = .string("\(fileName):\(line)")
        }

        return metadata
    }
}
