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

### Core Services (8)

| Service | English | Spanish |
|---------|---------|---------|
| Real Estate | [kanjona.com/en/real-estate](https://kanjona.com/en/real-estate) | [kanjona.com/es/real-estate](https://kanjona.com/es/real-estate) |
| Life Insurance | [kanjona.com/en/life-insurance](https://kanjona.com/en/life-insurance) | [kanjona.com/es/life-insurance](https://kanjona.com/es/life-insurance) |
| Construction | [kanjona.com/en/construction](https://kanjona.com/en/construction) | [kanjona.com/es/construction](https://kanjona.com/es/construction) |
| Moving | [kanjona.com/en/moving](https://kanjona.com/en/moving) | [kanjona.com/es/moving](https://kanjona.com/es/moving) |
| Dentist | [kanjona.com/en/dentist](https://kanjona.com/en/dentist) | [kanjona.com/es/dentist](https://kanjona.com/es/dentist) |
| Plastic Surgeon | [kanjona.com/en/plastic-surgeon](https://kanjona.com/en/plastic-surgeon) | [kanjona.com/es/plastic-surgeon](https://kanjona.com/es/plastic-surgeon) |
| Roofing | [kanjona.com/en/roofing](https://kanjona.com/en/roofing) | [kanjona.com/es/roofing](https://kanjona.com/es/roofing) |
| Cleaning | [kanjona.com/en/cleaning](https://kanjona.com/en/cleaning) | [kanjona.com/es/cleaning](https://kanjona.com/es/cleaning) |

### Home Services (19)

| Service | English | Spanish |
|---------|---------|---------|
| HVAC | [kanjona.com/en/hvac](https://kanjona.com/en/hvac) | [kanjona.com/es/hvac](https://kanjona.com/es/hvac) |
| Plumbing | [kanjona.com/en/plumbing](https://kanjona.com/en/plumbing) | [kanjona.com/es/plumbing](https://kanjona.com/es/plumbing) |
| Electrician | [kanjona.com/en/electrician](https://kanjona.com/en/electrician) | [kanjona.com/es/electrician](https://kanjona.com/es/electrician) |
| Pest Control | [kanjona.com/en/pest-control](https://kanjona.com/en/pest-control) | [kanjona.com/es/pest-control](https://kanjona.com/es/pest-control) |
| Landscaping | [kanjona.com/en/landscaping](https://kanjona.com/en/landscaping) | [kanjona.com/es/landscaping](https://kanjona.com/es/landscaping) |
| Pool Service | [kanjona.com/en/pool-service](https://kanjona.com/en/pool-service) | [kanjona.com/es/pool-service](https://kanjona.com/es/pool-service) |
| Home Remodeling | [kanjona.com/en/home-remodeling](https://kanjona.com/en/home-remodeling) | [kanjona.com/es/home-remodeling](https://kanjona.com/es/home-remodeling) |
| Solar | [kanjona.com/en/solar](https://kanjona.com/en/solar) | [kanjona.com/es/solar](https://kanjona.com/es/solar) |
| Locksmith | [kanjona.com/en/locksmith](https://kanjona.com/en/locksmith) | [kanjona.com/es/locksmith](https://kanjona.com/es/locksmith) |
| Pressure Washing | [kanjona.com/en/pressure-washing](https://kanjona.com/en/pressure-washing) | [kanjona.com/es/pressure-washing](https://kanjona.com/es/pressure-washing) |
| Water Damage Restoration | [kanjona.com/en/water-damage-restoration](https://kanjona.com/en/water-damage-restoration) | [kanjona.com/es/water-damage-restoration](https://kanjona.com/es/water-damage-restoration) |
| Mold Remediation | [kanjona.com/en/mold-remediation](https://kanjona.com/en/mold-remediation) | [kanjona.com/es/mold-remediation](https://kanjona.com/es/mold-remediation) |
| Flooring | [kanjona.com/en/flooring](https://kanjona.com/en/flooring) | [kanjona.com/es/flooring](https://kanjona.com/es/flooring) |
| Painting | [kanjona.com/en/painting](https://kanjona.com/en/painting) | [kanjona.com/es/painting](https://kanjona.com/es/painting) |
| Windows & Doors | [kanjona.com/en/windows-doors](https://kanjona.com/en/windows-doors) | [kanjona.com/es/windows-doors](https://kanjona.com/es/windows-doors) |
| Fencing | [kanjona.com/en/fencing](https://kanjona.com/en/fencing) | [kanjona.com/es/fencing](https://kanjona.com/es/fencing) |
| Concrete | [kanjona.com/en/concrete](https://kanjona.com/en/concrete) | [kanjona.com/es/concrete](https://kanjona.com/es/concrete) |
| Junk Removal | [kanjona.com/en/junk-removal](https://kanjona.com/en/junk-removal) | [kanjona.com/es/junk-removal](https://kanjona.com/es/junk-removal) |
| Appliance Repair | [kanjona.com/en/appliance-repair](https://kanjona.com/en/appliance-repair) | [kanjona.com/es/appliance-repair](https://kanjona.com/es/appliance-repair) |

### Health & Beauty (7)

| Service | English | Spanish |
|---------|---------|---------|
| Orthodontist | [kanjona.com/en/orthodontist](https://kanjona.com/en/orthodontist) | [kanjona.com/es/orthodontist](https://kanjona.com/es/orthodontist) |
| Dermatology | [kanjona.com/en/dermatology](https://kanjona.com/en/dermatology) | [kanjona.com/es/dermatology](https://kanjona.com/es/dermatology) |
| MedSpa | [kanjona.com/en/medspa](https://kanjona.com/en/medspa) | [kanjona.com/es/medspa](https://kanjona.com/es/medspa) |
| Chiropractic | [kanjona.com/en/chiropractic](https://kanjona.com/en/chiropractic) | [kanjona.com/es/chiropractic](https://kanjona.com/es/chiropractic) |
| Physical Therapy | [kanjona.com/en/physical-therapy](https://kanjona.com/en/physical-therapy) | [kanjona.com/es/physical-therapy](https://kanjona.com/es/physical-therapy) |
| Hair Transplant | [kanjona.com/en/hair-transplant](https://kanjona.com/en/hair-transplant) | [kanjona.com/es/hair-transplant](https://kanjona.com/es/hair-transplant) |
| Cosmetic Dentistry | [kanjona.com/en/cosmetic-dentistry](https://kanjona.com/en/cosmetic-dentistry) | [kanjona.com/es/cosmetic-dentistry](https://kanjona.com/es/cosmetic-dentistry) |

### Professional & Legal (5)

| Service | English | Spanish |
|---------|---------|---------|
| Personal Injury Attorney | [kanjona.com/en/personal-injury-attorney](https://kanjona.com/en/personal-injury-attorney) | [kanjona.com/es/personal-injury-attorney](https://kanjona.com/es/personal-injury-attorney) |
| Immigration Attorney | [kanjona.com/en/immigration-attorney](https://kanjona.com/en/immigration-attorney) | [kanjona.com/es/immigration-attorney](https://kanjona.com/es/immigration-attorney) |
| Criminal Defense Attorney | [kanjona.com/en/criminal-defense-attorney](https://kanjona.com/en/criminal-defense-attorney) | [kanjona.com/es/criminal-defense-attorney](https://kanjona.com/es/criminal-defense-attorney) |
| Tax & Accounting | [kanjona.com/en/tax-accounting](https://kanjona.com/en/tax-accounting) | [kanjona.com/es/tax-accounting](https://kanjona.com/es/tax-accounting) |
| Business Consulting | [kanjona.com/en/business-consulting](https://kanjona.com/en/business-consulting) | [kanjona.com/es/business-consulting](https://kanjona.com/es/business-consulting) |

### Business Services (4)

| Service | English | Spanish |
|---------|---------|---------|
| Commercial Cleaning | [kanjona.com/en/commercial-cleaning](https://kanjona.com/en/commercial-cleaning) | [kanjona.com/es/commercial-cleaning](https://kanjona.com/es/commercial-cleaning) |
| Security Systems | [kanjona.com/en/security-systems](https://kanjona.com/en/security-systems) | [kanjona.com/es/security-systems](https://kanjona.com/es/security-systems) |
| IT Services | [kanjona.com/en/it-services](https://kanjona.com/en/it-services) | [kanjona.com/es/it-services](https://kanjona.com/es/it-services) |
| Marketing Agency | [kanjona.com/en/marketing-agency](https://kanjona.com/en/marketing-agency) | [kanjona.com/es/marketing-agency](https://kanjona.com/es/marketing-agency) |

### Auto Services (4)

| Service | English | Spanish |
|---------|---------|---------|
| Auto Repair | [kanjona.com/en/auto-repair](https://kanjona.com/en/auto-repair) | [kanjona.com/es/auto-repair](https://kanjona.com/es/auto-repair) |
| Auto Detailing | [kanjona.com/en/auto-detailing](https://kanjona.com/en/auto-detailing) | [kanjona.com/es/auto-detailing](https://kanjona.com/es/auto-detailing) |
| Towing | [kanjona.com/en/towing](https://kanjona.com/en/towing) | [kanjona.com/es/towing](https://kanjona.com/es/towing) |
| Auto Glass | [kanjona.com/en/auto-glass](https://kanjona.com/en/auto-glass) | [kanjona.com/es/auto-glass](https://kanjona.com/es/auto-glass) |

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
