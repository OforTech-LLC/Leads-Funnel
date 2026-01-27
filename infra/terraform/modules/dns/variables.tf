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

# -----------------------------------------------------------------------------
# Health Check Configuration
# -----------------------------------------------------------------------------

variable "enable_health_check" {
  type        = bool
  description = "Enable Route 53 health check for API endpoint"
  default     = false
}

variable "enable_website_health_check" {
  type        = bool
  description = "Enable Route 53 health check for website (root domain)"
  default     = false
}

variable "enable_health_check_alarm" {
  type        = bool
  description = "Enable CloudWatch alarm for health check failures"
  default     = true
}

variable "health_check_path" {
  type        = string
  description = "Path to check for API health endpoint"
  default     = "/health"
}

variable "health_check_failure_threshold" {
  type        = number
  description = "Number of consecutive health check failures before unhealthy"
  default     = 3

  validation {
    condition     = var.health_check_failure_threshold >= 1 && var.health_check_failure_threshold <= 10
    error_message = "Failure threshold must be between 1 and 10."
  }
}

variable "health_check_interval" {
  type        = number
  description = "Interval between health checks in seconds (10 or 30)"
  default     = 30

  validation {
    condition     = contains([10, 30], var.health_check_interval)
    error_message = "Health check interval must be 10 or 30 seconds."
  }
}

variable "health_check_regions" {
  type        = list(string)
  description = "AWS regions to perform health checks from (minimum 3)"
  default = [
    "us-east-1",
    "us-west-2",
    "eu-west-1"
  ]

  validation {
    condition     = length(var.health_check_regions) >= 3
    error_message = "At least 3 health check regions are required."
  }
}

variable "health_check_search_string" {
  type        = string
  description = "String to search for in response body (empty to disable)"
  default     = ""
}

variable "alarm_sns_topic_arn" {
  type        = string
  description = "SNS topic ARN for health check alarm notifications"
  default     = ""
}

# -----------------------------------------------------------------------------
# Tags
# -----------------------------------------------------------------------------

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
