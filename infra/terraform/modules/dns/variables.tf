# =============================================================================
# DNS Module Variables
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

variable "root_domain" {
  type        = string
  description = "Root domain for the application (e.g., kanjona.com)"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]\\.[a-z]{2,}$", var.root_domain))
    error_message = "Root domain must be a valid domain name."
  }
}

variable "cloudfront_domain_name" {
  type        = string
  description = "CloudFront distribution domain name for alias records"
}

variable "cloudfront_hosted_zone_id" {
  type        = string
  description = "CloudFront hosted zone ID (always Z2FDTNDATAQYW2)"
  default     = "Z2FDTNDATAQYW2" # This is the global CloudFront hosted zone ID
}

variable "api_gateway_domain_name" {
  type        = string
  description = "API Gateway custom domain target domain name"
}

variable "api_gateway_hosted_zone_id" {
  type        = string
  description = "API Gateway regional hosted zone ID"
}

variable "acm_validation_records" {
  type = map(object({
    name   = string
    type   = string
    record = string
  }))
  description = "ACM certificate DNS validation records"
  default     = {}
}

variable "additional_subdomains" {
  type        = list(string)
  description = "Additional subdomains to create DNS records for (e.g., ['dev'] for dev.kanjona.com)"
  default     = []
}

variable "create_root_records" {
  type        = bool
  description = "Whether to create root domain and www DNS records (should only be true for prod)"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
