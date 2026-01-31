/**
 * Test Helpers and Utilities
 *
 * Provides mock clients, test data generators, and utility functions
 * for testing the API Lambda functions.
 */
import { vi, expect } from 'vitest';
/**
 * Creates a mock DynamoDB Document Client for testing
 */
export function createMockDynamoClient() {
    const responses = new Map();
    const send = vi.fn().mockImplementation((command) => {
        const commandName = command.constructor.name;
        const response = responses.get(commandName);
        if (response) {
            return Promise.resolve(response);
        }
        // Default responses based on command type
        switch (commandName) {
            case 'GetCommand':
                return Promise.resolve({ Item: undefined });
            case 'PutCommand':
                return Promise.resolve({});
            case 'UpdateCommand':
                return Promise.resolve({ Attributes: {} });
            case 'DeleteCommand':
                return Promise.resolve({});
            case 'QueryCommand':
                return Promise.resolve({ Items: [], Count: 0 });
            case 'ScanCommand':
                return Promise.resolve({ Items: [], Count: 0 });
            default:
                return Promise.resolve({});
        }
    });
    return {
        send,
        responses,
        setResponse: (command, response) => {
            responses.set(command, response);
        },
        reset: () => {
            send.mockClear();
            responses.clear();
        },
    };
}
/**
 * Creates a mock SSM Client for testing
 */
export function createMockSSMClient() {
    const parameters = new Map();
    const send = vi
        .fn()
        .mockImplementation((command) => {
        const commandName = command.constructor.name;
        if (commandName === 'GetParameterCommand') {
            const path = command.input?.Name;
            const value = path ? parameters.get(path) : undefined;
            if (value !== undefined) {
                return Promise.resolve({
                    Parameter: {
                        Name: path,
                        Value: value,
                        Type: 'SecureString',
                    },
                });
            }
            // Parameter not found
            const error = new Error(`Parameter ${path} not found`);
            error.name = 'ParameterNotFound';
            return Promise.reject(error);
        }
        return Promise.resolve({});
    });
    return {
        send,
        parameters,
        setParameter: (path, value) => {
            parameters.set(path, value);
        },
        reset: () => {
            send.mockClear();
            parameters.clear();
        },
    };
}
/**
 * Creates a mock EventBridge Client for testing
 */
export function createMockEventBridgeClient() {
    const sentEvents = [];
    const send = vi
        .fn()
        .mockImplementation((command) => {
        if (command.input?.Entries) {
            sentEvents.push(...command.input.Entries);
        }
        return Promise.resolve({
            FailedEntryCount: 0,
            Entries: command.input?.Entries?.map(() => ({ EventId: 'mock-event-id' })) || [],
        });
    });
    return {
        send,
        sentEvents,
        reset: () => {
            send.mockClear();
            sentEvents.length = 0;
        },
    };
}
// =============================================================================
// Test Data Generators
// =============================================================================
/**
 * Generate a valid lead request payload
 */
export function generateLeadPayload(overrides = {}) {
    return {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-123-4567',
        notes: 'Interested in your services',
        utm: {
            utm_source: 'google',
            utm_medium: 'cpc',
            utm_campaign: 'spring-2024',
        },
        ...overrides,
    };
}
/**
 * Generate a normalized lead for testing
 */
export function generateNormalizedLead(overrides = {}) {
    return {
        funnelId: 'roofing',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+15551234567',
        message: 'Interested in your services',
        pageUrl: 'https://example.com/landing',
        referrer: 'https://google.com',
        utm: {
            utm_source: 'google',
            utm_medium: 'cpc',
            utm_campaign: 'spring-2024',
        },
        ...overrides,
    };
}
/**
 * Generate UTM parameters for testing
 */
export function generateUtmParams(overrides = {}) {
    return {
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'test-campaign',
        utm_term: 'test keywords',
        utm_content: 'ad-variant-a',
        ...overrides,
    };
}
/**
 * Generate a security analysis result
 */
export function generateSecurityAnalysis(overrides = {}) {
    return {
        suspicious: false,
        reasons: [],
        ipHash: 'hash-abc123',
        emailHash: 'hash-def456',
        idempotencyKey: 'idem-key-789',
        ...overrides,
    };
}
/**
 * Generate environment configuration for testing
 */
export function generateEnvConfig(overrides = {}) {
    return {
        awsRegion: 'us-east-1',
        env: 'dev',
        projectName: 'kanjona',
        rateLimitsTableName: 'test-rate-limits-table',
        idempotencyTableName: 'test-idempotency-table',
        eventBusName: 'test-event-bus',
        rateLimitMax: 10,
        rateLimitWindowMin: 60,
        idempotencyTtlHours: 24,
        ipHashSalt: 'test-salt-value',
        ...overrides,
    };
}
/**
 * Generate admin configuration for testing
 */
export function generateAdminConfig(overrides = {}) {
    return {
        awsRegion: 'us-east-1',
        env: 'dev',
        projectName: 'kanjona',
        cognitoUserPoolId: 'us-east-1_testpool',
        cognitoClientId: 'test-client-id',
        cognitoIssuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_testpool',
        allowedEmailsSsmPath: '/kanjona/admin/allowed-emails',
        featureFlagSsmPath: '/kanjona/admin/feature-flag',
        ipAllowlistFlagPath: '/kanjona/admin/ip-allowlist-enabled',
        ipAllowlistSsmPath: '/kanjona/admin/ip-allowlist',
        exportsBucket: 'test-exports-bucket',
        auditTable: 'test-audit-table',
        exportJobsTable: 'test-export-jobs-table',
        logLevel: 'info',
        ...overrides,
    };
}
/**
 * Generate an admin user for testing
 */
export function generateAdminUser(overrides = {}) {
    return {
        sub: 'user-sub-123',
        email: 'admin@example.com',
        groups: ['Admin'],
        role: 'Admin',
        ...overrides,
    };
}
/**
 * Generate a JWT payload for testing
 */
export function generateJwtPayload(overrides = {}) {
    const now = Math.floor(Date.now() / 1000);
    return {
        sub: 'user-sub-123',
        email: 'admin@example.com',
        'cognito:username': 'admin',
        'cognito:groups': ['Admin'],
        iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_testpool',
        client_id: 'test-client-id',
        token_use: 'id',
        exp: now + 3600,
        iat: now,
        ...overrides,
    };
}
// =============================================================================
// Disposable Email Domains for Testing
// =============================================================================
/**
 * Known disposable email domains for testing spam detection
 */
export const DISPOSABLE_EMAIL_DOMAINS = [
    'mailinator.com',
    '10minutemail.com',
    'guerrillamail.com',
    'temp-mail.org',
    'yopmail.com',
    'tempmail.com',
    'throwaway.email',
    'fakeinbox.com',
    'trashmail.com',
    'sharklasers.com',
];
/**
 * Known spam keywords for testing
 */
export const SPAM_KEYWORDS = [
    'backlinks',
    'seo services',
    'crypto',
    'telegram',
    'whatsapp marketing',
    'buy followers',
    'cheap traffic',
    'make money fast',
    'work from home',
    'guaranteed income',
];
// =============================================================================
// Request/Response Helpers
// =============================================================================
/**
 * Create a mock API Gateway event
 */
export function createMockApiGatewayEvent(options = {}) {
    const { body, headers = {}, pathParameters = {}, queryStringParameters = {}, httpMethod = 'POST', path = '/leads', sourceIp = '192.168.1.100', } = options;
    return {
        httpMethod,
        path,
        body: body ? JSON.stringify(body) : null,
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Test Agent)',
            ...headers,
        },
        pathParameters,
        queryStringParameters,
        requestContext: {
            requestId: 'test-request-id',
            http: {
                method: httpMethod,
                path,
                sourceIp,
            },
            identity: {
                sourceIp,
            },
        },
        isBase64Encoded: false,
    };
}
/**
 * Parse an API Gateway response
 */
export function parseApiGatewayResponse(response) {
    return {
        statusCode: response.statusCode,
        body: response.body ? JSON.parse(response.body) : null,
        headers: response.headers || {},
    };
}
// =============================================================================
// Assertion Helpers
// =============================================================================
/**
 * Assert that a response is successful
 */
export function assertSuccessResponse(response) {
    const parsed = parseApiGatewayResponse(response);
    expect(parsed.statusCode).toBeGreaterThanOrEqual(200);
    expect(parsed.statusCode).toBeLessThan(300);
}
/**
 * Assert that a response is an error
 */
export function assertErrorResponse(response, expectedStatus, expectedMessage) {
    const parsed = parseApiGatewayResponse(response);
    expect(parsed.statusCode).toBe(expectedStatus);
    if (expectedMessage) {
        expect(parsed.body.error ||
            parsed.body.message).toContain(expectedMessage);
    }
}
// =============================================================================
// Time Utilities
// =============================================================================
/**
 * Mock the current date for testing time-dependent code
 */
export function mockDate(date) {
    const mockTime = new Date(date).getTime();
    const originalDate = global.Date;
    const MockDate = class extends Date {
        constructor(...args) {
            if (args.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                super(...args);
            }
            else {
                super(mockTime);
            }
        }
        static now() {
            return mockTime;
        }
    };
    global.Date = MockDate;
    return () => {
        global.Date = originalDate;
    };
}
// =============================================================================
// IP Address Utilities
// =============================================================================
/**
 * Generate test IP addresses for CIDR testing
 */
export const TEST_IPS = {
    privateA: '10.0.0.1',
    privateB: '172.16.0.1',
    privateC: '192.168.1.1',
    publicA: '8.8.8.8',
    publicB: '1.1.1.1',
    localhost: '127.0.0.1',
};
/**
 * Test CIDR ranges
 */
export const TEST_CIDRS = {
    privateA: '10.0.0.0/8',
    privateB: '172.16.0.0/12',
    privateC: '192.168.0.0/16',
    specificHost: '192.168.1.100/32',
    allowAll: '0.0.0.0/0',
};
//# sourceMappingURL=helpers.js.map