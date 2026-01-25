# Lead Capture API

AWS Lambda function for capturing leads from the website.

## Architecture

- **Runtime**: Node.js 20 (AWS Lambda)
- **Framework**: None (vanilla TypeScript)
- **Database**: DynamoDB (single-table design)
- **Events**: EventBridge for async processing

## API Endpoint

### POST /lead

Captures a new lead from the website form.

#### Request Body

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-123-4567",
  "notes": "Interested in your services",
  "utm": {
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "summer-sale"
  },
  "metadata": {
    "pageUrl": "https://example.com/landing",
    "referrer": "https://google.com"
  }
}
```

#### Responses

**201 Created** - Lead successfully captured
```json
{
  "ok": true,
  "leadId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "accepted"
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
  }
}
```

**429 Too Many Requests** - Rate limited
```json
{
  "ok": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Try again later."
  }
}
```

## Features

### Security

- **Input Validation**: Strict validation with max lengths
- **Normalization**: Email lowercase, whitespace trimming
- **Rate Limiting**: IP-based with sliding window buckets
- **Idempotency**: Prevents duplicate leads from form resubmission
- **Spam Detection**: Disposable email and keyword filtering
- **Privacy**: Never logs raw email, phone, or IP addresses

### Anti-Spam

Leads are marked as `quarantined` if they match:
- Disposable email domains (mailinator, yopmail, etc.)
- Spam keywords (backlinks, SEO services, crypto, etc.)
- Excessive URLs in message (>= 2)

Quarantined leads are still stored but flagged for review.

## DynamoDB Schema

Uses single-table design with the following patterns:

| Entity | PK | SK |
|--------|----|----|
| Lead | `LEAD#<uuid>` | `META` |
| Rate Limit | `IP#<hash>` | `WINDOW#<bucket>` |
| Idempotency | `IDEMPOTENCY#<hash>` | `META` |

### GSI1 (Email Lookup)
- `gsi1pk`: `EMAIL#<normalized_email>`
- `gsi1sk`: `CREATED#<timestamp>`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_REGION` | AWS region | `us-east-1` |
| `ENV` | Environment (dev/prod) | `dev` |
| `DDB_TABLE_NAME` | DynamoDB table name | Required |
| `EVENT_BUS_NAME` | EventBridge bus name | `default` |
| `RATE_LIMIT_MAX` | Max requests per window | `10` |
| `RATE_LIMIT_WINDOW_MIN` | Rate limit window (minutes) | `10` |
| `IDEMPOTENCY_TTL_HOURS` | Idempotency TTL (hours) | `24` |
| `IP_HASH_SALT` | Salt for IP hashing | Optional |

## Development

### Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your values
```

### Local Testing

```bash
# Run local tests
npm run dev
```

### Type Checking

```bash
npm run typecheck
```

### Build

```bash
npm run build
```

## Deployment

Deploy using Terraform (see `/infra/terraform/`).

The Lambda is configured with:
- ARM64 (Graviton) for cost savings
- 128MB memory (sufficient for this workload)
- 10 second timeout
- X-Ray tracing enabled

## Logging

Uses structured JSON logging. Example:

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

**Privacy**: Never logs raw email, phone, or IP addresses - only hashes.
