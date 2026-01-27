# Kanjona - Multi-Funnel Lead Generation Platform

A high-performance, serverless lead generation platform with 47 unique service funnels, AI voice
agent capabilities, and comprehensive infrastructure automation.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [Development](#development)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Service Funnels](#service-funnels)
- [Feature Flags](#feature-flags)
- [Security](#security)
- [Monitoring](#monitoring)
- [Testing](#testing)
- [Cost Estimates](#cost-estimates)
- [Documentation](#documentation)
- [License](#license)

## Overview

Kanjona is a production-ready lead generation platform designed to capture, validate, and route
leads across 47 service verticals. The platform supports bilingual content (English/Spanish),
real-time spam detection, and integrates with AI voice agents for automated follow-up.

### Key Features

- **47 Service Funnels**: Each with unique branding, content, and lead routing
- **Bilingual Support**: Full English and Spanish internationalization
- **Serverless Architecture**: Built on AWS Lambda for unlimited scalability
- **Advanced Security**: Rate limiting, spam detection, honeypot fields, WAF protection
- **Real-time Processing**: EventBridge for async lead processing and notifications
- **Infrastructure as Code**: Terraform modules for reproducible deployments
- **CI/CD Automation**: GitHub Actions for automated testing and deployment

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Next.js 15 (Static Export) → CloudFront → S3                       │   │
│  │  • 47 Service Funnel Pages (EN/ES)                                  │   │
│  │  • Framer Motion Animations                                         │   │
│  │  • Redux State Management                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Swift/Vapor API → API Gateway → Lambda                             │   │
│  │  • Lead Capture with Validation                                     │   │
│  │  • Rate Limiting (5 req/min/IP/funnel)                             │   │
│  │  • Spam Detection + Honeypot                                        │   │
│  │  • Idempotency Support                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Node.js Lambda (TypeScript)                                        │   │
│  │  • Admin API with Cognito Authentication                            │   │
│  │  • GDPR-compliant Data Operations                                   │   │
│  │  • Lead Export and Analytics                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INFRASTRUCTURE                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  DynamoDB    │  │  EventBridge │  │  SSM Params  │  │  Secrets Mgr │   │
│  │  47 Tables   │  │  Async Events│  │  Feature Flags│  │  API Keys    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  CloudWatch  │  │  WAF         │  │  Route 53    │  │  SES         │   │
│  │  Logs/Alarms │  │  Protection  │  │  DNS         │  │  Email       │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer                | Technology                                      |
| -------------------- | ----------------------------------------------- |
| Frontend             | Next.js 15, React 19, TypeScript, Framer Motion |
| State Management     | Redux Toolkit                                   |
| Internationalization | next-intl                                       |
| Backend (Primary)    | Swift 5.10, Vapor Framework                     |
| Backend (Admin)      | Node.js 20, TypeScript                          |
| Database             | DynamoDB (Single-Table Design)                  |
| Events               | EventBridge                                     |
| Infrastructure       | Terraform 1.7+                                  |
| CI/CD                | GitHub Actions                                  |
| CDN                  | CloudFront                                      |
| Security             | WAF, Cognito, Secrets Manager                   |

## Project Structure

```
Leads-Funnel/
├── apps/
│   ├── web/                    # Next.js 15 Frontend
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   ├── components/     # React components
│   │   │   │   ├── animations/ # Framer Motion components
│   │   │   │   └── funnel/     # Funnel page components
│   │   │   ├── config/         # Service configurations
│   │   │   ├── i18n/           # Translations (EN/ES)
│   │   │   ├── lib/            # Utilities and API client
│   │   │   ├── seo/            # SEO utilities
│   │   │   └── store/          # Redux state management
│   │   └── public/             # Static assets
│   │
│   └── api/                    # Node.js Admin API
│       ├── src/
│       │   ├── admin/          # Admin endpoints
│       │   ├── health/         # Health check handlers
│       │   └── lib/            # Shared utilities
│       └── __tests__/          # API tests
│
├── backend/                    # Swift/Vapor Backend
│   ├── Sources/
│   │   ├── LeadCaptureAPI/
│   │   │   ├── Controllers/    # API endpoints
│   │   │   ├── Services/       # Business logic
│   │   │   ├── Middleware/     # Request processing
│   │   │   ├── Models/         # Data models
│   │   │   ├── Configuration/  # App configuration
│   │   │   ├── Errors/         # Error types
│   │   │   └── Utilities/      # Helper functions
│   │   └── Shared/             # Shared types and constants
│   └── Tests/                  # Swift Testing suite
│
├── infra/
│   └── terraform/              # Infrastructure as Code
│       ├── envs/
│       │   ├── dev/            # Development environment
│       │   └── prod/           # Production environment
│       ├── modules/            # Reusable Terraform modules
│       │   ├── acm/            # SSL certificates
│       │   ├── admin/          # Admin infrastructure
│       │   ├── admin-api/      # Admin API Gateway
│       │   ├── admin-cognito/  # Cognito user pools
│       │   ├── api/            # Main API infrastructure
│       │   ├── api-gateway/    # API Gateway configuration
│       │   ├── cloudtrail/     # Audit logging
│       │   ├── dns/            # Route 53 configuration
│       │   ├── dynamodb/       # Database tables
│       │   ├── eventbridge/    # Event bus configuration
│       │   ├── lambda/         # Lambda functions
│       │   ├── monitoring/     # CloudWatch dashboards
│       │   ├── secrets/        # Secrets Manager
│       │   ├── ses/            # Email service
│       │   ├── ssm/            # Parameter Store
│       │   ├── static_site/    # CloudFront + S3
│       │   ├── synthetics/     # Canary monitoring
│       │   ├── vpc/            # Network configuration
│       │   └── waf/            # Web Application Firewall
│       └── shared/             # Shared configurations
│
├── packages/
│   └── shared/                 # Shared TypeScript types
│
├── .github/
│   └── workflows/              # CI/CD pipelines
│
├── SECURITY.md                 # Security documentation
├── CONTRIBUTING.md             # Contribution guidelines
├── CHANGELOG.md                # Release history
└── README.md                   # This file
```

## Quick Start

### Prerequisites

- Node.js 20+
- Swift 5.10+ (for backend development)
- Terraform 1.7+ (for infrastructure)
- AWS CLI configured with appropriate credentials
- GitHub CLI authenticated (for deployments)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/Leads-Funnel.git
cd Leads-Funnel

# Install dependencies
npm install

# Install pre-commit hooks
npm run prepare
```

### Local Development

```bash
# Start frontend (http://localhost:3000)
cd apps/web && npm run dev

# Start Swift backend (http://localhost:8080)
cd backend && swift run

# Run all tests
npm test
```

## Environment Setup

### Frontend Environment

Create `apps/web/.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080

# Analytics (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Feature Flags (optional)
NEXT_PUBLIC_ENABLE_VOICE_AGENT=false
```

### Backend Environment

Create `backend/.env`:

```env
# Environment
ENV=dev

# AWS Configuration
AWS_REGION=us-east-1
DDB_TABLE_NAME=kanjona-leads-dev

# Feature Flags
ENABLE_RATE_LIMITING=true
ENABLE_SPAM_DETECTION=true

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=5
RATE_LIMIT_WINDOW_SECONDS=60
```

### API Environment

Create `apps/api/.env`:

```env
# AWS Configuration
AWS_REGION=us-east-1
ENV=dev
DDB_TABLE_NAME=kanjona-leads-dev
EVENT_BUS_NAME=default

# Rate Limiting
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_MIN=10
IDEMPOTENCY_TTL_HOURS=24

# Security
IP_HASH_SALT=your-secure-salt-here
EMAIL_HASH_SALT=your-email-salt-here
```

## Development

### Available Scripts

| Script                 | Description               |
| ---------------------- | ------------------------- |
| `npm run dev`          | Start frontend dev server |
| `npm run build`        | Build all packages        |
| `npm run lint`         | Run ESLint                |
| `npm run lint:fix`     | Fix linting issues        |
| `npm run type-check`   | TypeScript type checking  |
| `npm run format`       | Format code with Prettier |
| `npm run format:check` | Check code formatting     |
| `npm run test`         | Run all tests             |
| `npm run test:web`     | Run frontend tests        |
| `npm run test:api`     | Run API tests             |
| `npm run tf:fmt`       | Format Terraform files    |

### Code Style

The project uses:

- **ESLint** for JavaScript/TypeScript linting
- **Prettier** for code formatting
- **swift-format** for Swift code
- **Terraform fmt** for infrastructure code

Pre-commit hooks automatically format and lint code before commits.

## Deployment

### Automatic Deployment

Push to `main` triggers automatic deployment to the dev environment via GitHub Actions.

### Manual Deployment

```bash
# Deploy everything to dev
gh workflow run deploy-all.yml -f environment=dev

# Deploy everything to prod
gh workflow run deploy-all.yml -f environment=prod

# Deploy specific components
gh workflow run frontend-deploy.yml -f environment=dev
gh workflow run backend-deploy.yml -f environment=dev
gh workflow run terraform-deploy.yml -f environment=dev -f action=apply
```

### Feature Flag Configuration

Use the GitHub Actions workflow to toggle feature flags:

1. Go to **Actions** > **Configure Features & Secrets**
2. Select environment (dev/prod)
3. Toggle feature flags via dropdown menus
4. Optionally update API keys
5. Choose to commit changes and deploy

## API Reference

### Lead Submission

| Method | Endpoint                 | Description                       |
| ------ | ------------------------ | --------------------------------- |
| `POST` | `/lead`                  | Submit a lead                     |
| `POST` | `/leads`                 | Submit a lead (alias)             |
| `POST` | `/funnel/:funnelId/lead` | Submit a lead for specific funnel |

### Health Checks

| Method | Endpoint        | Description                |
| ------ | --------------- | -------------------------- |
| `GET`  | `/health`       | General health check       |
| `GET`  | `/health/live`  | Kubernetes liveness probe  |
| `GET`  | `/health/ready` | Kubernetes readiness probe |

### Lead Submission Example

```bash
curl -X POST https://api.kanjona.com/lead \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "source": "real-estate",
    "notes": "Interested in buying a home",
    "metadata": {
      "pageUrl": "https://kanjona.com/en/real-estate",
      "referrer": "https://google.com"
    }
  }'
```

### Response Format

**Success (201 Created)**:

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "status": "new",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "requestId": "abc123"
}
```

**Error (400 Bad Request)**:

```json
{
  "success": false,
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

## Service Funnels

The platform supports 47 service verticals across multiple categories:

### Core Services (8)

Real Estate, Life Insurance, Construction, Moving, Dentist, Plastic Surgeon, Roofing, Cleaning

### Home Services (19)

HVAC, Plumbing, Electrician, Pest Control, Landscaping, Pool Service, Home Remodeling, Solar,
Locksmith, Pressure Washing, Water Damage Restoration, Mold Remediation, Flooring, Painting, Windows
& Doors, Fencing, Concrete, Junk Removal, Appliance Repair

### Health & Beauty (7)

Orthodontist, Dermatology, MedSpa, Chiropractic, Physical Therapy, Hair Transplant, Cosmetic
Dentistry

### Professional & Legal (5)

Personal Injury Attorney, Immigration Attorney, Criminal Defense Attorney, Tax & Accounting,
Business Consulting

### Business Services (4)

Commercial Cleaning, Security Systems, IT Services, Marketing Agency

### Auto Services (4)

Auto Repair, Auto Detailing, Towing, Auto Glass

Each funnel is available in English and Spanish at:

- `https://kanjona.com/en/{service-slug}`
- `https://kanjona.com/es/{service-slug}`

## Feature Flags

Feature flags are managed via SSM Parameter Store:

| Flag                         | Description                   | Dev Default | Prod Default |
| ---------------------------- | ----------------------------- | ----------- | ------------ |
| `enable_voice_agent`         | AI voice agent functionality  | `false`     | `false`      |
| `enable_twilio`              | Twilio SMS/Voice integration  | `false`     | `false`      |
| `enable_elevenlabs`          | ElevenLabs AI voice synthesis | `false`     | `false`      |
| `enable_waf`                 | WAF protection                | `false`     | `true`       |
| `enable_email_notifications` | Email notifications           | `true`      | `true`       |
| `enable_sms_notifications`   | SMS notifications             | `false`     | `false`      |
| `enable_rate_limiting`       | Rate limiting                 | `true`      | `true`       |
| `enable_deduplication`       | Lead deduplication            | `true`      | `true`       |
| `enable_debug`               | Debug logging                 | `true`      | `false`      |

## Security

See [SECURITY.md](./SECURITY.md) for comprehensive security documentation.

### Key Security Features

- **Rate Limiting**: 5 requests per minute per IP per funnel
- **Honeypot Fields**: Silent spam detection with fake success responses
- **Spam Detection**: Pattern matching, disposable email detection, gibberish analysis
- **Idempotency**: Prevents duplicate submissions using idempotency keys
- **WAF**: Web Application Firewall with OWASP rules (production)
- **CORS**: Strict origin validation
- **Security Headers**: X-Frame-Options, CSP, HSTS, and more
- **PII Protection**: Sensitive data is hashed before logging
- **GDPR Compliance**: IP anonymization and data retention policies

## Monitoring

### CloudWatch

- **Logs**: All Lambda functions log to CloudWatch Logs
- **Metrics**: Custom metrics for lead creation, rate limiting, spam detection
- **Alarms**: Alerts for error rates, latency, and availability

### Dashboards

- Lead submission metrics
- API latency percentiles
- Error rate tracking
- DynamoDB capacity monitoring

### X-Ray Tracing

Production deployments include AWS X-Ray tracing for distributed request tracking.

## Testing

### Frontend Tests

```bash
cd apps/web
npm run test:run       # Run tests once
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage
```

### API Tests

```bash
cd apps/api
npm run test:run       # Run tests once
npm run test:watch     # Watch mode
```

### Backend Tests

```bash
cd backend
swift test
```

### Infrastructure Validation

```bash
cd infra/terraform
terraform fmt -check -recursive
cd envs/dev && terraform validate
```

## Cost Estimates

| Environment | Monthly Cost |
| ----------- | ------------ |
| Development | ~$5-10       |
| Production  | ~$20-50      |

_Costs vary based on traffic volume and enabled features._

### Cost Optimization

- ARM64 (Graviton) Lambda functions
- DynamoDB on-demand capacity
- CloudFront caching for static assets
- Reserved capacity for predictable workloads (optional)

## Documentation

| Document                                   | Description                     |
| ------------------------------------------ | ------------------------------- |
| [README.md](./README.md)                   | This file - project overview    |
| [SECURITY.md](./SECURITY.md)               | Security features and practices |
| [CONTRIBUTING.md](./CONTRIBUTING.md)       | Contribution guidelines         |
| [CHANGELOG.md](./CHANGELOG.md)             | Release history                 |
| [apps/web/README.md](./apps/web/README.md) | Frontend documentation          |
| [apps/api/README.md](./apps/api/README.md) | Admin API documentation         |

## License

Proprietary - All rights reserved.

---

For questions or support, please open an issue in the repository.
