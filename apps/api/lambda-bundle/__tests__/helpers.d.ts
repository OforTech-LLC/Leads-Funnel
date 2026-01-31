/**
 * Test Helpers and Utilities
 *
 * Provides mock clients, test data generators, and utility functions
 * for testing the API Lambda functions.
 */
import type { Mock } from 'vitest';
import type { NormalizedLead, SecurityAnalysis, EnvConfig } from '../types.js';
import type { LeadRequestPayload, LeadUtm } from '@kanjona/shared';
import type { AdminConfig, AdminUser, JwtPayload } from '../admin/types.js';
export interface MockDynamoDBResponse {
    Items?: Record<string, unknown>[];
    Item?: Record<string, unknown>;
    Attributes?: Record<string, unknown>;
    Count?: number;
    LastEvaluatedKey?: Record<string, unknown>;
}
export interface MockDynamoDBClient {
    send: Mock;
    responses: Map<string, MockDynamoDBResponse>;
    setResponse: (command: string, response: MockDynamoDBResponse) => void;
    reset: () => void;
}
/**
 * Creates a mock DynamoDB Document Client for testing
 */
export declare function createMockDynamoClient(): MockDynamoDBClient;
export interface MockSSMClient {
    send: Mock;
    parameters: Map<string, string>;
    setParameter: (path: string, value: string) => void;
    reset: () => void;
}
/**
 * Creates a mock SSM Client for testing
 */
export declare function createMockSSMClient(): MockSSMClient;
export interface MockEventBridgeClient {
    send: Mock;
    sentEvents: Array<Record<string, unknown>>;
    reset: () => void;
}
/**
 * Creates a mock EventBridge Client for testing
 */
export declare function createMockEventBridgeClient(): MockEventBridgeClient;
/**
 * Generate a valid lead request payload
 */
export declare function generateLeadPayload(overrides?: Partial<LeadRequestPayload>): LeadRequestPayload;
/**
 * Generate a normalized lead for testing
 */
export declare function generateNormalizedLead(overrides?: Partial<NormalizedLead>): NormalizedLead;
/**
 * Generate UTM parameters for testing
 */
export declare function generateUtmParams(overrides?: Partial<LeadUtm>): LeadUtm;
/**
 * Generate a security analysis result
 */
export declare function generateSecurityAnalysis(overrides?: Partial<SecurityAnalysis>): SecurityAnalysis;
/**
 * Generate environment configuration for testing
 */
export declare function generateEnvConfig(overrides?: Partial<EnvConfig>): EnvConfig;
/**
 * Generate admin configuration for testing
 */
export declare function generateAdminConfig(overrides?: Partial<AdminConfig>): AdminConfig;
/**
 * Generate an admin user for testing
 */
export declare function generateAdminUser(overrides?: Partial<AdminUser>): AdminUser;
/**
 * Generate a JWT payload for testing
 */
export declare function generateJwtPayload(overrides?: Partial<JwtPayload>): JwtPayload;
/**
 * Known disposable email domains for testing spam detection
 */
export declare const DISPOSABLE_EMAIL_DOMAINS: string[];
/**
 * Known spam keywords for testing
 */
export declare const SPAM_KEYWORDS: string[];
/**
 * Create a mock API Gateway event
 */
export declare function createMockApiGatewayEvent(options?: {
    body?: unknown;
    headers?: Record<string, string>;
    pathParameters?: Record<string, string>;
    queryStringParameters?: Record<string, string>;
    httpMethod?: string;
    path?: string;
    sourceIp?: string;
}): Record<string, unknown>;
/**
 * Parse an API Gateway response
 */
export declare function parseApiGatewayResponse(response: {
    statusCode: number;
    body: string;
    headers?: Record<string, string>;
}): {
    statusCode: number;
    body: unknown;
    headers: Record<string, string>;
};
/**
 * Assert that a response is successful
 */
export declare function assertSuccessResponse(response: {
    statusCode: number;
    body: string;
}): void;
/**
 * Assert that a response is an error
 */
export declare function assertErrorResponse(response: {
    statusCode: number;
    body: string;
}, expectedStatus: number, expectedMessage?: string): void;
/**
 * Mock the current date for testing time-dependent code
 */
export declare function mockDate(date: Date | string | number): () => void;
/**
 * Generate test IP addresses for CIDR testing
 */
export declare const TEST_IPS: {
    readonly privateA: "10.0.0.1";
    readonly privateB: "172.16.0.1";
    readonly privateC: "192.168.1.1";
    readonly publicA: "8.8.8.8";
    readonly publicB: "1.1.1.1";
    readonly localhost: "127.0.0.1";
};
/**
 * Test CIDR ranges
 */
export declare const TEST_CIDRS: {
    readonly privateA: "10.0.0.0/8";
    readonly privateB: "172.16.0.0/12";
    readonly privateC: "192.168.0.0/16";
    readonly specificHost: "192.168.1.100/32";
    readonly allowAll: "0.0.0.0/0";
};
