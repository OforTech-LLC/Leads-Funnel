# Kanjona Backend

Swift/Vapor backend API for lead capture and processing.

## Features

- **Lead Capture API**: Validated lead submission with spam protection
- **Rate Limiting**: 5 requests per minute per IP per funnel
- **Spam Detection**: Pattern matching, disposable email detection, honeypot
- **Idempotency**: Duplicate request prevention via Idempotency-Key header
- **Feature Flags**: SSM Parameter Store integration with caching
- **DynamoDB**: Single-table design for lead storage
- **EventBridge**: Async event publishing for downstream processing

## Directory Structure

```
Sources/
├── LeadCaptureAPI/
│   ├── main.swift              # Application entry point
│   │
│   ├── Controllers/
│   │   ├── LeadController.swift    # Lead submission endpoints
│   │   ├── HealthController.swift  # Health check endpoints
│   │   └── VoiceController.swift   # Voice agent endpoints (placeholder)
│   │
│   ├── Services/
│   │   ├── LeadService.swift       # Lead business logic
│   │   ├── DynamoDBService.swift   # Database operations
│   │   ├── ConfigService.swift     # SSM parameter loading
│   │   ├── RateLimiterService.swift # Rate limiting logic
│   │   ├── SpamDetectorService.swift # Spam analysis
│   │   ├── ValidationService.swift  # Input validation
│   │   ├── QuarantineService.swift  # Spam quarantine
│   │   └── EventBridgeService.swift # Event publishing
│   │
│   ├── Middleware/
│   │   ├── ErrorMiddleware.swift   # Error handling
│   │   ├── CORSMiddleware.swift    # CORS configuration
│   │   ├── APIKeyMiddleware.swift  # API key authentication
│   │   ├── OriginValidationMiddleware.swift # Origin checking
│   │   ├── RequestLoggingMiddleware.swift   # Request logging
│   │   └── SecurityHeadersMiddleware.swift  # Security headers
│   │
│   ├── Models/
│   │   ├── Lead.swift              # Lead data model
│   │   ├── LeadRequest.swift       # API request model
│   │   ├── FunnelConfig.swift      # Funnel configuration
│   │   └── DynamoDBModels.swift    # DynamoDB models
│   │
│   ├── Utilities/
│   │   ├── SecureLogger.swift      # PII-safe logging
│   │   ├── JSONCoding.swift        # JSON helpers
│   │   └── AWSClientFactory.swift  # AWS client setup
│   │
│   ├── Errors/
│   │   └── AppError.swift          # Custom error types
│   │
│   └── Configuration/
│       └── AppConfig.swift         # Environment configuration
│
└── Shared/
    ├── Types/
    │   └── LeadTypes.swift         # Shared type definitions
    └── Constants/
        ├── QuarantineLists.swift   # Spam detection lists
        └── ValidationLimits.swift  # Validation constants

Tests/
├── LeadCaptureAPITests/
│   ├── LeadControllerTests.swift   # Controller tests
│   ├── RateLimiterServiceTests.swift
│   ├── SpamDetectorTests.swift
│   └── ConfigServiceTests.swift
│
└── SharedTests/
    ├── LeadTypesTests.swift
    ├── QuarantineListsTests.swift
    └── ValidationLimitsTests.swift
```

## API Endpoints

### Lead Submission

```
POST /lead
POST /leads
POST /funnel/:funnelId/lead
POST /funnel/:funnelId/leads
```

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "company": "Acme Inc",
  "notes": "Interested in services",
  "source": "website",
  "metadata": {
    "pageUrl": "https://...",
    "referrer": "https://..."
  }
}
```

**Headers:**

- `Content-Type: application/json`
- `Idempotency-Key: <unique-key>` (optional, prevents duplicates)
- `X-API-Key: <api-key>` (if API key auth enabled)

### Health Checks

```
GET /health          # Basic health check
GET /health/live     # Kubernetes liveness probe
GET /health/ready    # Kubernetes readiness probe
GET /health/detailed # Detailed health with dependencies
```

## Development

```bash
# Build
swift build

# Run locally
swift run

# Run tests
swift test

# Build for release
swift build -c release
```

## Environment Variables

```env
# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# DynamoDB
DYNAMODB_TABLE_NAME=kanjona-leads-dev

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=5
RATE_LIMIT_WINDOW_SECONDS=60

# Feature Flags
ENABLE_VOICE_AGENT=false
ENABLE_TWILIO=false
ENABLE_ELEVENLABS=false

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

## Lambda Deployment

The backend is packaged as a Lambda function using the Swift AWS Lambda Runtime:

```bash
# Build for Lambda (Amazon Linux 2)
swift build -c release --static-swift-stdlib

# Package
cp .build/release/LeadCaptureAPI bootstrap
zip lambda-deployment.zip bootstrap
```
