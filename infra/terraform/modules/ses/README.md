# SES Module

Creates SES configuration for sending email notifications.

## Resources Created

- SES domain identity with DKIM
- Route 53 records for domain verification
- Optional MAIL FROM domain configuration
- Email identity for notifications
- Configuration set with CloudWatch tracking

## Important: Sandbox Mode

AWS SES starts in **sandbox mode** with these limitations:
- Can only send to verified email addresses
- Daily sending limit: 200 emails
- Sending rate: 1 email per second

To use in production, you must [request production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html).

## DNS Records Created

| Record Type | Name | Purpose |
|-------------|------|---------|
| TXT | `_amazonses.<domain>` | Domain verification |
| CNAME (x3) | `<token>._domainkey.<domain>` | DKIM signing |
| MX | `mail.<domain>` | MAIL FROM domain |
| TXT | `mail.<domain>` | SPF for MAIL FROM |

## Usage

```hcl
module "ses" {
  source = "../../modules/ses"

  project_name = "kanjona-funnel"
  environment  = "prod"
  root_domain  = "kanjona.com"

  route53_zone_id    = module.dns.zone_id
  notification_email = "alerts@yourcompany.com"
  enable_mail_from   = true

  tags = local.common_tags
}
```

## Manual Steps Required

1. **Verify notification email**: Check inbox and click verification link
2. **Request production access**: Submit request via AWS Console when ready

## Sending Email from Lambda

```python
import boto3

ses = boto3.client('ses')

ses.send_email(
    Source='noreply@kanjona.com',
    Destination={'ToAddresses': ['recipient@example.com']},
    Message={
        'Subject': {'Data': 'New Lead Notification'},
        'Body': {'Text': {'Data': 'A new lead was captured.'}}
    },
    ConfigurationSetName='kanjona-funnel-prod-leads'
)
```

## IAM Policy for Lambda

If SES is enabled, add this to your Lambda policy:

```hcl
{
  Sid    = "SESSendEmail"
  Effect = "Allow"
  Action = [
    "ses:SendEmail",
    "ses:SendRawEmail"
  ]
  Resource = module.ses.domain_identity_arn
}
```

## Inputs

| Name | Description | Type | Default |
|------|-------------|------|---------|
| project_name | Project name | string | - |
| environment | Environment (dev/prod) | string | - |
| root_domain | Root domain for SES | string | - |
| route53_zone_id | Route 53 zone ID | string | - |
| notification_email | Email for notifications | string | "" |
| enable_mail_from | Enable MAIL FROM domain | bool | true |

## Outputs

| Name | Description |
|------|-------------|
| domain_identity_arn | SES domain identity ARN |
| configuration_set_name | Configuration set name |
| notification_email | Verified notification email |
| mail_from_domain | MAIL FROM domain |
