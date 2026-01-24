# DNS Module

Creates Route 53 hosted zone and DNS records for the lead funnel infrastructure.

## Resources Created

- Route 53 Hosted Zone
- A/AAAA records for root domain (CloudFront alias)
- A/AAAA records for www subdomain (CloudFront alias)
- A record for api subdomain (API Gateway alias)
- ACM certificate validation CNAME records

## Usage

```hcl
module "dns" {
  source = "../../modules/dns"

  project_name = "kanjona-funnel"
  environment  = "prod"
  root_domain  = "kanjona.com"

  cloudfront_domain_name     = module.static_site.domain_name
  cloudfront_hosted_zone_id  = module.static_site.hosted_zone_id
  api_gateway_domain_name    = module.api.custom_domain_name
  api_gateway_hosted_zone_id = module.api.custom_domain_zone_id

  acm_validation_records = module.acm.validation_records

  tags = local.common_tags
}
```

## Important Notes

After initial deployment, you must update your domain registrar's nameservers
to point to the Route 53 nameservers output by this module.

## Inputs

| Name | Description | Type | Required |
|------|-------------|------|----------|
| project_name | Project name for resource naming | string | yes |
| environment | Environment (dev/prod) | string | yes |
| root_domain | Root domain name | string | yes |
| cloudfront_domain_name | CloudFront distribution domain | string | yes |
| api_gateway_domain_name | API Gateway custom domain | string | yes |
| api_gateway_hosted_zone_id | API Gateway hosted zone ID | string | yes |
| acm_validation_records | ACM validation DNS records | map | no |

## Outputs

| Name | Description |
|------|-------------|
| zone_id | Route 53 hosted zone ID |
| nameservers | Nameservers for registrar configuration |
