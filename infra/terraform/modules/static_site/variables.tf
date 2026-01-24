# =============================================================================
# Static Site Module Variables
# =============================================================================

variable "project_name" {
  type        = string
  description = "Project name used in resource naming"
}

variable "environment" {
  type        = string
  description = "Environment name (dev or prod)"

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be 'dev' or 'prod'."
  }
}

variable "domain_aliases" {
  type        = list(string)
  description = "Domain aliases for CloudFront (e.g., ['kanjona.com', 'www.kanjona.com'])"
}

variable "acm_certificate_arn" {
  type        = string
  description = "ARN of ACM certificate for HTTPS"
}

variable "waf_web_acl_arn" {
  type        = string
  description = "ARN of WAF Web ACL to associate with CloudFront"
  default     = null
}

variable "price_class" {
  type        = string
  description = "CloudFront price class"
  default     = "PriceClass_100" # North America + Europe

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.price_class)
    error_message = "Price class must be PriceClass_100, PriceClass_200, or PriceClass_All."
  }
}

variable "default_ttl" {
  type        = number
  description = "Default TTL in seconds"
  default     = 300 # 5 minutes
}

variable "max_ttl" {
  type        = number
  description = "Maximum TTL in seconds"
  default     = 86400 # 1 day
}

variable "enable_logging" {
  type        = bool
  description = "Enable CloudFront access logging"
  default     = false
}

variable "content_security_policy" {
  type        = string
  description = "Content Security Policy header value"
  default     = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.kanjona.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}

# -----------------------------------------------------------------------------
# Basic Authentication (Password Protection)
# -----------------------------------------------------------------------------
variable "enable_basic_auth" {
  type        = bool
  description = "Enable HTTP Basic Authentication to password-protect the site"
  default     = false
}

variable "basic_auth_username" {
  type        = string
  description = "Username for basic authentication"
  default     = "admin"
  sensitive   = true
}

variable "basic_auth_password" {
  type        = string
  description = "Password for basic authentication"
  default     = "admin"
  sensitive   = true
}
