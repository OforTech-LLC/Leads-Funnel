# DynamoDB Module

Creates DynamoDB table with single-table design for lead funnel data.

## Resources Created

- DynamoDB table with on-demand capacity
- Global Secondary Index (GSI1)
- TTL configuration
- Optional Point-in-Time Recovery
- Optional deletion protection

## Single-Table Design

This table uses a single-table design pattern with composite keys:

### Primary Key Structure

- **PK (Partition Key)**: Entity type + ID (e.g., `LEAD#uuid`)
- **SK (Sort Key)**: Record type or timestamp (e.g., `META`, `EVENT#timestamp`)

### Entity Schemas

#### Lead Record

```
PK: "LEAD#<uuid>"
SK: "META"
GSI1PK: "EMAIL#<normalized_email>"
GSI1SK: "CREATED#<iso_timestamp>"
name: string
email: string
phone: string (optional)
message: string (optional)
createdAt: ISO 8601 timestamp
source: { utmSource, utmMedium, utmCampaign, referrer, userAgent, ipAddress }
status: "new" | "processing" | "processed" | "error"
```

#### Lead Event (Timeline)

```
PK: "LEAD#<uuid>"
SK: "EVENT#<iso_timestamp>#<event_type>"
eventType: string
data: map
createdAt: ISO 8601 timestamp
```

#### Rate Limit Record

```
PK: "RATELIMIT#<hashed_ip>"
SK: "WINDOW#<time_bucket>"
count: number
ttl: number (Unix timestamp)
```

#### Idempotency Record

```
PK: "IDEMPOTENCY#<request_hash>"
SK: "META"
leadId: string
createdAt: ISO 8601 timestamp
ttl: number (Unix timestamp, 24 hours)
```

## Usage

```hcl
module "dynamodb" {
  source = "../../modules/dynamodb"

  project_name = "kanjona-funnel"
  environment  = "prod"

  enable_pitr                = true   # Prod only
  enable_deletion_protection = true   # Prod only

  tags = local.common_tags
}
```

## Access Patterns

| Access Pattern     | Key Condition                             |
| ------------------ | ----------------------------------------- |
| Get lead by ID     | PK = LEAD#<id>, SK = META                 |
| Get lead events    | PK = LEAD#<id>, SK begins_with EVENT#     |
| Find lead by email | GSI1: GSI1PK = EMAIL#<email>              |
| Check rate limit   | PK = RATELIMIT#<ip>, SK = WINDOW#<bucket> |
| Check idempotency  | PK = IDEMPOTENCY#<hash>, SK = META        |

## Inputs

| Name                       | Description                   | Type   | Default |
| -------------------------- | ----------------------------- | ------ | ------- |
| project_name               | Project name                  | string | -       |
| environment                | Environment (dev/prod)        | string | -       |
| enable_pitr                | Enable Point-in-Time Recovery | bool   | false   |
| enable_deletion_protection | Enable deletion protection    | bool   | false   |

## Outputs

| Name       | Description         |
| ---------- | ------------------- |
| table_name | DynamoDB table name |
| table_arn  | DynamoDB table ARN  |
| gsi1_name  | GSI1 index name     |
| gsi1_arn   | GSI1 index ARN      |
