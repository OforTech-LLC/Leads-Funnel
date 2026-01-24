# Terraform Infrastructure - Kanjona Funnel

Production-grade Terraform infrastructure for the Kanjona lead generation funnel.

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

## Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform >= 1.5.0
- Domain registered (update registrar nameservers after first deploy)

## Quick Start

### 1. Bootstrap State Backend

```bash
# Create S3 bucket and DynamoDB table for state
./scripts/bootstrap-state.sh
```

### 2. Deploy Dev Environment

```bash
cd infra/terraform/envs/dev

# Initialize Terraform
terraform init

# Review changes
terraform plan

# Apply changes
terraform apply
```

### 3. Configure Domain

After the first deployment, update your domain registrar's nameservers:

```bash
# Get nameservers from Terraform output
terraform output route53_nameservers
```

Point your domain to these nameservers. DNS propagation takes 10-30 minutes.

### 4. Upload Site Content

```bash
# Build your site first
cd apps/web && npm run build

# Upload to S3 and invalidate CloudFront
./scripts/upload-site.sh dev ./apps/web/dist
```

### 5. Deploy Production (when ready)

```bash
cd infra/terraform/envs/prod

# Update terraform.tfvars with production values
terraform init
terraform plan
terraform apply
```

## Repository Structure

```
infra/terraform/
├── modules/
│   ├── dns/           # Route 53 hosted zone and records
│   ├── acm/           # SSL/TLS certificates
│   ├── static_site/   # S3 + CloudFront with OAC
│   ├── waf/           # Web Application Firewall
│   ├── api/           # API Gateway + Lambda
│   ├── dynamodb/      # DynamoDB single-table
│   ├── eventing/      # EventBridge + SQS
│   ├── ses/           # Email notifications
│   └── monitoring/    # CloudWatch alarms + dashboard
│
├── envs/
│   ├── dev/           # Development environment
│   └── prod/          # Production environment
│
├── .terraform-version
├── .pre-commit-config.yaml
└── README.md
```

## Feature Flags

| Flag | Dev Default | Prod Default | Description |
|------|-------------|--------------|-------------|
| `enable_waf` | false | true | WAF protection for CloudFront |
| `enable_cloudfront_logging` | false | true | Access logs to S3 |
| `enable_api_logging` | false | true | API Gateway access logs |
| `enable_sqs` | false | true | SQS queue for async processing |
| `enable_ses` | false | false | SES email notifications |
| `enable_xray` | false | true | X-Ray tracing for Lambda |
| `enable_alarms` | false | true | CloudWatch alarms |
| `enable_pitr` | false | true | DynamoDB point-in-time recovery |

## Cost Estimates

### Dev Environment (minimal)
- Route 53 hosted zone: $0.50/month
- Lambda: Free tier (1M requests)
- DynamoDB: Free tier (25GB, 25 WCU/RCU)
- CloudFront: ~$0-5/month depending on traffic
- **Total: ~$1-5/month**

### Prod Environment (full features)
- Route 53: $0.50/month
- Lambda: ~$1-5/month
- DynamoDB: ~$1-5/month (on-demand)
- CloudFront: ~$5-10/month
- WAF: ~$5-10/month
- CloudWatch: ~$1-5/month
- **Total: ~$20-50/month**

## Security Features

- All S3 buckets are private (no public access)
- CloudFront uses OAC (Origin Access Control)
- WAF protects against common attacks (prod)
- HTTPS enforced everywhere (TLS 1.2+)
- Lambda has least-privilege IAM
- Security headers on all responses
