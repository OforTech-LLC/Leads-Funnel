/**
 * Test Helpers and Utilities
 *
 * Provides mock clients, test data generators, and utility functions
 * for testing the API Lambda functions.
 */

import { vi, expect } from 'vitest';
import type { Mock } from 'vitest';
import type { NormalizedLead, SecurityAnalysis, EnvConfig } from '../types.js';
import type { LeadRequestPayload, LeadUtm } from '@kanjona/shared';
import type { AdminConfig, AdminUser, JwtPayload } from '../admin/types.js';

// =============================================================================
// Mock DynamoDB Client
// =============================================================================

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
export function createMockDynamoClient(): MockDynamoDBClient {
  const responses = new Map<string, MockDynamoDBResponse>();

  const send = vi.fn().mockImplementation((command: { constructor: { name: string } }) => {
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
    setResponse: (command: string, response: MockDynamoDBResponse) => {
      responses.set(command, response);
    },
    reset: () => {
      send.mockClear();
      responses.clear();
    },
  };
}

// =============================================================================
// Mock SSM Client
// =============================================================================

export interface MockSSMClient {
  send: Mock;
  parameters: Map<string, string>;
  setParameter: (path: string, value: string) => void;
  reset: () => void;
}

/**
 * Creates a mock SSM Client for testing
 */
export function createMockSSMClient(): MockSSMClient {
  const parameters = new Map<string, string>();

  const send = vi
    .fn()
    .mockImplementation((command: { constructor: { name: string }; input?: { Name?: string } }) => {
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
        (error as unknown as Record<string, string>).name = 'ParameterNotFound';
        return Promise.reject(error);
      }

      return Promise.resolve({});
    });

  return {
    send,
    parameters,
    setParameter: (path: string, value: string) => {
      parameters.set(path, value);
    },
    reset: () => {
      send.mockClear();
      parameters.clear();
    },
  };
}

// =============================================================================
// Mock EventBridge Client
// =============================================================================

export interface MockEventBridgeClient {
  send: Mock;
  sentEvents: Array<Record<string, unknown>>;
  reset: () => void;
}

/**
 * Creates a mock EventBridge Client for testing
 */
export function createMockEventBridgeClient(): MockEventBridgeClient {
  const sentEvents: Array<Record<string, unknown>> = [];

  const send = vi
    .fn()
    .mockImplementation((command: { input?: { Entries?: Array<Record<string, unknown>> } }) => {
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
export function generateLeadPayload(
  overrides: Partial<LeadRequestPayload> = {}
): LeadRequestPayload {
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
export function generateNormalizedLead(overrides: Partial<NormalizedLead> = {}): NormalizedLead {
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
export function generateUtmParams(overrides: Partial<LeadUtm> = {}): LeadUtm {
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
export function generateSecurityAnalysis(
  overrides: Partial<SecurityAnalysis> = {}
): SecurityAnalysis {
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
export function generateEnvConfig(overrides: Partial<EnvConfig> = {}): EnvConfig {
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
export function generateAdminConfig(overrides: Partial<AdminConfig> = {}): AdminConfig {
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
export function generateAdminUser(overrides: Partial<AdminUser> = {}): AdminUser {
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
export function generateJwtPayload(overrides: Partial<JwtPayload> = {}): JwtPayload {
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
export function createMockApiGatewayEvent(
  options: {
    body?: unknown;
    headers?: Record<string, string>;
    pathParameters?: Record<string, string>;
    queryStringParameters?: Record<string, string>;
    httpMethod?: string;
    path?: string;
    sourceIp?: string;
  } = {}
): Record<string, unknown> {
  const {
    body,
    headers = {},
    pathParameters = {},
    queryStringParameters = {},
    httpMethod = 'POST',
    path = '/leads',
    sourceIp = '192.168.1.100',
  } = options;

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
export function parseApiGatewayResponse(response: {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}): {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
} {
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
export function assertSuccessResponse(response: { statusCode: number; body: string }): void {
  const parsed = parseApiGatewayResponse(response);
  expect(parsed.statusCode).toBeGreaterThanOrEqual(200);
  expect(parsed.statusCode).toBeLessThan(300);
}

/**
 * Assert that a response is an error
 */
export function assertErrorResponse(
  response: { statusCode: number; body: string },
  expectedStatus: number,
  expectedMessage?: string
): void {
  const parsed = parseApiGatewayResponse(response);
  expect(parsed.statusCode).toBe(expectedStatus);
  if (expectedMessage) {
    expect(
      (parsed.body as Record<string, unknown>).error ||
        (parsed.body as Record<string, unknown>).message
    ).toContain(expectedMessage);
  }
}

// =============================================================================
// Time Utilities
// =============================================================================

/**
 * Mock the current date for testing time-dependent code
 */
export function mockDate(date: Date | string | number): () => void {
  const mockTime = new Date(date).getTime();
  const originalDate = global.Date;

  const MockDate = class extends Date {
    constructor(...args: ConstructorParameters<typeof Date>) {
      if (args.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        super(...(args as [any]));
      } else {
        super(mockTime);
      }
    }

    static now(): number {
      return mockTime;
    }
  };

  global.Date = MockDate as DateConstructor;

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
} as const;

/**
 * Test CIDR ranges
 */
export const TEST_CIDRS = {
  privateA: '10.0.0.0/8',
  privateB: '172.16.0.0/12',
  privateC: '192.168.0.0/16',
  specificHost: '192.168.1.100/32',
  allowAll: '0.0.0.0/0',
} as const;
