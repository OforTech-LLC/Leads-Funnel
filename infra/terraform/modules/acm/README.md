# ACM Module

Creates ACM SSL/TLS certificate with DNS validation for CloudFront and API Gateway.

## Resources Created

- ACM Certificate with SANs
- Certificate validation waiter

## Important Notes

1. **Region Requirement**: This module MUST be applied in `us-east-1` for CloudFront
   compatibility. Use a provider alias if your default region differs.

2. **Validation**: The certificate uses DNS validation. The `validation_records`
   output should be passed to the DNS module to create the required CNAME records.

3. **Timing**: Certificate validation can take 10-30 minutes after DNS records
   are created.

## Usage

```hcl
# Provider alias for us-east-1 (if needed)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

module "acm" {
  source = "../../modules/acm"

  providers = {
    aws = aws.us_east_1
  }

  project_name = "kanjona-funnel"
  environment  = "prod"
  root_domain  = "kanjona.com"

  tags = local.common_tags
}
```

## SANs (Subject Alternative Names)

The certificate covers:
- `<root_domain>` (e.g., kanjona.com)
- `www.<root_domain>` (e.g., www.kanjona.com)
- `api.<root_domain>` (e.g., api.kanjona.com)

## Inputs

| Name | Description | Type | Required |
|------|-------------|------|----------|
| project_name | Project name for resource naming | string | yes |
| environment | Environment (dev/prod) | string | yes |
| root_domain | Root domain name | string | yes |

## Outputs

| Name | Description |
|------|-------------|
| certificate_arn | ARN of the certificate |
| validated_certificate_arn | ARN to use after validation |
| validation_records | DNS records for validation |
