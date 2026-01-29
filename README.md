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

Each funnel is available in English and Spanish in both environments. Source of truth for slugs:
`infra/terraform/shared/funnels.tf` (`funnel_ids`).

### Funnel URLs (Dev + Prod)

| Funnel Slug                 | Dev (EN)                                             | Dev (ES)                                             | Prod (EN)                                        | Prod (ES)                                        |
| --------------------------- | ---------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| `real-estate`               | https://dev.kanjona.com/en/real-estate               | https://dev.kanjona.com/es/real-estate               | https://kanjona.com/en/real-estate               | https://kanjona.com/es/real-estate               |
| `roofing`                   | https://dev.kanjona.com/en/roofing                   | https://dev.kanjona.com/es/roofing                   | https://kanjona.com/en/roofing                   | https://kanjona.com/es/roofing                   |
| `cleaning`                  | https://dev.kanjona.com/en/cleaning                  | https://dev.kanjona.com/es/cleaning                  | https://kanjona.com/en/cleaning                  | https://kanjona.com/es/cleaning                  |
| `hvac`                      | https://dev.kanjona.com/en/hvac                      | https://dev.kanjona.com/es/hvac                      | https://kanjona.com/en/hvac                      | https://kanjona.com/es/hvac                      |
| `plumbing`                  | https://dev.kanjona.com/en/plumbing                  | https://dev.kanjona.com/es/plumbing                  | https://kanjona.com/en/plumbing                  | https://kanjona.com/es/plumbing                  |
| `electrician`               | https://dev.kanjona.com/en/electrician               | https://dev.kanjona.com/es/electrician               | https://kanjona.com/en/electrician               | https://kanjona.com/es/electrician               |
| `pest-control`              | https://dev.kanjona.com/en/pest-control              | https://dev.kanjona.com/es/pest-control              | https://kanjona.com/en/pest-control              | https://kanjona.com/es/pest-control              |
| `landscaping`               | https://dev.kanjona.com/en/landscaping               | https://dev.kanjona.com/es/landscaping               | https://kanjona.com/en/landscaping               | https://kanjona.com/es/landscaping               |
| `pool-service`              | https://dev.kanjona.com/en/pool-service              | https://dev.kanjona.com/es/pool-service              | https://kanjona.com/en/pool-service              | https://kanjona.com/es/pool-service              |
| `home-remodeling`           | https://dev.kanjona.com/en/home-remodeling           | https://dev.kanjona.com/es/home-remodeling           | https://kanjona.com/en/home-remodeling           | https://kanjona.com/es/home-remodeling           |
| `solar`                     | https://dev.kanjona.com/en/solar                     | https://dev.kanjona.com/es/solar                     | https://kanjona.com/en/solar                     | https://kanjona.com/es/solar                     |
| `pressure-washing`          | https://dev.kanjona.com/en/pressure-washing          | https://dev.kanjona.com/es/pressure-washing          | https://kanjona.com/en/pressure-washing          | https://kanjona.com/es/pressure-washing          |
| `locksmith`                 | https://dev.kanjona.com/en/locksmith                 | https://dev.kanjona.com/es/locksmith                 | https://kanjona.com/en/locksmith                 | https://kanjona.com/es/locksmith                 |
| `water-damage-restoration`  | https://dev.kanjona.com/en/water-damage-restoration  | https://dev.kanjona.com/es/water-damage-restoration  | https://kanjona.com/en/water-damage-restoration  | https://kanjona.com/es/water-damage-restoration  |
| `mold-remediation`          | https://dev.kanjona.com/en/mold-remediation          | https://dev.kanjona.com/es/mold-remediation          | https://kanjona.com/en/mold-remediation          | https://kanjona.com/es/mold-remediation          |
| `flooring`                  | https://dev.kanjona.com/en/flooring                  | https://dev.kanjona.com/es/flooring                  | https://kanjona.com/en/flooring                  | https://kanjona.com/es/flooring                  |
| `painting`                  | https://dev.kanjona.com/en/painting                  | https://dev.kanjona.com/es/painting                  | https://kanjona.com/en/painting                  | https://kanjona.com/es/painting                  |
| `windows-doors`             | https://dev.kanjona.com/en/windows-doors             | https://dev.kanjona.com/es/windows-doors             | https://kanjona.com/en/windows-doors             | https://kanjona.com/es/windows-doors             |
| `fencing`                   | https://dev.kanjona.com/en/fencing                   | https://dev.kanjona.com/es/fencing                   | https://kanjona.com/en/fencing                   | https://kanjona.com/es/fencing                   |
| `concrete`                  | https://dev.kanjona.com/en/concrete                  | https://dev.kanjona.com/es/concrete                  | https://kanjona.com/en/concrete                  | https://kanjona.com/es/concrete                  |
| `moving`                    | https://dev.kanjona.com/en/moving                    | https://dev.kanjona.com/es/moving                    | https://kanjona.com/en/moving                    | https://kanjona.com/es/moving                    |
| `junk-removal`              | https://dev.kanjona.com/en/junk-removal              | https://dev.kanjona.com/es/junk-removal              | https://kanjona.com/en/junk-removal              | https://kanjona.com/es/junk-removal              |
| `appliance-repair`          | https://dev.kanjona.com/en/appliance-repair          | https://dev.kanjona.com/es/appliance-repair          | https://kanjona.com/en/appliance-repair          | https://kanjona.com/es/appliance-repair          |
| `dentist`                   | https://dev.kanjona.com/en/dentist                   | https://dev.kanjona.com/es/dentist                   | https://kanjona.com/en/dentist                   | https://kanjona.com/es/dentist                   |
| `plastic-surgeon`           | https://dev.kanjona.com/en/plastic-surgeon           | https://dev.kanjona.com/es/plastic-surgeon           | https://kanjona.com/en/plastic-surgeon           | https://kanjona.com/es/plastic-surgeon           |
| `orthodontist`              | https://dev.kanjona.com/en/orthodontist              | https://dev.kanjona.com/es/orthodontist              | https://kanjona.com/en/orthodontist              | https://kanjona.com/es/orthodontist              |
| `dermatology`               | https://dev.kanjona.com/en/dermatology               | https://dev.kanjona.com/es/dermatology               | https://kanjona.com/en/dermatology               | https://kanjona.com/es/dermatology               |
| `medspa`                    | https://dev.kanjona.com/en/medspa                    | https://dev.kanjona.com/es/medspa                    | https://kanjona.com/en/medspa                    | https://kanjona.com/es/medspa                    |
| `chiropractic`              | https://dev.kanjona.com/en/chiropractic              | https://dev.kanjona.com/es/chiropractic              | https://kanjona.com/en/chiropractic              | https://kanjona.com/es/chiropractic              |
| `physical-therapy`          | https://dev.kanjona.com/en/physical-therapy          | https://dev.kanjona.com/es/physical-therapy          | https://kanjona.com/en/physical-therapy          | https://kanjona.com/es/physical-therapy          |
| `hair-transplant`           | https://dev.kanjona.com/en/hair-transplant           | https://dev.kanjona.com/es/hair-transplant           | https://kanjona.com/en/hair-transplant           | https://kanjona.com/es/hair-transplant           |
| `cosmetic-dentistry`        | https://dev.kanjona.com/en/cosmetic-dentistry        | https://dev.kanjona.com/es/cosmetic-dentistry        | https://kanjona.com/en/cosmetic-dentistry        | https://kanjona.com/es/cosmetic-dentistry        |
| `personal-injury-attorney`  | https://dev.kanjona.com/en/personal-injury-attorney  | https://dev.kanjona.com/es/personal-injury-attorney  | https://kanjona.com/en/personal-injury-attorney  | https://kanjona.com/es/personal-injury-attorney  |
| `immigration-attorney`      | https://dev.kanjona.com/en/immigration-attorney      | https://dev.kanjona.com/es/immigration-attorney      | https://kanjona.com/en/immigration-attorney      | https://kanjona.com/es/immigration-attorney      |
| `criminal-defense-attorney` | https://dev.kanjona.com/en/criminal-defense-attorney | https://dev.kanjona.com/es/criminal-defense-attorney | https://kanjona.com/en/criminal-defense-attorney | https://kanjona.com/es/criminal-defense-attorney |
| `tax-accounting`            | https://dev.kanjona.com/en/tax-accounting            | https://dev.kanjona.com/es/tax-accounting            | https://kanjona.com/en/tax-accounting            | https://kanjona.com/es/tax-accounting            |
| `business-consulting`       | https://dev.kanjona.com/en/business-consulting       | https://dev.kanjona.com/es/business-consulting       | https://kanjona.com/en/business-consulting       | https://kanjona.com/es/business-consulting       |
| `life-insurance`            | https://dev.kanjona.com/en/life-insurance            | https://dev.kanjona.com/es/life-insurance            | https://kanjona.com/en/life-insurance            | https://kanjona.com/es/life-insurance            |
| `commercial-cleaning`       | https://dev.kanjona.com/en/commercial-cleaning       | https://dev.kanjona.com/es/commercial-cleaning       | https://kanjona.com/en/commercial-cleaning       | https://kanjona.com/es/commercial-cleaning       |
| `security-systems`          | https://dev.kanjona.com/en/security-systems          | https://dev.kanjona.com/es/security-systems          | https://kanjona.com/en/security-systems          | https://kanjona.com/es/security-systems          |
| `it-services`               | https://dev.kanjona.com/en/it-services               | https://dev.kanjona.com/es/it-services               | https://kanjona.com/en/it-services               | https://kanjona.com/es/it-services               |
| `marketing-agency`          | https://dev.kanjona.com/en/marketing-agency          | https://dev.kanjona.com/es/marketing-agency          | https://kanjona.com/en/marketing-agency          | https://kanjona.com/es/marketing-agency          |
| `auto-repair`               | https://dev.kanjona.com/en/auto-repair               | https://dev.kanjona.com/es/auto-repair               | https://kanjona.com/en/auto-repair               | https://kanjona.com/es/auto-repair               |
| `auto-detailing`            | https://dev.kanjona.com/en/auto-detailing            | https://dev.kanjona.com/es/auto-detailing            | https://kanjona.com/en/auto-detailing            | https://kanjona.com/es/auto-detailing            |
| `towing`                    | https://dev.kanjona.com/en/towing                    | https://dev.kanjona.com/es/towing                    | https://kanjona.com/en/towing                    | https://kanjona.com/es/towing                    |
| `auto-glass`                | https://dev.kanjona.com/en/auto-glass                | https://dev.kanjona.com/es/auto-glass                | https://kanjona.com/en/auto-glass                | https://kanjona.com/es/auto-glass                |
| `construction`              | https://dev.kanjona.com/en/construction              | https://dev.kanjona.com/es/construction              | https://kanjona.com/en/construction              | https://kanjona.com/es/construction              |

## Feature Flags

Feature flags are managed via SSM Parameter Store. The full, authoritative flag map and defaults
live in `docs/PRODUCT_ENGINEERING_SPEC.md`.

### Auto-Assignment Logic (Lead Routing)

Auto-assignment is handled by the assignment-worker Lambda and is gated by
`enable_assignment_service` (and the `enable_auto_assignment` flag for feature rollout). The
worker consumes `lead.created` events from SQS and performs the following steps:

1. Load the lead from DynamoDB and skip if the lead is no longer in `new` status.
2. Load assignment rules (DynamoDB first, SSM fallback) and filter to active rules that match the
   funnel (`funnelId` or `*`).
3. Choose the best rule via ZIP longest-prefix matching, then sort by priority and fall back
   through remaining rules if needed.
4. For each candidate rule:
   - Verify the target org/user is active and (if a user) is a member of the org.
   - Enforce daily/monthly caps using atomic counters.
   - Assign the lead with a conditional update (`status == "new"`) for idempotency.
5. Emit `lead.assigned` on success, or mark the lead unassigned and emit `lead.unassigned` with a
   reason if all rules are exhausted.

Rules are created and managed in the admin app, and are cached in-memory for 60 seconds by the
worker to reduce DynamoDB/SSM calls.

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
