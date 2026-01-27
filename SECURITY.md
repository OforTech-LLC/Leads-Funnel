# Security Policy

This document outlines the security measures, practices, and policies implemented in the Kanjona
lead generation platform.

## Table of Contents

- [Security Overview](#security-overview)
- [Reporting Vulnerabilities](#reporting-vulnerabilities)
- [Security Features](#security-features)
- [Authentication and Authorization](#authentication-and-authorization)
- [Data Protection](#data-protection)
- [Infrastructure Security](#infrastructure-security)
- [Security Best Practices](#security-best-practices)
- [Compliance](#compliance)
- [Security Checklist](#security-checklist)

## Security Overview

Kanjona implements a defense-in-depth security strategy with multiple layers of protection:

```
┌─────────────────────────────────────────────────────────────────┐
│                        WAF (Production)                          │
│  • OWASP Core Rule Set                                          │
│  • Rate limiting rules                                          │
│  • Geo-blocking (optional)                                      │
├─────────────────────────────────────────────────────────────────┤
│                        CloudFront                                │
│  • SSL/TLS termination                                          │
│  • Security headers                                             │
│  • Origin access control                                        │
├─────────────────────────────────────────────────────────────────┤
│                        API Gateway                               │
│  • Request validation                                           │
│  • Throttling                                                   │
│  • CORS policy enforcement                                      │
├─────────────────────────────────────────────────────────────────┤
│                        Lambda Functions                          │
│  • Input validation                                             │
│  • Rate limiting                                                │
│  • Spam detection                                               │
│  • Idempotency                                                  │
├─────────────────────────────────────────────────────────────────┤
│                        Data Layer                                │
│  • Encryption at rest                                           │
│  • Hashed PII for logging                                       │
│  • Access controls                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Reporting Vulnerabilities

### Responsible Disclosure

We take security vulnerabilities seriously. If you discover a security issue, please report it
responsibly.

**DO NOT** open a public GitHub issue for security vulnerabilities.

### How to Report

1. **Email**: Send a detailed report to security@kanjona.com
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

| Action             | Timeline                          |
| ------------------ | --------------------------------- |
| Acknowledgment     | 24 hours                          |
| Initial Assessment | 72 hours                          |
| Fix Development    | 7-14 days (depending on severity) |
| Public Disclosure  | After fix is deployed             |

### Severity Classification

| Level    | Description                         | Examples                               |
| -------- | ----------------------------------- | -------------------------------------- |
| Critical | Immediate threat to production data | RCE, SQL injection, auth bypass        |
| High     | Significant security impact         | XSS, CSRF, information disclosure      |
| Medium   | Limited security impact             | Rate limit bypass, minor data exposure |
| Low      | Minimal security impact             | Best practice violations               |

## Security Features

### 1. Rate Limiting

Protects against abuse and denial-of-service attacks.

**Configuration**:

- 5 requests per minute per IP address per funnel
- Sliding window algorithm
- Separate limits for each funnel endpoint
- Export endpoints use atomic DynamoDB-based throttle to prevent race conditions (10 exports/hour
  per user)

**Implementation** (Swift Backend):

```swift
let rateLimitResult = await rateLimiterService.checkRateLimit(
    identifier: "\(clientIP):\(funnelId)",
    maxRequests: 5,
    windowSeconds: 60
)
```

**Response Headers**:

- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Seconds until window resets
- `Retry-After`: Seconds to wait (when rate limited)

### 2. Spam Detection

Multi-layered spam detection system with scoring.

**Detection Methods**:

| Method           | Weight | Description                                 |
| ---------------- | ------ | ------------------------------------------- |
| Disposable Email | 0.9    | Known throwaway email domains               |
| Suspicious TLD   | 0.6    | High-risk top-level domains                 |
| Spam Patterns    | 0.7    | Keyword detection (backlinks, crypto, etc.) |
| Test Email       | 0.8    | Test/dev email patterns                     |
| Honeypot         | 1.0    | Hidden field filled by bots                 |
| Suspicious UA    | 0.5    | Bot user agent patterns                     |
| Gibberish        | 0.5    | Abnormal text patterns                      |
| Excessive Links  | 0.6    | >3 URLs in message                          |
| Rapid Submission | 0.4    | High submission velocity                    |

**Scoring Thresholds**:

- Score < 0.7: Allow
- Score >= 0.7: Quarantine for review
- Score >= 0.9: Block (return fake success)

### 3. Honeypot Fields

Hidden form fields that trap automated bots.

**Implementation**:

- Hidden `website` field in forms
- CSS-hidden but accessible to bots
- Triggers fake 201 response to deceive bots

```swift
if leadRequest.website != nil && !leadRequest.website!.isEmpty {
    SecureLogger.security("Honeypot triggered", metadata: [...])
    return createFakeSuccessResponse(requestId: requestId)
}
```

### 4. Idempotency

Prevents duplicate lead submissions.

**How it Works**:

1. Client sends `Idempotency-Key` header
2. Server stores request hash with response
3. Duplicate requests return cached response
4. Keys expire after 24 hours

**Headers**:

- Request: `Idempotency-Key: unique-client-key`
- Response: `X-Idempotent-Replay: true` (for cached responses)

### 5. Security Headers

All API responses include security headers.

| Header                      | Value                             | Purpose                 |
| --------------------------- | --------------------------------- | ----------------------- |
| `X-Frame-Options`           | `DENY`                            | Prevent clickjacking    |
| `X-Content-Type-Options`    | `nosniff`                         | Prevent MIME sniffing   |
| `X-XSS-Protection`          | `1; mode=block`                   | XSS protection (legacy) |
| `Content-Security-Policy`   | `default-src 'none'`              | Resource restrictions   |
| `Referrer-Policy`           | `strict-origin-when-cross-origin` | Referrer control        |
| `Permissions-Policy`        | `geolocation=()...`               | Feature restrictions    |
| `Strict-Transport-Security` | `max-age=31536000`                | Force HTTPS (prod)      |
| `Cache-Control`             | `no-store, private`               | Prevent caching         |

### 6. CORS Protection

Strict Cross-Origin Resource Sharing policy.

**Allowed Origins** (configured per environment):

- Development: `http://localhost:3000`
- Production: `https://kanjona.com`, `https://www.kanjona.com`

**Blocked Actions**:

- Requests from unauthorized origins
- Requests without proper headers
- Preflight violations

### 7. Input Validation

Comprehensive validation on all inputs.

**Validation Rules**:

| Field    | Rules                                            |
| -------- | ------------------------------------------------ |
| `email`  | Required, valid format, max 255 chars            |
| `name`   | Required, max 100 chars                          |
| `phone`  | Optional, valid format, max 20 chars             |
| `notes`  | Optional, max 2000 chars, count-limited per lead |
| `source` | Optional, max 100 chars                          |

**Normalization**:

- Email: Lowercase, trimmed
- Phone: Stripped to digits and +
- Text: Trimmed, HTML entity-encoded (not blocklist-based)

**Sanitization Approach**: All user input is sanitized using HTML entity encoding (`&`, `<`, `>`,
`"`, `'` replaced with their entity equivalents). This is a positive-security model that neutralizes
injection payloads without relying on pattern matching or blocklists.

## Authentication and Authorization

### Admin API Authentication

The admin API uses AWS Cognito for authentication.

**Flow**:

1. Admin logs in via Cognito hosted UI
2. Receives JWT access token
3. Token included in `Authorization` header
4. Lambda validates token with Cognito

**Token Validation**:

- Signature verification via JWKS
- Expiration check
- Audience verification
- Issuer verification

**Fail-Closed Admin Auth**: If the SSM email allowlist cannot be loaded (network error, missing
parameter), authentication denies all access rather than failing open. An empty allowlist also
denies all access. See `apps/api/src/lib/auth/admin-auth.ts`.

**OAuth State Parameter**: All three frontend apps (web, portal, admin) include a cryptographically
random state parameter in OAuth redirects and verify it on callback using a timing-safe comparison
to prevent CSRF during login.

**HMAC-Signed Pagination Cursors**: All paginated API responses use HMAC-SHA256 signed cursors
(`apps/api/src/lib/cursor.ts`) to prevent clients from forging or tampering with DynamoDB
ExclusiveStartKey values. Signature verification uses `timingSafeEqual` to prevent timing attacks.

### API Key Authentication (Optional)

For machine-to-machine access:

- API keys stored in Secrets Manager
- Keys rotated periodically
- Rate limited separately

### IAM Roles

Lambda functions use minimal IAM permissions:

```hcl
# Lead API Permissions
- dynamodb:PutItem
- dynamodb:GetItem
- dynamodb:Query (specific table)
- ssm:GetParameter (specific parameters)
- events:PutEvents (specific bus)
```

## Data Protection

### Encryption

| Layer              | Method                     |
| ------------------ | -------------------------- |
| In Transit         | TLS 1.2+                   |
| At Rest (DynamoDB) | AES-256 (AWS managed)      |
| Secrets            | Secrets Manager encryption |
| Parameters         | SSM SecureString           |

### PII Protection

Sensitive data is never logged in plaintext.

**Hashing Strategy**:

```typescript
// IP addresses are hashed for logging
const ipHash = hashIp(clientIp, ipHashSalt);

// Emails are hashed with salt
const emailHash = hashEmailWithSalt(email, emailHashSalt);

// Log safe data only
logger.info('Lead created', {
  leadId,
  ipHash, // Not raw IP
  emailHash, // Not raw email
  anonymizedIp, // Last octet zeroed
});
```

**GDPR-Compliant IP Anonymization**:

```typescript
// IPv4: Zero last octet
'192.168.1.123' → '192.168.1.0'

// IPv6: Reduce to /48 prefix
'2001:db8:85a3::7334' → '2001:db8:85a3::'
```

### Data Retention

| Data Type        | Retention | Justification        |
| ---------------- | --------- | -------------------- |
| Lead Data        | 2 years   | Business requirement |
| Rate Limit Data  | 24 hours  | Temporary state      |
| Idempotency Keys | 24 hours  | Duplicate prevention |
| Access Logs      | 90 days   | Security monitoring  |
| Audit Logs       | 1 year    | Compliance           |

### Data Deletion

GDPR right to erasure is supported:

- Admin can delete individual leads
- Automated retention scripts
- Deletion is cascading (all related data)

## Infrastructure Security

### AWS WAF (Production)

Web Application Firewall with managed rules:

**Rule Groups**:

- AWS Managed Rules - Common Rule Set
- AWS Managed Rules - Known Bad Inputs
- AWS Managed Rules - SQL Database
- Rate-based rules (1000 req/5min per IP)

### VPC Security (If Applicable)

- Private subnets for Lambda
- Security groups with minimal ingress
- NAT Gateway for outbound access

### Secrets Management

```
AWS Secrets Manager
├── /kanjona/prod/api-keys
│   ├── twilio_api_key
│   ├── elevenlabs_api_key
│   └── sendgrid_api_key
└── /kanjona/prod/internal
    ├── ip_hash_salt
    └── email_hash_salt
```

### Parameter Store

Feature flags and configuration:

```
SSM Parameter Store
├── /kanjona/prod/features/
│   ├── enable_voice_agent (false)
│   ├── enable_waf (true)
│   └── enable_rate_limiting (true)
└── /kanjona/prod/config/
    ├── rate_limit_max (5)
    └── rate_limit_window (60)
```

### CloudTrail

Audit logging for all AWS API calls:

- S3 bucket with versioning
- Log file integrity validation
- 1-year retention

### Runtime

All Lambda functions run on **Node.js 22** (`nodejs22.x`). TypeScript compilation targets ES2023.
CI/CD pipelines also use Node.js 22 for consistency.

## Security Best Practices

### Development

1. **Never commit secrets**
   - Use `.env.example` templates
   - Add secrets to `.gitignore`
   - Use Secrets Manager in production

2. **Code review requirements**
   - All PRs require approval
   - Security-sensitive changes require two approvers
   - Automated security scanning

3. **Dependency management**
   - Regular `npm audit` runs
   - Dependabot enabled
   - Pin versions in production

### Deployment

1. **Infrastructure as Code**
   - All changes via Terraform
   - Plan review before apply
   - State file encryption

2. **Environment isolation**
   - Separate AWS accounts (recommended)
   - Different IAM roles per environment
   - No cross-environment access

3. **Secrets rotation**
   - API keys rotated quarterly
   - Hash salts rotated with versioning
   - Automated rotation where possible

### Operations

1. **Monitoring**
   - CloudWatch alarms for anomalies
   - Failed authentication alerts
   - Rate limit breach notifications

2. **Incident response**
   - Runbooks for common incidents
   - On-call rotation
   - Post-incident reviews

## Compliance

### GDPR

- IP anonymization for EU users
- Right to erasure support
- Data processing agreements
- Privacy-by-design architecture

### SOC 2 (Recommended)

Infrastructure designed for compliance:

- Access logging
- Encryption in transit and at rest
- Change management via IaC
- Regular security reviews

### PCI DSS

**Note**: This platform does NOT process payment card data. If payment processing is added,
additional controls are required.

## Security Checklist

### Pre-Deployment

- [ ] All secrets in Secrets Manager (not hardcoded)
- [ ] Environment variables reviewed
- [ ] IAM permissions are minimal
- [ ] WAF rules configured (production)
- [ ] SSL certificates valid
- [ ] CORS origins configured correctly

### Post-Deployment

- [ ] Security headers verified
- [ ] Rate limiting tested
- [ ] Honeypot functionality verified
- [ ] Spam detection thresholds tuned
- [ ] CloudWatch alarms configured
- [ ] Access logging enabled

### Periodic Review

- [ ] Dependency audit (monthly)
- [ ] Access key rotation (quarterly)
- [ ] Penetration testing (annually)
- [ ] Security policy review (annually)
- [ ] Incident response drill (semi-annually)

---

## Contact

For security-related inquiries:

- Email: security@kanjona.com
- Response time: 24-72 hours

For general questions, please open a GitHub issue.
