# Architecture Map: Kanjona Lead Generation Platform

> Last Updated: 2026-01-26

## 1. System Overview

**Project Type:** Multi-funnel SaaS lead generation platform (47 service funnels)

**Tech Stack:**

- **Frontend:** Next.js 15 (App Router, TypeScript, React 19)
- **Backend:** Swift 5.10 + Vapor 4.90 (async/await)
- **Database:** DynamoDB (47 funnel tables + shared tables)
- **Message Queue:** EventBridge (async events)
- **Infrastructure:** Terraform, AWS Lambda, API Gateway, CloudFront, S3
- **State Management:** Redux Toolkit (Frontend)
- **Validation:** Zod (TypeScript), Vapor Validatable (Swift)

**Deployment:**

- Frontend: Static export → CloudFront + S3
- Backend: Swift binary → AWS Lambda + API Gateway
- Infrastructure: Terraform (dev + prod environments)

---

## 2. Module/Service Inventory

### Frontend (apps/web)

| Component         | Purpose                                           | Key Files                         |
| ----------------- | ------------------------------------------------- | --------------------------------- |
| LeadForm          | Main form component with validation               | `components/LeadForm.tsx`         |
| Animations        | Framer Motion + GSAP animations                   | `components/animations/*`         |
| Funnel Components | Service-specific UI (FAQ, Testimonials, Benefits) | `components/funnel/*`             |
| Language Switcher | i18n support (EN/ES)                              | `components/LanguageSwitcher.tsx` |
| Redux Store       | State management                                  | `store/leadSlice.ts`              |
| API Client        | Lead submission                                   | `lib/api.ts`, `lib/api-client.ts` |
| Validators        | Client-side validation                            | `lib/validators.ts`               |

### Backend API (backend/Sources/LeadCaptureAPI)

| Service             | Purpose                                        | Key File                             |
| ------------------- | ---------------------------------------------- | ------------------------------------ |
| LeadService         | Main orchestrator (parallelized operations)    | `Services/LeadService.swift`         |
| ValidationService   | Input validation with character safety checks  | `Services/ValidationService.swift`   |
| RateLimiterService  | 5 req/min/IP/funnel with in-memory cache       | `Services/RateLimiterService.swift`  |
| SpamDetectorService | 9-point spam scoring algorithm                 | `Services/SpamDetectorService.swift` |
| DynamoDBService     | Lead storage, idempotency, rate limit tracking | `Services/DynamoDBService.swift`     |
| EventBridgeService  | Async event publishing                         | `Services/EventBridgeService.swift`  |
| QuarantineService   | Spam/disposable email detection                | `Services/QuarantineService.swift`   |
| ConfigService       | SSM Parameter Store integration                | `Services/ConfigService.swift`       |

### Shared Modules (packages/shared)

| Export                | Purpose                        |
| --------------------- | ------------------------------ |
| LeadInput, LeadStatus | Type definitions               |
| FunnelConfig          | Funnel configuration types     |
| FUNNEL_IDS            | Array of 47 funnel identifiers |
| Validators            | Shared validation functions    |

### Infrastructure (infra/terraform)

| Module       | Purpose                                                            |
| ------------ | ------------------------------------------------------------------ |
| dynamodb/    | 47 per-funnel tables + shared rate-limits/idempotency/audit tables |
| api-gateway/ | REST API setup                                                     |
| eventbridge/ | Event bus configuration                                            |
| ssm/         | Parameter store for feature flags                                  |
| secrets/     | API keys, credentials                                              |
| static_site/ | CloudFront + S3 frontend hosting                                   |
| acm/         | SSL/TLS certificates                                               |
| dns/         | Route 53 DNS records                                               |
| waf/         | Web Application Firewall                                           |
| monitoring/  | CloudWatch alarms and dashboards                                   |

---

## 3. Sacred Patterns

### Error Handling

**Swift Backend:**

- Enum `AppError: AbortError` with specific cases (validationFailed, rateLimitExceeded,
  honeypotTriggered, etc.)
- Maps to HTTPResponseStatus (400, 429, 409, 500)
- Custom error codes: `APIErrorCode` (INVALID_EMAIL, RATE_LIMIT_EXCEEDED, etc.)
- `ErrorMiddleware` catches all errors and builds consistent JSON responses
- Honeypot returns 201 Created to fool bots (indistinguishable from real success)

**TypeScript Frontend:**

- `ApiRequestError extends Error` with statusCode, code, errors fields
- `submitLeadToApi` wraps API calls with try/catch
- Redux thunk handles promise rejection with `rejectWithValue`

### Validation

**Swift Pattern:**

- `Vapor.Validatable` protocol on LeadRequest
- `ValidationService.validate()` for comprehensive checks
- `ValidationErrors` builder collects multiple errors before throwing

**TypeScript Pattern:**

- Simple validators: `validateEmail()`, `validatePhone()`, `validateMessage()`
- Return `ValidationResult` with `isValid` and `error`

**Shared Limits (ValidationLimits.swift):**

- Email: 6-254 chars, local part ≤64, domain ≤253
- Name: 1-100 chars
- Phone: 7-20 chars
- Notes: 0-2000 chars
- Idempotency key: 16-64 chars

### Database Access

**Single-Table Design per Funnel:**

```
Partition key: pk (LEAD#<id>, RATELIMIT#<id>, IDEMPOTENCY#<key>, EMAIL#<email>)
Sort key: sk (METADATA#<timestamp>, WINDOW#<bucket>, KEY#<hash>)
GSI1: gsi1pk=EMAIL#<email>, gsi1sk=CREATED#<timestamp>
```

**DynamoDBService Pattern:**

- `createLead()` with conditional check (attribute_not_exists)
- `getLeadsByEmail()` queries GSI1 for deduplication
- `checkRateLimit()` uses UpdateItem with atomic increment
- `storeIdempotencyResponse()` caches response + requestHash

### Logging

**Swift (SecureLogger):**

- Automatic PII redaction: emails, IPs, phone numbers, API keys
- Pre-compiled regex patterns for performance
- Methods: `debug()`, `info()`, `warning()`, `error()`, `security()`

---

## 4. Data Ownership & Boundaries

| Module              | Owns               | Reads           | Writes To            |
| ------------------- | ------------------ | --------------- | -------------------- |
| LeadController      | Request routing    | LeadRequest     | Response 201/400/429 |
| LeadService         | Lead creation flow | Lead, config    | LeadService result   |
| DynamoDBService     | Lead persistence   | DynamoDB        | Leads, rate limits   |
| ValidationService   | Field rules        | LeadRequest     | ValidationErrors     |
| RateLimiterService  | Rate limit state   | Cache, DynamoDB | Cache, DynamoDB      |
| SpamDetectorService | Spam scoring       | Email, text     | SpamResult           |
| Frontend LeadForm   | Form state         | Redux store     | Redux (lead status)  |

### API Boundaries

**Public API:**

- `POST /lead` - Submit a lead
- `POST /funnel/:funnelId/lead` - Submit to specific funnel

**Import Rules:**

- Frontend imports from `@kanjona/shared` (types only)
- Backend `LeadCaptureAPI` imports from `Shared` target
- Controllers → Services → Data Layer (layered architecture)

---

## 5. Danger Zones / Security-Critical Areas

### Authentication & Authorization

- **API Key Middleware:** Validates X-API-Key header if enabled
- **Trusted Proxies:** Only trust X-Forwarded-For from AWS VPC ranges
- **CORS:** No wildcard in prod; explicitly configured

### Spam & Honeypot

- **Honeypot Field:** `website` field (empty = valid, filled = bot)
- **Honeypot Response:** Returns fake 201 to fool bots
- **Disposable Email:** Check against blocked list
- **Bot Detection:** User-Agent pattern matching

### Rate Limiting (Fail-Closed)

- **5 requests per minute per IP per funnel**
- **Burst limit:** 5 requests per 10 seconds
- **DynamoDB Throttling:** Reject request (fail closed)

### Idempotency & Duplicate Prevention

- **Idempotency Key:** 16-64 chars, alphanumeric
- **Collision Detection:** SHA256 hash comparison
- **Email Rate Limit:** Max 3 leads per email per 24 hours

### Data Protection

- **DynamoDB Encryption:** AWS-owned key
- **Point-in-time recovery:** Enabled on prod
- **Deletion protection:** On prod funnels
- **TTL:** Idempotency keys expire after 24 hours

### PII Handling

- **Never log:** email, phone, IP in plaintext (redacted)
- **Safe to log:** leadId, action, requestId, status

---

## 6. Dependency Graph

```
Frontend (Next.js)
  ├── @kanjona/shared (types)
  ├── Redux Store
  │   └── leadSlice
  │       └── submitLead (async thunk)
  │           └── lib/api.ts
  │
  └── LeadForm.tsx
      ├── validators
      ├── utm
      └── animations (Framer Motion, GSAP)

Backend (Swift/Vapor)
  LeadCaptureAPI
  ├── main.swift → configure()
  │   ├── Middleware Stack:
  │   │   1. ErrorMiddleware
  │   │   2. SecurityHeadersMiddleware
  │   │   3. CORSMiddleware
  │   │   4. OriginValidationMiddleware
  │   │   5. APIKeyMiddleware
  │   │   6. RequestLoggingMiddleware
  │   │
  │   └── Services:
  │       ├── DynamoDBService (SotoDynamoDB)
  │       ├── RateLimiterService
  │       ├── ValidationService
  │       ├── SpamDetectorService
  │       ├── EventBridgeService (SotoEventBridge)
  │       └── QuarantineService
  │
  └── LeadController
      └── POST /lead → LeadService.createLead()

Infrastructure (Terraform)
  envs/dev/ & envs/prod/
  ├── modules/dynamodb/ (47 funnel tables)
  ├── modules/api-gateway/
  ├── modules/eventbridge/
  ├── modules/secrets/
  ├── modules/ssm/
  ├── modules/static_site/
  ├── modules/acm/
  ├── modules/dns/
  └── modules/waf/
```

---

## 7. Critical Request Flows

### Lead Submission (Happy Path)

```
1. User fills form → client validation
2. POST /lead with body
3. Middleware stack processes request
4. LeadController.createLead():
   a. Decode JSON → LeadRequest
   b. Validate fields
   c. Rate limit check (5 req/min/IP)
   d. Spam detection + honeypot check
   e. LeadService.createLead():
      - Parallel DB lookups (idempotency, rate limit, email)
      - Create lead in DynamoDB
      - Fire-and-forget: EventBridge event, audit log
5. Return 201 Created with lead ID
6. Frontend → Redux dispatch fulfilled → show success
```

### Rate Limit Exceeded

```
1. IP hits 6th request within 60s
2. DynamoDB conditional update fails
3. Return 429 with Retry-After header
```

### Honeypot Triggered

```
1. Bot fills website field
2. Log security event
3. Return fake 201 (no lead created)
```

---

## 8. Feature Flags (SSM Parameter Store)

| Flag                       | Default Dev | Default Prod |
| -------------------------- | ----------- | ------------ |
| enable_voice_agent         | false       | false        |
| enable_twilio              | false       | false        |
| enable_elevenlabs          | false       | false        |
| enable_waf                 | false       | true         |
| enable_email_notifications | false       | true         |
| enable_rate_limiting       | true        | true         |
| enable_deduplication       | true        | true         |
| enable_debug               | true        | false        |

---

### Testing Patterns

### Swift Backend

- **Swift Testing** for all unit tests
- XCTVapor for controller tests (bridged with Swift Testing)
- Unit tests per service: ValidationServiceTests, RateLimiterServiceTests
- Model tests: LeadModelTests

### Frontend

- Redux store tests
- Form validation tests
- API error handling tests

---

## 10. Key Patterns Summary

| Category         | Pattern                                  | Location                  |
| ---------------- | ---------------------------------------- | ------------------------- |
| Error            | Enum + AbortError + HTTPStatus           | AppError.swift            |
| Validation       | Vapor.Validatable + ValidationService    | LeadRequest.swift         |
| Rate Limit       | In-memory cache + DynamoDB atomic update | RateLimiterService.swift  |
| Spam             | Weighted scoring (9 factors)             | SpamDetectorService.swift |
| Idempotency      | DynamoDB + SHA256 collision detect       | DynamoDBService.swift     |
| Logging          | Regex PII redaction                      | SecureLogger.swift        |
| Honeypot         | Return fake 201                          | LeadController.swift      |
| Parallelization  | async let + await all                    | LeadService.swift         |
| State Management | Redux thunk + async                      | leadSlice.ts              |

---

## 11. Directory Structure

```
Leads-Funnel/
├── apps/
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/[locale]/   # i18n routes (47 funnels)
│           ├── components/     # React components
│           ├── config/         # Service configurations
│           ├── i18n/           # Translations (EN/ES)
│           ├── lib/            # Utilities, API client
│           └── store/          # Redux store
├── backend/                    # Swift/Vapor API
│   └── Sources/
│       ├── LeadCaptureAPI/     # Main API target
│       │   ├── Controllers/
│       │   ├── Middleware/
│       │   ├── Models/
│       │   ├── Services/
│       │   └── Utilities/
│       └── Shared/             # Shared types
├── packages/
│   └── shared/                 # TypeScript shared types
├── infra/
│   └── terraform/
│       ├── envs/dev/           # Dev environment
│       ├── envs/prod/          # Prod environment
│       └── modules/            # Reusable modules
├── scripts/
│   └── agent_gate.sh           # Quality gate script
└── docs/
    └── ARCHITECTURE_MAP.md     # This file
```
