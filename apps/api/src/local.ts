/**
 * Local development runner for the Lead Capture API Lambda
 * Simulates API Gateway HTTP API event
 */

import { config } from 'dotenv';
import { handler } from './handler.js';
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

// Load environment variables from .env file
config();

// =============================================================================
// Mock Event Builder
// =============================================================================

function buildMockEvent(body: object): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: 'POST /lead',
    rawPath: '/lead',
    rawQueryString: '',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '192.168.1.100',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Local Dev',
    },
    requestContext: {
      accountId: '123456789012',
      apiId: 'local',
      domainName: 'localhost',
      domainPrefix: 'local',
      http: {
        method: 'POST',
        path: '/lead',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'Local Dev',
      },
      requestId: `local-${Date.now()}`,
      routeKey: 'POST /lead',
      stage: '$default',
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    },
    body: JSON.stringify(body),
    isBase64Encoded: false,
  };
}

function buildMockContext(): Context {
  return {
    awsRequestId: `local-${Date.now()}`,
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'lead-capture-local',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:lead-capture-local',
    logGroupName: '/aws/lambda/lead-capture-local',
    logStreamName: 'local',
    memoryLimitInMB: '128',
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };
}

// =============================================================================
// Test Cases
// =============================================================================

async function runTests(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Lead Capture API - Local Development Runner');
  console.log('='.repeat(60));
  console.log('');

  // Check required environment variables
  const requiredEnvVars = ['DDB_TABLE_NAME'];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    console.log('WARNING: Missing environment variables:', missingVars.join(', '));
    console.log('Copy .env.example to .env and configure values');
    console.log('');
  }

  // Test 1: Valid lead submission
  console.log('Test 1: Valid Lead Submission');
  console.log('-'.repeat(40));
  const validPayload = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-123-4567',
    notes: 'I am interested in learning more about your services.',
    utm: {
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'summer-sale',
    },
    metadata: {
      pageUrl: 'https://example.com/landing',
      referrer: 'https://google.com',
    },
  };

  const event1 = buildMockEvent(validPayload);
  const context = buildMockContext();

  try {
    const result1 = await handler(event1, context);
    if (typeof result1 === 'object' && 'statusCode' in result1) {
      console.log('Status:', result1.statusCode);
      console.log('Response:', result1.body ? JSON.parse(result1.body as string) : null);
    } else {
      console.log('Response:', result1);
    }
  } catch (error) {
    console.log('Error:', error);
  }

  console.log('');

  // Test 2: Validation error (missing email)
  console.log('Test 2: Validation Error (missing email)');
  console.log('-'.repeat(40));
  const invalidPayload = {
    name: 'Jane Doe',
    // email is missing
  };

  const event2 = buildMockEvent(invalidPayload);

  try {
    const result2 = await handler(event2, context);
    if (typeof result2 === 'object' && 'statusCode' in result2) {
      console.log('Status:', result2.statusCode);
      console.log('Response:', result2.body ? JSON.parse(result2.body as string) : null);
    } else {
      console.log('Response:', result2);
    }
  } catch (error) {
    console.log('Error:', error);
  }

  console.log('');

  // Test 3: Suspicious lead (disposable email)
  console.log('Test 3: Suspicious Lead (disposable email)');
  console.log('-'.repeat(40));
  const suspiciousPayload = {
    name: 'Spammer McSpam',
    email: 'test@mailinator.com',
    notes: 'Check out my backlinks and SEO services!',
  };

  const event3 = buildMockEvent(suspiciousPayload);

  try {
    const result3 = await handler(event3, context);
    if (typeof result3 === 'object' && 'statusCode' in result3) {
      console.log('Status:', result3.statusCode);
      console.log('Response:', result3.body ? JSON.parse(result3.body as string) : null);
    } else {
      console.log('Response:', result3);
    }
  } catch (error) {
    console.log('Error:', error);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Tests completed');
  console.log('='.repeat(60));
}

// Run tests
runTests().catch(console.error);
