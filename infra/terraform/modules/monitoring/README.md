# Monitoring Module

Creates CloudWatch alarms, SNS topic, and optional dashboard for observability.

## Resources Created

- SNS topic for alarm notifications
- Email subscription (if alert_email provided)
- CloudWatch alarms for Lambda, API Gateway, DynamoDB, SQS
- CloudWatch dashboard (optional, typically prod only)

## Alarms Created

### Lambda Alarms

| Alarm        | Condition     | Severity |
| ------------ | ------------- | -------- |
| Errors       | > 5 in 5 min  | High     |
| Throttles    | > 0 in 5 min  | High     |
| Duration P99 | > 5s in 5 min | Medium   |

### API Gateway Alarms

| Alarm       | Condition      | Severity                 |
| ----------- | -------------- | ------------------------ |
| 5xx Errors  | > 10 in 5 min  | High                     |
| 4xx Errors  | > 100 in 5 min | Medium (possible attack) |
| Latency P99 | > 3s in 5 min  | Medium                   |

### DynamoDB Alarms

| Alarm              | Condition    | Severity |
| ------------------ | ------------ | -------- |
| Throttled Requests | > 0 in 5 min | High     |
| System Errors      | > 0 in 5 min | Critical |

### SQS Alarms (if enabled)

| Alarm        | Condition    | Severity |
| ------------ | ------------ | -------- |
| DLQ Messages | > 0 in 5 min | High     |
| Queue Age    | > 1 hour     | Medium   |

## Usage

```hcl
module "monitoring" {
  source = "../../modules/monitoring"

  project_name = "kanjona-funnel"
  environment  = "prod"
  aws_region   = "us-east-1"

  alert_email = "alerts@yourcompany.com"

  # Resource references
  lambda_function_name = module.api.lambda_function_name
  api_gateway_id       = module.api.api_id
  dynamodb_table_name  = module.dynamodb.table_name
  sqs_queue_name       = module.eventing.queue_name
  sqs_dlq_name         = module.eventing.dlq_name

  # Create dashboard in prod
  create_dashboard = true

  tags = local.common_tags
}
```

## Email Subscription

If `alert_email` is provided, a confirmation email will be sent. **You must click the confirmation
link** for notifications to work.

## Dashboard

The dashboard includes:

- Lambda invocations, errors, duration
- API Gateway requests, errors, latency
- DynamoDB capacity consumption, throttles
- SQS queue depth and DLQ messages

## Inputs

| Name                 | Description             | Type   | Default   |
| -------------------- | ----------------------- | ------ | --------- |
| project_name         | Project name            | string | -         |
| environment          | Environment (dev/prod)  | string | -         |
| aws_region           | AWS region              | string | us-east-1 |
| alert_email          | Email for notifications | string | ""        |
| lambda_function_name | Lambda function name    | string | -         |
| api_gateway_id       | API Gateway ID          | string | -         |
| dynamodb_table_name  | DynamoDB table name     | string | -         |
| sqs_queue_name       | SQS queue name          | string | ""        |
| sqs_dlq_name         | SQS DLQ name            | string | ""        |
| create_dashboard     | Create dashboard        | bool   | false     |

## Outputs

| Name           | Description                 |
| -------------- | --------------------------- |
| sns_topic_arn  | SNS topic ARN               |
| dashboard_name | Dashboard name (if created) |
| alarm_names    | List of alarm names         |
