// =============================================================================
// AWSClientFactory.swift
// LeadCaptureAPI/Utilities
// =============================================================================
// Factory for creating AWS clients.
// =============================================================================

import Foundation
import SotoCore
import Logging

// MARK: - AWS Client Factory

/// Factory for creating configured AWS clients
public enum AWSClientFactory {

    // MARK: - Shared Client

    private static var _sharedClient: AWSClient?
    private static let lock = NSLock()

    /// Get or create the shared AWS client
    public static var shared: AWSClient {
        lock.lock()
        defer { lock.unlock() }

        if let client = _sharedClient {
            return client
        }

        let client = createClient()
        _sharedClient = client
        return client
    }

    /// Shutdown the shared client
    public static func shutdown() async throws {
        let client = clearSharedClient()

        if let client = client {
            try await client.shutdown()
        }
    }

    /// Clear the shared client synchronously and return it for shutdown
    private static func clearSharedClient() -> AWSClient? {
        lock.lock()
        defer { lock.unlock() }
        let client = _sharedClient
        _sharedClient = nil
        return client
    }

    // MARK: - Client Creation

    /// Create a new AWS client
    /// - Parameters:
    ///   - config: Application configuration
    ///   - logger: Optional logger
    /// - Returns: Configured AWS client
    public static func createClient(
        config: AppConfig = .shared,
        logger: Logger? = nil
    ) -> AWSClient {
        var clientLogger = logger ?? Logger(label: "aws-client")
        clientLogger.logLevel = config.debugEnabled ? .debug : .info

        return AWSClient(
            credentialProvider: .default,
            httpClientProvider: .createNew,
            logger: clientLogger
        )
    }

    /// Create a client for testing with custom credentials
    /// - Parameters:
    ///   - accessKeyId: AWS access key ID
    ///   - secretAccessKey: AWS secret access key
    ///   - sessionToken: Optional session token
    /// - Returns: AWS client with static credentials
    public static func createTestClient(
        accessKeyId: String,
        secretAccessKey: String,
        sessionToken: String? = nil
    ) -> AWSClient {
        return AWSClient(
            credentialProvider: .static(
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey,
                sessionToken: sessionToken
            ),
            httpClientProvider: .createNew
        )
    }
}
