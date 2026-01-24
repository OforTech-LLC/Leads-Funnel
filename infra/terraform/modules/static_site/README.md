# Static Site Module

Creates S3 bucket and CloudFront distribution for hosting static site content with modern security best practices.

## Resources Created

- S3 bucket for site origin (private, encrypted, versioned)
- S3 bucket policy (CloudFront OAC only)
- CloudFront Origin Access Control (OAC)
- CloudFront distribution with HTTPS redirect
- CloudFront cache policy
- CloudFront response headers policy (security headers)
- Optional: S3 bucket for access logs with lifecycle rules

## Security Features

### S3 Bucket
- All public access blocked
- Server-side encryption (AES256)
- Versioning enabled
- No static website hosting (CloudFront handles this)

### CloudFront
- Origin Access Control (OAC) - modern replacement for OAI
- HTTPS only (HTTP redirects to HTTPS)
- TLS 1.2+ minimum
- Compression enabled (gzip + brotli)

### Security Headers
- `Strict-Transport-Security`: HSTS with preload
- `X-Content-Type-Options`: nosniff
- `X-Frame-Options`: DENY
- `X-XSS-Protection`: enabled
- `Referrer-Policy`: strict-origin-when-cross-origin
- `Content-Security-Policy`: configurable
- `Permissions-Policy`: restrictive defaults

## Usage

```hcl
module "static_site" {
  source = "../../modules/static_site"

  project_name = "kanjona-funnel"
  environment  = "prod"

  domain_aliases      = ["kanjona.com", "www.kanjona.com"]
  acm_certificate_arn = module.acm.validated_certificate_arn

  # Optional: WAF protection
  waf_web_acl_arn = module.waf.web_acl_arn

  # Optional: Access logging
  enable_logging = true

  # Production price class (includes Asia)
  price_class = "PriceClass_200"

  tags = local.common_tags
}
```

## SPA Support

Custom error responses are configured to return `/index.html` for 403/404 errors,
enabling client-side routing for single-page applications.

## Cache Invalidation

After uploading new content, invalidate the cache:

```bash
aws cloudfront create-invalidation \
  --distribution-id <distribution_id> \
  --paths "/*"
```

## Inputs

| Name | Description | Type | Default |
|------|-------------|------|---------|
| project_name | Project name | string | - |
| environment | Environment (dev/prod) | string | - |
| domain_aliases | CloudFront domain aliases | list(string) | - |
| acm_certificate_arn | ACM certificate ARN | string | - |
| waf_web_acl_arn | WAF Web ACL ARN | string | null |
| price_class | CloudFront price class | string | PriceClass_100 |
| enable_logging | Enable access logging | bool | false |
| content_security_policy | CSP header value | string | (default) |

## Outputs

| Name | Description |
|------|-------------|
| bucket_name | S3 bucket name |
| distribution_id | CloudFront distribution ID |
| domain_name | CloudFront domain name |
| hosted_zone_id | CloudFront hosted zone ID |
