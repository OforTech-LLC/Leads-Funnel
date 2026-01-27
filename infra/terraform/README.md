# Kanjona Infrastructure

Terraform infrastructure for the multi-funnel lead generation platform.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CloudFront                               │
│                    (CDN + SSL + Caching)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│          S3             │     │      API Gateway        │
│   (Static Frontend)     │     │      (HTTP API)         │
└─────────────────────────┘     └─────────────────────────┘
                                              │
                              ┌───────────────┼───────────────┐
                              ▼               ▼               ▼
                    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                    │   Lambda     │ │   Lambda     │ │   Lambda     │
                    │ lead-handler │ │health-handler│ │ voice-start  │
                    └──────────────┘ └──────────────┘ └──────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    DynamoDB     │ │   EventBridge   │ │  Secrets Mgr    │
│   (47 Tables)   │ │  (Async Events) │ │   (API Keys)    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Directory Structure

```
terraform/
├── envs/
│   ├── dev/                    # Development environment
│   │   ├── main.tf             # Module composition
│   │   ├── variables.tf        # Variable definitions
│   │   ├── outputs.tf          # Output values
│   │   ├── terraform.tfvars    # Environment values
│   │   ├── backend.tf          # S3 state backend
│   │   └── providers.tf        # Provider configuration
│   │
│   └── prod/                   # Production environment
│       └── (same structure)
│
├── modules/
│   ├── acm/                    # SSL certificates
│   ├── api/                    # Legacy API module
│   ├── api-gateway/            # HTTP API Gateway
│   ├── dns/                    # Route 53 DNS
│   ├── dynamodb/               # DynamoDB tables
│   ├── eventbridge/            # EventBridge bus and rules
│   ├── eventing/               # SNS/SQS eventing
│   ├── lambda/                 # Lambda functions
│   ├── monitoring/             # CloudWatch alarms/dashboards
│   ├── secrets/                # Secrets Manager
│   ├── ses/                    # Email (SES)
│   ├── ssm/                    # SSM Parameter Store
│   ├── static_site/            # S3 + CloudFront
│   └── waf/                    # Web Application Firewall
│
├── shared/
│   └── funnels.tf              # 47 funnel ID definitions
│
└── tests/
    ├── validate_all.sh         # Validation script
    ├── validate_plan.sh        # Plan validation
    ├── test_configs.sh         # Config tests
    ├── unit_tests.sh           # Unit tests
    └── security_checks.sh      # Security validation
```

## Modules

### DynamoDB (`modules/dynamodb`)

- Creates 47 funnel-specific tables
- Rate limits table
- Idempotency table
- Single-table design with GSI

### Lambda (`modules/lambda`)

- `lead-handler`: Main lead processing
- `health-handler`: Health checks
- `voice-start`: Voice call initiation
- `voice-webhook`: Twilio webhooks

### SSM (`modules/ssm`)

- Feature flags
- Runtime configuration
- Funnel configurations

### Secrets (`modules/secrets`)

- Twilio credentials
- ElevenLabs API key
- Webhook signing secret
- IP hash salt

## Usage

### Initialize

```bash
cd envs/dev
terraform init
```

### Plan

```bash
terraform plan -out=tfplan
```

### Apply

```bash
terraform apply tfplan
```

### Destroy

```bash
terraform destroy
```

## Environment Differences

| Feature             | Dev         | Prod    |
| ------------------- | ----------- | ------- |
| WAF                 | Disabled    | Enabled |
| PITR                | Disabled    | Enabled |
| Deletion Protection | Disabled    | Enabled |
| CloudFront Logging  | Disabled    | Enabled |
| X-Ray Tracing       | Disabled    | Enabled |
| Lambda Memory       | 128 MB      | 512 MB  |
| CORS                | + localhost | Strict  |

## Feature Flags

Toggle features via `terraform.tfvars`:

```hcl
# Voice Agent (disabled by default)
enable_voice_agent = false
enable_twilio      = false
enable_elevenlabs  = false

# Security (prod defaults)
enable_waf  = true
enable_pitr = true

# Notifications
enable_email_notifications = true
enable_sms_notifications   = false
```

## Outputs

After apply, key outputs include:

- `site_url`: Frontend URL
- `api_url`: API Gateway URL
- `cloudfront_distribution_id`: For cache invalidation
- `dynamodb_funnel_table_names`: Map of funnel → table
