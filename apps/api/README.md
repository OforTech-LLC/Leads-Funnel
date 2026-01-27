# Kanjona Lead Capture API

AWS Lambda-based API for capturing and processing leads from the Kanjona platform.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Security Features](#security-features)
- [DynamoDB Schema](#dynamodb-schema)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Logging](#logging)
- [Admin API](#admin-api)

## Overview

The Lead Capture API is a serverless Node.js application that handles lead submissions from the
frontend, performs validation and security analysis, and stores leads in DynamoDB.

### Key Features

- **High Performance**: Optimized for Lambda cold starts
- **Input Validation**: Strict validation with max lengths
- **Rate Limiting**: IP-based with sliding window buckets
- **Spam Detection**: Multi-layered spam analysis
- **Idempotency**: Prevents duplicate submissions
- **GDPR Compliance**: IP anonymization and secure logging
- **Event-Driven**: EventBridge integration for async processing

### Technology Stack

| Component | Technology                     |
| --------- | ------------------------------ |
| Runtime   | Node.js 20                     |
| Language  | TypeScript                     |
| Database  | DynamoDB (single-table design) |
| Events    | EventBridge                    |
| Hosting   | AWS Lambda + API Gateway       |
| Testing   | Vitest                         |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  HTTPS Endpoint                                          │   │
│  │  • Request validation                                    │   │
│  │  • Throttling                                            │   │
│  │  • CORS preflight                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Lambda Function                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  handler.ts                                               │   │
│  │  ├── Input Validation                                    │   │
│  │  ├── Rate Limiting Check                                 │   │
│  │  ├── Spam Analysis                                       │   │
│  │  ├── Idempotency Check                                   │   │
│  │  ├── Lead Creation                                       │   │
│  │  └── Event Publishing                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    DynamoDB     │ │   EventBridge   │ │   CloudWatch    │
│  ┌───────────┐  │ │  ┌───────────┐  │ │  ┌───────────┐  │
│  │  Leads    │  │ │  │  Events   │  │ │  │   Logs    │  │
│  │  Rate     │  │ │  │  lead.new │  │ │  │  Metrics  │  │
│  │  Limits   │  │ │  │  lead.spam│  │ │  │  Alarms   │  │
│  └───────────┘  │ │  └───────────┘  │ │  └───────────┘  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## API Endpoints

### POST /lead

Captures a new lead from the website form.

#### Request Headers

| Header            | Required | Description                      |
| ----------------- | -------- | -------------------------------- |
| `Content-Type`    | Yes      | Must be `application/json`       |
| `Idempotency-Key` | No       | Unique key to prevent duplicates |

#### Request Body

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-123-4567",
  "notes": "Interested in your services",
  "source": "real-estate",
  "utm": {
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "summer-sale"
  },
  "metadata": {
    "pageUrl": "https://kanjona.com/en/real-estate",
    "referrer": "https://google.com"
  }
}
```

#### Field Validation

| Field      | Type   | Required | Max Length | Validation           |
| ---------- | ------ | -------- | ---------- | -------------------- |
| `name`     | string | Yes      | 100        | Non-empty            |
| `email`    | string | Yes      | 255        | Valid email format   |
| `phone`    | string | No       | 20         | Phone number pattern |
| `notes`    | string | No       | 2000       | -                    |
| `source`   | string | No       | 100        | Funnel identifier    |
| `utm`      | object | No       | -          | UTM parameters       |
| `metadata` | object | No       | -          | Additional context   |

#### Responses

**201 Created** - Lead successfully captured

```json
{
  "ok": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "accepted"
  },
  "requestId": "abc123"
}
```

**400 Bad Request** - Validation error

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "fieldErrors": {
      "email": "Email is required"
    }
  },
  "requestId": "abc123"
}
```

**429 Too Many Requests** - Rate limited

```json
{
  "ok": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Try again later."
  },
  "requestId": "abc123"
}
```

#### Response Headers

| Header                  | Description                         |
| ----------------------- | ----------------------------------- |
| `X-Request-ID`          | Unique request identifier           |
| `X-RateLimit-Remaining` | Remaining requests in window        |
| `X-RateLimit-Reset`     | Seconds until window resets         |
| `Retry-After`           | Seconds to wait (when rate limited) |
| `X-Idempotent-Replay`   | `true` if returning cached response |

### GET /health

Basic health check endpoint.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Security Features

### Input Validation

All inputs are validated and normalized:

```typescript
// Normalization
const normalizedLead = {
  email: input.email.toLowerCase().trim(),
  name: input.name.trim(),
  phone: normalizePhone(input.phone), // Strips non-digits except +
  notes: sanitizeHtml(input.notes),
};
```

### Rate Limiting

IP-based rate limiting with sliding window:

```typescript
// Default: 10 requests per 10-minute window
const rateLimitConfig = {
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '10'),
  windowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MIN || '10'),
};
```

**DynamoDB Rate Limit Entry:**

```
PK: IP#<hashed_ip>
SK: WINDOW#<bucket_timestamp>
TTL: <expiration_timestamp>
count: <request_count>
```

### Spam Detection

Multi-layered analysis with reasons tracking:

```typescript
// Analysis checks
const analysis = analyzeLeadSecurity(lead, clientIp, salt, windowMinutes);

// Result
{
  suspicious: true,
  reasons: ['disposable_email_domain', 'spam_keywords: backlinks'],
  ipHash: 'a1b2c3...',
  emailHash: 'd4e5f6...',
  idempotencyKey: 'g7h8i9...',
}
```

**Detection Methods:**

| Check            | Description                                         |
| ---------------- | --------------------------------------------------- |
| Disposable Email | Known throwaway domains (mailinator, yopmail, etc.) |
| Spam Keywords    | Pattern matching for common spam phrases            |
| URL Count        | Flags messages with >= 2 URLs                       |

### Idempotency

Prevents duplicate leads from form resubmission:

```typescript
// Idempotency key generation
const idempotencyKey = generateIdempotencyKey(
  email,
  pageUrl,
  getWindowBucket(60) // 60-minute windows
);
```

**DynamoDB Idempotency Entry:**

```
PK: IDEMPOTENCY#<key>
SK: META
response: <cached_response_json>
statusCode: 201
TTL: <24_hours_from_creation>
```

### IP Anonymization

GDPR-compliant IP handling:

```typescript
// IPv4: Zero last octet
anonymizeIPv4('192.168.1.123'); // '192.168.1.0'

// IPv6: Reduce to /48 prefix
anonymizeIPv6('2001:db8:85a3::7334'); // '2001:db8:85a3::'
```

## DynamoDB Schema

### Single-Table Design

| Entity      | PK Pattern           | SK Pattern        |
| ----------- | -------------------- | ----------------- |
| Lead        | `LEAD#<uuid>`        | `META`            |
| Rate Limit  | `IP#<hash>`          | `WINDOW#<bucket>` |
| Idempotency | `IDEMPOTENCY#<hash>` | `META`            |

### Global Secondary Index (GSI1)

For email-based lookups:

| GSI1PK                     | GSI1SK                |
| -------------------------- | --------------------- |
| `EMAIL#<normalized_email>` | `CREATED#<timestamp>` |

### Lead Item Structure

```json
{
  "pk": "LEAD#550e8400-...",
  "sk": "META",
  "gsi1pk": "EMAIL#john@example.com",
  "gsi1sk": "CREATED#2024-01-15T10:30:00.000Z",
  "id": "550e8400-...",
  "email": "john@example.com",
  "name": "John Doe",
  "phone": "+15551234567",
  "notes": "Interested in services",
  "source": "real-estate",
  "status": "new",
  "suspicious": false,
  "suspicionReasons": [],
  "utm": {
    "utm_source": "google",
    "utm_medium": "cpc"
  },
  "metadata": {
    "pageUrl": "https://kanjona.com/en/real-estate"
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## Environment Variables

| Variable                | Description                 | Default      |
| ----------------------- | --------------------------- | ------------ |
| `AWS_REGION`            | AWS region                  | `us-east-1`  |
| `ENV`                   | Environment (dev/prod)      | `dev`        |
| `DDB_TABLE_NAME`        | DynamoDB table name         | **Required** |
| `EVENT_BUS_NAME`        | EventBridge bus name        | `default`    |
| `RATE_LIMIT_MAX`        | Max requests per window     | `10`         |
| `RATE_LIMIT_WINDOW_MIN` | Rate limit window (minutes) | `10`         |
| `IDEMPOTENCY_TTL_HOURS` | Idempotency TTL (hours)     | `24`         |
| `IP_HASH_SALT`          | Salt for IP hashing         | Optional     |
| `EMAIL_HASH_SALT`       | Salt for email hashing      | Optional     |

## Development

### Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your values
```

### Local Development

```bash
# Run local development server
npm run dev

# Watch mode for tests
npm run test:watch
```

### Build

```bash
# Build for production
npm run build

# Type check
npm run typecheck
```

### Project Structure

```
src/
├── handler.ts           # Main Lambda handler
├── router.ts            # Request routing
├── types.ts             # TypeScript types
├── local.ts             # Local development server
├── health/
│   └── handler.ts       # Health check endpoint
├── lib/
│   ├── dynamo.ts        # DynamoDB operations
│   ├── events.ts        # EventBridge publishing
│   ├── hash.ts          # Hashing utilities
│   ├── http.ts          # HTTP response helpers
│   ├── normalize.ts     # Input normalization
│   ├── security.ts      # Security analysis
│   ├── time.ts          # Time utilities
│   └── validate.ts      # Input validation
├── admin/
│   ├── handler.ts       # Admin API handler
│   ├── types.ts         # Admin types
│   └── lib/
│       ├── auth.ts      # Cognito authentication
│       ├── audit.ts     # Audit logging
│       ├── exports.ts   # Data export
│       ├── gdpr.ts      # GDPR operations
│       ├── http.ts      # Admin HTTP helpers
│       └── leads.ts     # Lead CRUD operations
└── __tests__/
    ├── helpers.ts       # Test utilities
    ├── security.test.ts # Security tests
    └── validate.test.ts # Validation tests
```

## Testing

### Running Tests

```bash
# Run all tests
npm run test:run

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### Test Examples

```typescript
// security.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeLeadSecurity, anonymizeIp } from './lib/security';

describe('analyzeLeadSecurity', () => {
  it('flags disposable email domains', () => {
    const result = analyzeLeadSecurity(
      { email: 'test@mailinator.com', name: 'Test' },
      '192.168.1.1',
      'test-salt',
      60
    );

    expect(result.suspicious).toBe(true);
    expect(result.reasons).toContain('disposable_email_domain');
  });
});

describe('anonymizeIp', () => {
  it('zeros last octet for IPv4', () => {
    expect(anonymizeIp('192.168.1.123')).toBe('192.168.1.0');
  });
});
```

## Deployment

### Infrastructure

Deploy using Terraform (see `/infra/terraform/`).

**Lambda Configuration:**

| Setting      | Value            |
| ------------ | ---------------- |
| Architecture | ARM64 (Graviton) |
| Memory       | 128MB            |
| Timeout      | 10 seconds       |
| Tracing      | X-Ray enabled    |

### Manual Deployment

```bash
# Build
npm run build

# Deploy via GitHub Actions
gh workflow run backend-deploy.yml -f environment=dev
```

## Logging

### Structured JSON Logging

All logs are JSON-formatted for CloudWatch Logs Insights:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "abc123",
  "level": "info",
  "message": "Lead created",
  "leadId": "550e8400-...",
  "status": "accepted",
  "suspicious": false,
  "emailHash": "a1b2c3...",
  "ipHash": "d4e5f6...",
  "latencyMs": 150
}
```

### Privacy-Safe Logging

**Never logged in plaintext:**

- Email addresses
- Phone numbers
- IP addresses
- Names

**Logged instead:**

- Hashed email (SHA-256 prefix)
- Hashed IP (SHA-256 prefix)
- Anonymized IP (/24 for IPv4)

### CloudWatch Logs Insights Queries

```sql
-- Find suspicious leads
fields @timestamp, leadId, suspicionReasons
| filter suspicious = true
| sort @timestamp desc
| limit 100

-- Rate limited requests
fields @timestamp, ipHash, message
| filter message like /rate limit/i
| stats count() by ipHash
| sort count desc

-- Error rates
fields @timestamp, level, message
| filter level = "error"
| stats count() by bin(1h)
```

## Admin API

The admin API provides authenticated access for lead management.

### Endpoints

| Method   | Endpoint              | Description                |
| -------- | --------------------- | -------------------------- |
| `GET`    | `/admin/leads`        | List leads with pagination |
| `GET`    | `/admin/leads/:id`    | Get lead details           |
| `DELETE` | `/admin/leads/:id`    | Delete lead (GDPR)         |
| `POST`   | `/admin/leads/export` | Export leads to CSV        |

### Authentication

Uses AWS Cognito JWT tokens:

```bash
curl -X GET https://api.kanjona.com/admin/leads \
  -H "Authorization: Bearer <cognito_jwt_token>"
```

### GDPR Operations

```typescript
// Delete lead and all associated data
await gdprDelete(leadId);

// Export user data
const data = await gdprExport(email);
```

---

## Troubleshooting

### Common Issues

**Lambda cold starts slow:**

- Increase memory allocation
- Use provisioned concurrency for production

**Rate limiting not working:**

- Check DynamoDB table exists
- Verify IAM permissions for DynamoDB

**Events not publishing:**

- Verify EventBridge bus exists
- Check IAM permissions for events:PutEvents

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
```

---

For more information, see the [main README](../../README.md).
