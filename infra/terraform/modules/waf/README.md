# WAF Module

Creates AWS WAF Web ACL for CloudFront protection with managed rules and rate limiting.

## Resources Created

- WAF Web ACL (CLOUDFRONT scope)
- Rate limiting rule
- AWS Managed Rules:
  - Common Rule Set
  - Known Bad Inputs Rule Set
- CloudWatch Log Group (optional)
- WAF Logging Configuration (optional)

## Important Notes

1. **Region Requirement**: This module MUST be applied in `us-east-1` for CloudFront compatibility.
   Use a provider alias if your default region differs.

2. **Cost**: WAF costs ~$5/month base + $1/million requests. Rate limiting and managed rules have
   additional costs.

## Rules

### Priority 0: Rate Limiting

- Blocks IPs that exceed 500 requests per 5 minutes
- Configurable via `rate_limit_requests` variable

### Priority 1: Common Rule Set

- Protects against common web exploits
- XSS, LFI, RFI, etc.
- Some rules can be excluded if causing false positives

### Priority 2: Known Bad Inputs

- Blocks requests with known malicious patterns
- Log4j exploits, etc.

## Usage

```hcl
# Provider alias for us-east-1 (if needed)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

module "waf" {
  source = "../../modules/waf"

  providers = {
    aws = aws.us_east_1
  }

  project_name = "kanjona-funnel"
  environment  = "prod"

  rate_limit_requests = 500
  enable_logging      = true
  log_retention_days  = 30

  # Exclude rules causing false positives
  common_rules_excluded = ["SizeRestrictions_BODY"]

  tags = local.common_tags
}

# Associate with CloudFront
module "static_site" {
  source = "../../modules/static_site"

  waf_web_acl_arn = module.waf.web_acl_arn
  # ...
}
```

## Monitoring

WAF metrics are available in CloudWatch:

- `BlockedRequests`
- `AllowedRequests`
- `CountedRequests`

## Inputs

| Name                  | Description                     | Type         | Default |
| --------------------- | ------------------------------- | ------------ | ------- |
| project_name          | Project name                    | string       | -       |
| environment           | Environment (dev/prod)          | string       | -       |
| rate_limit_requests   | Requests per 5 min per IP       | number       | 500     |
| common_rules_excluded | Rules to count instead of block | list(string) | []      |
| enable_logging        | Enable CloudWatch logging       | bool         | true    |
| log_retention_days    | Log retention period            | number       | 30      |

## Outputs

| Name          | Description              |
| ------------- | ------------------------ |
| web_acl_id    | WAF Web ACL ID           |
| web_acl_arn   | WAF Web ACL ARN          |
| log_group_arn | CloudWatch Log Group ARN |
