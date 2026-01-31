# =============================================================================
# CloudFront App Module Variables
# =============================================================================

variable "app_name" {
  type        = string
  description = "Application name (used in resource naming)"
}

variable "bucket_name" {
  type        = string
  description = "S3 bucket name for the app origin (must be globally unique)"
}

# -----------------------------------------------------------------------------
# Domain Configuration
# -----------------------------------------------------------------------------
variable "domain_aliases" {
  type        = list(string)
  description = "List of domain aliases for the CloudFront distribution"
}

variable "acm_certificate_arn" {
  type        = string
  description = "ARN of the ACM certificate (must be in us-east-1)"
}

variable "route53_zone_id" {
  type        = string
  description = "Route53 hosted zone ID for DNS records (null to skip)"
  default     = null
}

# -----------------------------------------------------------------------------
# CloudFront Configuration
# -----------------------------------------------------------------------------
variable "price_class" {
  type        = string
  description = "CloudFront price class"
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.price_class)
    error_message = "Price class must be PriceClass_100, PriceClass_200, or PriceClass_All."
  }
}

variable "waf_web_acl_arn" {
  type        = string
  description = "WAF Web ACL ARN to associate with the distribution (null to skip)"
  default     = null
}

variable "content_security_policy" {
  type        = string
  description = "Content Security Policy header value"
  default     = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.kanjona.com https://*.amazonaws.com https://*.amazoncognito.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
}

# -----------------------------------------------------------------------------
# Tags
# -----------------------------------------------------------------------------
variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
