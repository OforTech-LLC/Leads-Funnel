# Eventing Module

Creates EventBridge event bus and optional SQS queue for async lead processing.

## Resources Created

- Custom EventBridge event bus
- EventBridge rule for `lead.created` events
- Optional: SQS queue for processing
- Optional: SQS dead-letter queue

## Event Schema

### lead.created Event

```json
{
  "version": "0",
  "id": "event-id",
  "source": "kanjona.leads",
  "detail-type": "lead.created",
  "time": "2024-01-15T12:00:00Z",
  "detail": {
    "leadId": "uuid",
    "email": "user@example.com",
    "createdAt": "2024-01-15T12:00:00Z"
  }
}
```

## Publishing Events

From Lambda, publish events using boto3:

```python
import boto3
import json

events = boto3.client('events')

events.put_events(
    Entries=[{
        'Source': 'kanjona.leads',
        'DetailType': 'lead.created',
        'Detail': json.dumps({
            'leadId': lead_id,
            'email': email,
            'createdAt': timestamp
        }),
        'EventBusName': 'kanjona-funnel-prod-leads'
    }]
)
```

## Usage

```hcl
module "eventing" {
  source = "../../modules/eventing"

  project_name = "kanjona-funnel"
  environment  = "prod"

  # Enable SQS for async processing
  enable_sqs = true

  tags = local.common_tags
}
```

## SQS Configuration

When `enable_sqs = true`:

### Main Queue

- Visibility timeout: 60 seconds
- Message retention: 4 days
- Long polling: 20 seconds
- SSE encryption enabled

### Dead-Letter Queue

- Message retention: 14 days
- Max receive count: 3 (before moving to DLQ)

## Inputs

| Name         | Description            | Type   | Default |
| ------------ | ---------------------- | ------ | ------- |
| project_name | Project name           | string | -       |
| environment  | Environment (dev/prod) | string | -       |
| enable_sqs   | Enable SQS queue       | bool   | false   |

## Outputs

| Name            | Description                |
| --------------- | -------------------------- |
| event_bus_name  | EventBridge bus name       |
| event_bus_arn   | EventBridge bus ARN        |
| event_rule_name | EventBridge rule name      |
| queue_url       | SQS queue URL (if enabled) |
| queue_arn       | SQS queue ARN (if enabled) |
| dlq_url         | DLQ URL (if enabled)       |
| dlq_arn         | DLQ ARN (if enabled)       |
