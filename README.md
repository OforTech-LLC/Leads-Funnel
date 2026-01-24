# Kanjona Funnel

A production-grade lead generation funnel monorepo for kanjona.com.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Route 53                                 │
│         kanjona.com → CloudFront                                │
│         api.kanjona.com → API Gateway                           │
└─────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           ▼                                     ▼
┌─────────────────────┐              ┌─────────────────────┐
│     CloudFront      │              │   API Gateway       │
│   + WAF (prod)      │              │   HTTP API          │
│   + Security Headers│              │   POST /lead        │
└─────────────────────┘              └─────────────────────┘
           │                                     │
           ▼                                     ▼
┌─────────────────────┐              ┌─────────────────────┐
│    S3 Bucket        │              │   Lambda Function   │
│    (Private + OAC)  │              │   lead-capture      │
│    Landing Page     │              └─────────────────────┘
└─────────────────────┘                    │         │
                                           ▼         ▼
                              ┌────────────────┐  ┌────────────────┐
                              │   DynamoDB     │  │  EventBridge   │
                              │   Single Table │  │  lead.created  │
                              └────────────────┘  └────────────────┘
                                                          │
                                                          ▼
                                                 ┌────────────────┐
                                                 │   SQS Queue    │
                                                 │   + DLQ        │
                                                 └────────────────┘
```

## Repository Structure

```
kanjona-funnel/
├── apps/
│   ├── web/           # Frontend landing page (Next.js, static export)
│   │   ├── src/
│   │   └── public/
│   └── api/           # Backend API (Lambda code)
│       └── src/
│
├── backend/           # Swift/Vapor API (standalone)
│   ├── Sources/
│   └── Tests/
│
├── infra/
│   └── terraform/     # Infrastructure as Code
│       ├── modules/   # Reusable Terraform modules
│       └── envs/      # Environment configurations
│           ├── dev/
│           └── prod/
│
├── packages/
│   └── shared/        # Shared TypeScript types (@kanjona/shared)
│       └── src/
│
├── scripts/           # Deployment and utility scripts
├── docs/              # Project documentation
└── .github/
    └── workflows/     # CI/CD pipelines
```

This is an **npm workspaces monorepo**. The frontend apps and shared packages are managed together.

## Quick Start

### Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform >= 1.5.0
- Node.js >= 18.0.0 (for frontend)
- npm >= 9.0.0
- Swift >= 5.9 (for backend, optional)
- Domain registered and ready to configure

### Install Dependencies

```bash
# Install all npm workspace dependencies
npm install
```

### Development

```bash
# Run web app in development mode
npm run dev

# Build shared types package
npm run build --workspace=@kanjona/shared
```

### Build for Production

```bash
# Build static export for S3 + CloudFront
npm run build
```

The static files will be generated in `apps/web/out/`.

### 1. Bootstrap Infrastructure

```bash
# Create Terraform state backend
./scripts/bootstrap-state.sh

# Deploy dev environment
cd infra/terraform/envs/dev
terraform init
terraform plan
terraform apply
```

### 2. Configure Domain

After deployment, update your domain registrar with the Route 53 nameservers:

```bash
terraform output route53_nameservers
```

### 3. Upload Site Content

```bash
# Build your site
cd apps/web && npm run build

# Upload to S3
./scripts/upload-site.sh dev ./apps/web/dist
```

### 4. Test the API

```bash
curl -X POST https://api.kanjona.com/lead \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com"}'
```

## Environments

| Environment | Domain | Features |
|-------------|--------|----------|
| Dev | kanjona.com | Minimal (cost-optimized) |
| Prod | kanjona.com | Full (WAF, logging, alarms) |

## Key Features

- **Static Site Hosting**: CloudFront + S3 with OAC (no public bucket access)
- **Lead Capture API**: API Gateway + Lambda with DynamoDB storage
- **Async Processing**: EventBridge + SQS for background jobs
- **Security**: WAF, HTTPS, security headers, least-privilege IAM
- **Observability**: CloudWatch alarms, dashboards, X-Ray tracing
- **Cost-Aware**: Feature flags to disable expensive components in dev

## Documentation

- [Infrastructure Guide](./infra/terraform/README.md)
- [Web App Guide](./apps/web/README.md)
- [API Guide](./apps/api/README.md)

## Cost Estimates

- **Dev**: ~$1-5/month (minimal features)
- **Prod**: ~$20-50/month (full features, depends on traffic)

## Scripts

| Script | Description |
|--------|-------------|
| `scripts/bootstrap-state.sh` | Create Terraform state backend |
| `scripts/deploy.sh <env>` | Deploy infrastructure |
| `scripts/upload-site.sh <env> <dir>` | Upload site to S3 |

## License

Private - All rights reserved
