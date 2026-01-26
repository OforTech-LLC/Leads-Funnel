# Kanjona - Multi-Funnel Lead Generation Platform

A high-performance, serverless lead generation platform with 47 unique service funnels, AI voice agent capabilities, and comprehensive infrastructure automation.

## Architecture Overview

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
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INFRASTRUCTURE                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  DynamoDB    │  │  EventBridge │  │  SSM Params  │  │  Secrets Mgr │   │
│  │  47 Tables   │  │  Async Events│  │  Feature Flags│  │  API Keys    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
Leads-Funnel/
├── apps/
│   └── web/                    # Next.js 15 Frontend
│       ├── src/
│       │   ├── app/            # App Router pages
│       │   ├── components/     # React components
│       │   │   ├── animations/ # Framer Motion components
│       │   │   └── funnel/     # Funnel page components
│       │   ├── config/         # Service configurations
│       │   ├── i18n/           # Translations (EN/ES)
│       │   ├── lib/            # Utilities and API client
│       │   └── store/          # Redux state management
│       └── public/             # Static assets
│
├── backend/                    # Swift/Vapor Backend
│   ├── Sources/
│   │   ├── LeadCaptureAPI/
│   │   │   ├── Controllers/    # API endpoints
│   │   │   ├── Services/       # Business logic
│   │   │   ├── Middleware/     # Request processing
│   │   │   └── Models/         # Data models
│   │   └── Shared/             # Shared types and constants
│   └── Tests/                  # Swift Testing suite
│
├── infra/
│   └── terraform/              # Infrastructure as Code
│       ├── envs/
│       │   ├── dev/            # Development environment
│       │   └── prod/           # Production environment
│       ├── modules/            # Reusable Terraform modules
│       └── shared/             # Shared configurations
│
├── packages/
│   └── shared/                 # Shared TypeScript types
│
└── .github/
    └── workflows/              # CI/CD pipelines
```

## The 47 Service Funnels

| Category | Services |
|----------|----------|
| **Real Estate** | Real Estate |
| **Insurance** | Life Insurance |
| **Home Services** | Construction, Moving, Roofing, Cleaning, HVAC, Plumbing, Electrician, Pest Control, Landscaping, Pool Service, Home Remodeling, Solar, Locksmith, Pressure Washing, Water Damage Restoration, Mold Remediation, Flooring, Painting, Windows & Doors, Fencing, Concrete, Junk Removal, Appliance Repair |
| **Healthcare** | Dentist, Plastic Surgeon, Orthodontist, Dermatology, MedSpa, Chiropractic, Physical Therapy, Hair Transplant, Cosmetic Dentistry |
| **Legal** | Personal Injury Attorney, Immigration Attorney, Criminal Defense Attorney |
| **Business** | Tax & Accounting, Business Consulting, Commercial Cleaning, Security Systems, IT Services, Marketing Agency |
| **Automotive** | Auto Repair, Auto Detailing, Towing, Auto Glass |

## Quick Start

### Prerequisites

- Node.js 20+
- Swift 5.10+
- Terraform 1.7+
- AWS CLI configured
- GitHub CLI authenticated

### Local Development

```bash
# Install dependencies
npm install

# Start frontend (http://localhost:3000)
cd apps/web && npm run dev

# Start backend (http://localhost:8080)
cd backend && swift run
```

### Environment Setup

```bash
# Copy environment templates
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
cp backend/.env.example backend/.env

# Update with your credentials
```

## Deployment

### Automatic (GitHub Actions)

Push to `main` triggers automatic deployment to dev environment.

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

Use the `Configure Features & Secrets` workflow to toggle features:

1. Go to Actions → Configure Features & Secrets
2. Select environment (dev/prod)
3. Toggle feature flags via dropdown menus
4. Optionally update API keys
5. Choose to commit changes and deploy

## Feature Flags

| Flag | Description | Default |
|------|-------------|---------|
| `enable_voice_agent` | AI voice agent functionality | `false` |
| `enable_twilio` | Twilio SMS/Voice integration | `false` |
| `enable_elevenlabs` | ElevenLabs AI voice synthesis | `false` |
| `enable_waf` | WAF protection | `false` (dev) / `true` (prod) |
| `enable_email_notifications` | Email notifications | `true` |
| `enable_sms_notifications` | SMS notifications | `false` |
| `enable_rate_limiting` | Rate limiting | `true` |
| `enable_deduplication` | Lead deduplication | `true` |
| `enable_debug` | Debug logging | `true` (dev) / `false` (prod) |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/lead` | Submit a lead |
| `POST` | `/funnel/:funnelId/lead` | Submit a lead for specific funnel |
| `GET` | `/health` | Health check |
| `GET` | `/health/live` | Kubernetes liveness probe |
| `GET` | `/health/ready` | Kubernetes readiness probe |

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
    "notes": "Interested in buying a home"
  }'
```

## Security Features

- **Rate Limiting**: 5 requests per minute per IP per funnel
- **Honeypot Fields**: Silent spam detection
- **Spam Detection**: Pattern matching, disposable email detection
- **Idempotency**: Prevents duplicate submissions
- **WAF**: Web Application Firewall (production)
- **CORS**: Strict origin validation
- **PII Protection**: No sensitive data in logs

## Testing

```bash
# Frontend tests
cd apps/web && npm test

# Backend tests
cd backend && swift test

# Terraform validation
cd infra/terraform && terraform fmt -check -recursive
cd infra/terraform/envs/dev && terraform validate
```

## Monitoring

- CloudWatch Logs for Lambda functions
- CloudWatch Alarms for error rates
- X-Ray tracing (production)
- CloudFront access logs (production)

## Cost Estimates

| Environment | Monthly Cost |
|-------------|--------------|
| Development | ~$5-10 |
| Production | ~$20-50 |

*Costs vary based on traffic and enabled features.*

## License

Proprietary - All rights reserved.
