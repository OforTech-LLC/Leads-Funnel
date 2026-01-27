# Audit Log Retention Policy

This document outlines the audit log retention policies for the Kanjona platform to ensure
compliance, security monitoring, and cost optimization.

## Overview

The platform implements comprehensive audit logging through multiple AWS services:

1. **CloudTrail** - AWS API call logging
2. **CloudWatch Logs** - Application and Lambda logs
3. **DynamoDB** - Admin audit trail
4. **S3** - Long-term storage and archival

## Retention Requirements by Environment

### Production Environment

| Log Type              | Hot Storage | Glacier Transition | Total Retention         | Notes                  |
| --------------------- | ----------- | ------------------ | ----------------------- | ---------------------- |
| CloudTrail S3         | 90 days     | 90 days            | 365 days (1 year)       | Compliance requirement |
| CloudTrail CloudWatch | N/A         | N/A                | 90 days                 | Real-time monitoring   |
| Lambda Logs           | N/A         | N/A                | 30 days                 | Application debugging  |
| Admin Audit DynamoDB  | N/A         | N/A                | 365 days (PITR enabled) | User action tracking   |
| S3 Access Logs        | N/A         | N/A                | 90 days                 | Security analysis      |

### Development Environment

| Log Type              | Hot Storage | Glacier Transition | Total Retention | Notes                |
| --------------------- | ----------- | ------------------ | --------------- | -------------------- |
| CloudTrail S3         | 90 days     | 90 days            | 90 days         | Cost optimization    |
| CloudTrail CloudWatch | N/A         | N/A                | 14 days         | Short-term debugging |
| Lambda Logs           | N/A         | N/A                | 7 days          | Cost optimization    |
| Admin Audit DynamoDB  | N/A         | N/A                | 30 days         | Testing only         |
| S3 Access Logs        | N/A         | N/A                | 90 days         | Security analysis    |

## Terraform Configuration

### CloudTrail Module Variables

```hcl
# Production settings
log_retention_days            = 365  # S3 retention before expiration
transition_to_glacier_days    = 90   # Move to Glacier after 90 days
cloudwatch_log_retention_days = 90   # CloudWatch log retention

# Development settings
log_retention_days            = 90
transition_to_glacier_days    = 90
cloudwatch_log_retention_days = 14
```

### Lambda Log Retention

Set via the Lambda module:

```hcl
# Production
log_retention_days = 30

# Development
log_retention_days = 7
```

### Admin Module Audit Logs

```hcl
# Production
audit_log_retention_days   = 365
enable_audit_pitr          = true
enable_deletion_protection = true

# Development
audit_log_retention_days   = 30
enable_audit_pitr          = false
enable_deletion_protection = false
```

## Compliance Considerations

### SOC 2 / ISO 27001

- Minimum 1-year retention for security-related logs
- CloudTrail captures all AWS API calls
- Admin audit logs track all user actions
- Log integrity protected via:
  - KMS encryption at rest
  - S3 versioning enabled
  - CloudTrail log file validation

### GDPR / CCPA

- PII is hashed before logging (IP addresses, email addresses)
- Raw PII is NOT stored in audit logs
- Retention periods support right-to-erasure requests

### PCI DSS (if applicable)

- 1-year retention meets PCI requirement
- All logs encrypted with AES-256 (KMS)
- Access logging enabled on all log buckets

## Cost Optimization

### S3 Lifecycle Policies

```
1. Hot storage (S3 Standard): 0-90 days
2. Cold storage (S3 Glacier): 90-365 days
3. Expiration: After retention period
```

### Estimated Monthly Costs (Production)

| Component               | Estimated Cost |
| ----------------------- | -------------- |
| CloudTrail S3 (Glacier) | ~$5-10/month   |
| CloudWatch Logs         | ~$10-20/month  |
| DynamoDB (with PITR)    | ~$5-10/month   |
| Total                   | ~$20-40/month  |

## Accessing Logs

### CloudTrail Logs

```bash
# List recent CloudTrail events
aws cloudtrail lookup-events --max-results 10

# Query via CloudWatch Logs Insights
aws logs start-query \
  --log-group-name '/aws/cloudtrail/kanjona-prod' \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, eventName, userIdentity.arn | limit 20'
```

### Admin Audit Logs

```bash
# Query DynamoDB audit table
aws dynamodb query \
  --table-name kanjona-prod-admin-audit \
  --key-condition-expression "pk = :pk" \
  --expression-attribute-values '{":pk": {"S": "USER#user-id"}}'
```

### Lambda Logs

```bash
# View recent Lambda invocations
aws logs tail /aws/lambda/kanjona-prod-lead-handler --since 1h
```

## Monitoring and Alerts

### CloudWatch Alarms

The following alarms should be configured:

1. **CloudTrail Log Delivery Failure** - Alert if logs stop being delivered
2. **Unusual API Activity** - Alert on suspicious AWS API patterns
3. **Admin Login Failures** - Alert on repeated authentication failures

### Log Insights Queries

Recommended saved queries:

```sql
-- Failed API calls
fields @timestamp, errorCode, errorMessage, userIdentity.arn
| filter errorCode like /AccessDenied|Unauthorized/
| sort @timestamp desc
| limit 50

-- Admin user activity
fields @timestamp, eventName, userIdentity.userName, sourceIPAddress
| filter userIdentity.type = "IAMUser"
| sort @timestamp desc
| limit 100
```

## Incident Response

In case of a security incident:

1. **Do not modify** CloudTrail or audit log configurations
2. **Preserve** all logs by disabling lifecycle policies temporarily
3. **Export** relevant logs to a separate, secured S3 bucket
4. **Enable** enhanced logging if not already active

Contact the security team immediately for guidance.

## Review Schedule

This retention policy should be reviewed:

- **Quarterly**: Verify retention settings match requirements
- **Annually**: Assess compliance with updated regulations
- **On incident**: Ensure logs were available when needed
