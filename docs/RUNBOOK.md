# Kanjona Operations Runbook

This runbook provides guidance for responding to alerts, troubleshooting issues, and maintaining the
Kanjona platform.

## Table of Contents

1. [Alert Response Guide](#alert-response-guide)
2. [Common Issues and Resolutions](#common-issues-and-resolutions)
3. [Debugging Steps](#debugging-steps)
4. [Escalation Procedures](#escalation-procedures)
5. [Distributed Tracing with X-Ray](#distributed-tracing-with-x-ray)
6. [Maintenance Procedures](#maintenance-procedures)

---

## Alert Response Guide

### Lambda Alarms

#### Lambda Errors (`kanjona-{env}-lambda-errors`)

**Severity:** High

**Description:** Lambda function is generating errors.

**Investigation Steps:**

1. Check CloudWatch Logs for the Lambda function:

   ```bash
   aws logs filter-log-events \
     --log-group-name /aws/lambda/kanjona-{env}-lead-handler \
     --filter-pattern "ERROR" \
     --start-time $(date -d '1 hour ago' +%s000)
   ```

2. Check for specific error patterns:
   - `ValidationError` - Invalid input data
   - `DynamoDBServiceException` - Database issues
   - `TimeoutError` - Function timeout
   - `MemoryError` - Out of memory

**Resolution:**

- **ValidationError**: Review recent code changes, check input validation
- **DynamoDB errors**: Check table throttling, verify IAM permissions
- **Timeout**: Increase timeout or optimize code
- **Memory**: Increase Lambda memory allocation

---

#### Lambda Error Rate (`kanjona-{env}-lambda-error-rate`)

**Severity:** High

**Description:** Lambda error rate exceeds threshold (>1% for prod, >5% for dev).

**Investigation Steps:**

1. Calculate current error rate:

   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name Errors \
     --dimensions Name=FunctionName,Value=kanjona-{env}-lead-handler \
     --start-time $(date -d '30 minutes ago' -u +%Y-%m-%dT%H:%M:%SZ) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
     --period 300 \
     --statistics Sum
   ```

2. Compare with invocations to get percentage

**Resolution:**

- If spike correlates with deployment, consider rollback
- If gradual increase, check for dependency issues
- Review recent changes to input data sources

---

#### Lambda Duration (`kanjona-{env}-lambda-duration`)

**Severity:** Medium

**Description:** Lambda P99 duration exceeds threshold (10 seconds).

**Investigation Steps:**

1. Check X-Ray traces for slow requests:

   ```bash
   aws xray get-trace-summaries \
     --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%SZ) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
     --filter-expression 'duration > 5'
   ```

2. Look for cold starts vs actual slow execution
3. Check DynamoDB latency in traces

**Resolution:**

- **Cold starts**: Consider provisioned concurrency
- **DynamoDB slow**: Check for hot partitions, optimize queries
- **External API slow**: Add timeouts, implement caching

---

#### Lambda Throttles (`kanjona-{env}-lambda-throttles`)

**Severity:** High

**Description:** Lambda function is being throttled due to concurrency limits.

**Investigation Steps:**

1. Check concurrent executions:
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name ConcurrentExecutions \
     --dimensions Name=FunctionName,Value=kanjona-{env}-lead-handler \
     --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%SZ) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
     --period 60 \
     --statistics Maximum
   ```

**Resolution:**

- Request limit increase from AWS Support
- Increase reserved concurrency if available
- Implement request queuing with SQS

---

### API Gateway Alarms

#### API 5xx Errors (`kanjona-{env}-api-5xx`)

**Severity:** Critical

**Description:** API Gateway is returning 5xx server errors.

**Investigation Steps:**

1. Check API Gateway access logs:

   ```bash
   aws logs filter-log-events \
     --log-group-name /aws/api-gateway/kanjona-{env} \
     --filter-pattern '"5"' \
     --start-time $(date -d '1 hour ago' +%s000)
   ```

2. Check if Lambda is the source (correlation with Lambda errors)

**Resolution:**

- If Lambda errors: Follow Lambda troubleshooting
- If integration timeout: Increase API Gateway timeout
- If Lambda throttling: Address concurrency issues

---

#### API Error Rate (`kanjona-{env}-api-error-rate`)

**Severity:** High

**Description:** Combined 4xx + 5xx error rate exceeds threshold.

**Investigation Steps:**

1. Break down by error type (4xx vs 5xx)
2. Check for attack patterns (high 4xx from single IP)
3. Review recent deployments

**Resolution:**

- **High 4xx**: May indicate attack - check WAF logs
- **High 5xx**: Backend issue - check Lambda logs
- **Mixed**: Review API changes, check CORS configuration

---

#### API Latency (`kanjona-{env}-api-latency`)

**Severity:** Medium

**Description:** API Gateway P99 latency exceeds threshold.

**Investigation Steps:**

1. Compare Latency vs IntegrationLatency:
   - If IntegrationLatency high: Backend (Lambda) issue
   - If difference is high: API Gateway overhead

**Resolution:**

- Backend slow: Optimize Lambda
- API Gateway slow: Check for complex request transformations

---

### DynamoDB Alarms

#### DynamoDB Throttles (`kanjona-{env}-dynamodb-throttles`)

**Severity:** Critical

**Description:** DynamoDB requests are being throttled.

**Investigation Steps:**

1. Check consumed capacity:

   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/DynamoDB \
     --metric-name ConsumedReadCapacityUnits \
     --dimensions Name=TableName,Value=kanjona-{env}-leads-real-estate \
     --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%SZ) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
     --period 60 \
     --statistics Sum
   ```

2. Look for hot partition keys

**Resolution:**

- Enable on-demand billing mode (if not already)
- Increase provisioned capacity
- Redesign partition key if hot partition issue

---

#### DynamoDB System Errors (`kanjona-{env}-dynamodb-errors`)

**Severity:** Critical

**Description:** DynamoDB is returning system errors.

**Investigation Steps:**

1. Check AWS Health Dashboard for service issues
2. Review CloudTrail for any configuration changes

**Resolution:**

- Usually AWS-side issue - monitor AWS Status
- If persistent, contact AWS Support

---

### SQS Alarms

#### SQS DLQ Messages (`kanjona-{env}-sqs-dlq`)

**Severity:** High

**Description:** Messages are appearing in the dead-letter queue.

**Investigation Steps:**

1. Check DLQ message contents:

   ```bash
   aws sqs receive-message \
     --queue-url https://sqs.{region}.amazonaws.com/{account}/kanjona-{env}-dlq \
     --max-number-of-messages 10
   ```

2. Look for common failure patterns

**Resolution:**

- Fix processing errors in Lambda
- Replay messages after fix:
  ```bash
  # Move messages from DLQ back to main queue
  aws lambda invoke \
    --function-name kanjona-{env}-dlq-replay \
    --payload '{"count": 100}' \
    response.json
  ```

---

### Synthetic Canary Alarms

#### API Canary Failed (`kanjona-{env}-api-canary-failed`)

**Severity:** Critical

**Description:** API health check canary is failing.

**Investigation Steps:**

1. Check canary logs in CloudWatch:

   ```bash
   aws logs filter-log-events \
     --log-group-name /aws/lambda/cwsyn-kanjona-{env}-api-health-* \
     --start-time $(date -d '1 hour ago' +%s000)
   ```

2. Check canary artifacts in S3 for screenshots/HAR files

**Resolution:**

- Verify API Gateway is healthy
- Check /health endpoint directly
- Review Lambda and DynamoDB health

---

#### Website Canary Failed (`kanjona-{env}-website-canary-failed`)

**Severity:** Critical

**Description:** Website availability canary is failing.

**Investigation Steps:**

1. Check CloudFront distribution status
2. Check S3 bucket for website files
3. Check DNS resolution

**Resolution:**

- If CloudFront issue: Check origin health
- If S3 issue: Verify bucket permissions
- If DNS issue: Check Route 53 records

---

## Common Issues and Resolutions

### High Latency

**Symptoms:**

- Lambda duration alarm triggered
- API latency alarm triggered
- Users reporting slow responses

**Common Causes:**

1. Cold starts
2. DynamoDB throttling
3. External API slowness
4. Memory pressure

**Resolution Steps:**

1. Check for cold starts in X-Ray
2. Review DynamoDB metrics
3. Check external API health
4. Increase Lambda memory if needed

---

### Error Spikes

**Symptoms:**

- Multiple error alarms triggered simultaneously
- Error rate exceeds threshold

**Common Causes:**

1. Bad deployment
2. Configuration change
3. Downstream service outage
4. Traffic spike

**Resolution Steps:**

1. Check for recent deployments
2. Review recent configuration changes
3. Check AWS service health
4. Implement rollback if needed:
   ```bash
   # Rollback Lambda to previous version
   aws lambda update-alias \
     --function-name kanjona-{env}-lead-handler \
     --name live \
     --function-version {previous-version}
   ```

---

### Data Not Appearing

**Symptoms:**

- Leads not showing in admin console
- DynamoDB table appears empty

**Investigation:**

1. Check if data is being received (API logs)
2. Verify DynamoDB writes are succeeding
3. Check for serialization issues

**Resolution:**

- Verify IAM permissions
- Check for validation errors in Lambda
- Review GSI consistency

---

## Debugging Steps

### Checking Lambda Logs

```bash
# Get recent logs
aws logs tail /aws/lambda/kanjona-{env}-lead-handler --follow

# Search for specific errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/kanjona-{env}-lead-handler \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s000)

# Get logs for specific request
aws logs filter-log-events \
  --log-group-name /aws/lambda/kanjona-{env}-lead-handler \
  --filter-pattern "{REQUEST_ID}"
```

### Checking DynamoDB

```bash
# Scan recent items
aws dynamodb scan \
  --table-name kanjona-{env}-leads-real-estate \
  --limit 10 \
  --scan-filter '{"createdAt":{"AttributeValueList":[{"S":"2024-01-01"}],"ComparisonOperator":"GT"}}'

# Query specific lead
aws dynamodb get-item \
  --table-name kanjona-{env}-leads-real-estate \
  --key '{"pk":{"S":"LEAD#123"},"sk":{"S":"LEAD#123"}}'
```

### Checking API Gateway

```bash
# Get API info
aws apigatewayv2 get-api --api-id {api-id}

# Get stages
aws apigatewayv2 get-stages --api-id {api-id}

# Get routes
aws apigatewayv2 get-routes --api-id {api-id}
```

---

## Escalation Procedures

### Severity Levels

| Level         | Response Time | Examples                                   |
| ------------- | ------------- | ------------------------------------------ |
| P1 - Critical | 15 minutes    | Service down, data loss                    |
| P2 - High     | 1 hour        | High error rate, major feature broken      |
| P3 - Medium   | 4 hours       | Degraded performance, minor feature broken |
| P4 - Low      | 24 hours      | Cosmetic issues, non-urgent bugs           |

### Escalation Path

1. **L1 - On-Call Engineer**
   - Initial response and triage
   - Basic troubleshooting
   - Escalate if unable to resolve within 30 minutes

2. **L2 - Senior Engineer**
   - Complex troubleshooting
   - Code-level investigation
   - Coordinate with AWS Support if needed

3. **L3 - Engineering Lead**
   - Architecture-level issues
   - Major incident management
   - Customer communication

### Contact Information

Update this section with your team's contact details:

- On-Call: [PagerDuty/Opsgenie link]
- Slack Channel: #kanjona-alerts
- Email: ops@kanjona.com

---

## Distributed Tracing with X-Ray

### Enabling X-Ray

X-Ray is enabled via Terraform variables:

- `enable_xray = true` in environment configuration

### Viewing Traces

1. **AWS Console:**
   - Navigate to X-Ray > Traces
   - Filter by service: `kanjona-{env}-lead-handler`
   - Look for traces with errors or high latency

2. **CLI:**

   ```bash
   # Get trace summaries
   aws xray get-trace-summaries \
     --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%SZ) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
     --filter-expression 'service("kanjona-{env}-lead-handler")'

   # Get specific trace
   aws xray batch-get-traces --trace-ids {trace-id}
   ```

### Trace ID in API Responses

When X-Ray is enabled, API responses include trace ID in headers:

```
X-Amzn-Trace-Id: Root=1-xxxxx-xxxxxxxxxxxxx
```

Use this ID to correlate client requests with backend traces.

### Adding Custom Annotations

In Lambda code, add custom annotations for debugging:

```javascript
const AWSXRay = require('aws-xray-sdk-core');

// Add annotation
AWSXRay.getSegment().addAnnotation('funnelId', funnelId);
AWSXRay.getSegment().addAnnotation('leadId', leadId);

// Add metadata
AWSXRay.getSegment().addMetadata('requestBody', body);
```

---

## Maintenance Procedures

### Scheduled Maintenance

1. **Pre-Maintenance:**
   - Notify stakeholders
   - Update status page
   - Take database snapshots if needed

2. **During Maintenance:**
   - Monitor CloudWatch metrics
   - Watch for errors in logs
   - Have rollback ready

3. **Post-Maintenance:**
   - Verify all services healthy
   - Check synthetic canaries pass
   - Update status page

### Database Backups

DynamoDB tables have PITR (Point-in-Time Recovery) enabled in production.

**Restore from PITR:**

```bash
aws dynamodb restore-table-to-point-in-time \
  --source-table-name kanjona-prod-leads-real-estate \
  --target-table-name kanjona-prod-leads-real-estate-restored \
  --restore-date-time 2024-01-15T10:30:00Z
```

### Log Retention

| Environment | Lambda Logs | API Gateway Logs | CloudTrail |
| ----------- | ----------- | ---------------- | ---------- |
| Dev         | 7 days      | 7 days           | 90 days    |
| Prod        | 30 days     | 30 days          | 365 days   |

### Rotating Secrets

Secrets are stored in AWS Secrets Manager:

```bash
# List secrets
aws secretsmanager list-secrets --filters Key=name,Values=kanjona

# Rotate secret
aws secretsmanager rotate-secret --secret-id kanjona-{env}/twilio
```

---

## Quick Reference

### Useful AWS CLI Commands

```bash
# Check Lambda function configuration
aws lambda get-function-configuration \
  --function-name kanjona-{env}-lead-handler

# Check API Gateway health
aws apigatewayv2 get-api --api-id {api-id}

# Check DynamoDB table status
aws dynamodb describe-table \
  --table-name kanjona-{env}-leads-real-estate

# List CloudWatch alarms in ALARM state
aws cloudwatch describe-alarms \
  --state-value ALARM \
  --alarm-name-prefix kanjona-{env}

# Check canary status
aws synthetics get-canary \
  --name kanjona-{env}-api-health
```

### CloudWatch Dashboard

Access the CloudWatch dashboard in the AWS Console:

- Dashboard name: `kanjona-{env}`
- Shows all key metrics at a glance

### Health Check Endpoints

- API Health: `https://api.kanjona.com/health` (prod)
- API Health: `https://api-dev.kanjona.com/health` (dev)

### Deployment Information

- Infrastructure: Terraform in `/infra/terraform`
- Environment configs: `/infra/terraform/envs/{dev,prod}`
- CI/CD: GitHub Actions in `.github/workflows`

---

_Last Updated: 2024-01_

_Maintained by: Platform Team_
