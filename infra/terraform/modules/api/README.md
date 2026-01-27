# API Module

Creates API Gateway HTTP API and Lambda function for lead capture.

## Resources Created

- API Gateway HTTP API (v2)
- API Gateway Stage with auto-deploy
- API Gateway Custom Domain
- Lambda function (Python 3.12, ARM64)
- Lambda IAM role with least-privilege permissions
- CloudWatch Log Groups for Lambda and API Gateway

## Features

### API Gateway

- HTTP API (cheaper than REST API)
- CORS configured for specified origins
- Throttling (configurable rate and burst limits)
- Optional access logging with JSON format

### Lambda

- Python 3.12 runtime
- ARM64 architecture (Graviton - cheaper)
- Configurable memory and reserved concurrency
- Optional X-Ray tracing
- Environment variables for DynamoDB and EventBridge integration

### Security

- IAM role follows least-privilege principle
- No wildcard permissions
- Scoped to specific resources

## Usage

```hcl
module "api" {
  source = "../../modules/api"

  project_name = "kanjona-funnel"
  environment  = "prod"
  root_domain  = "kanjona.com"

  acm_certificate_arn = module.acm.validated_certificate_arn

  # CORS
  cors_allowed_origins = [
    "https://kanjona.com",
    "https://www.kanjona.com"
  ]

  # DynamoDB integration
  dynamodb_table_name = module.dynamodb.table_name
  dynamodb_table_arn  = module.dynamodb.table_arn

  # EventBridge integration
  event_bus_name = module.eventing.event_bus_name
  event_bus_arn  = module.eventing.event_bus_arn

  # Production settings
  lambda_memory_mb            = 512
  lambda_reserved_concurrency = 100
  enable_xray                 = true
  enable_logging              = true
  log_retention_days          = 30

  tags = local.common_tags
}
```

## API Endpoints

| Method  | Path  | Description                            |
| ------- | ----- | -------------------------------------- |
| POST    | /lead | Submit a new lead                      |
| OPTIONS | /lead | CORS preflight (handled automatically) |

## Lambda Placeholder

The module includes a placeholder handler at `lambda_placeholder/handler.py`. This returns a success
response and should be replaced with actual business logic.

To deploy updated Lambda code:

```bash
aws lambda update-function-code \
  --function-name <function_name> \
  --zip-file fileb://path/to/deployment.zip
```

## Inputs

| Name                        | Description            | Type         | Default |
| --------------------------- | ---------------------- | ------------ | ------- |
| project_name                | Project name           | string       | -       |
| environment                 | Environment (dev/prod) | string       | -       |
| root_domain                 | Root domain name       | string       | -       |
| acm_certificate_arn         | ACM certificate ARN    | string       | -       |
| cors_allowed_origins        | Allowed CORS origins   | list(string) | -       |
| dynamodb_table_name         | DynamoDB table name    | string       | -       |
| dynamodb_table_arn          | DynamoDB table ARN     | string       | -       |
| event_bus_name              | EventBridge bus name   | string       | default |
| event_bus_arn               | EventBridge bus ARN    | string       | -       |
| lambda_memory_mb            | Lambda memory          | number       | 256     |
| lambda_reserved_concurrency | Reserved concurrency   | number       | null    |
| enable_xray                 | Enable X-Ray           | bool         | false   |
| enable_logging              | Enable API logging     | bool         | false   |
| throttling_rate_limit       | Rate limit (req/s)     | number       | 100     |
| throttling_burst_limit      | Burst limit            | number       | 200     |

## Outputs

| Name                  | Description           |
| --------------------- | --------------------- |
| api_id                | API Gateway ID        |
| api_url               | Full API URL          |
| custom_domain_name    | Custom domain target  |
| custom_domain_zone_id | Custom domain zone ID |
| lambda_function_name  | Lambda function name  |
| lambda_function_arn   | Lambda function ARN   |
