# =============================================================================
# WAF Module Variables
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

variable "rate_limit_requests" {
  type        = number
  description = "Number of requests allowed per 5-minute period per IP"
  default     = 500

  validation {
    condition     = var.rate_limit_requests >= 100 && var.rate_limit_requests <= 20000000
    error_message = "Rate limit must be between 100 and 20,000,000."
  }
}

variable "common_rules_excluded" {
  type        = list(string)
  description = "List of rules to exclude from Common Rule Set (set to count instead of block)"
  default     = []
}

variable "enable_logging" {
  type        = bool
  description = "Enable WAF logging to CloudWatch"
  default     = true
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention in days"
  default     = 30
}

variable "redacted_fields" {
  type        = list(string)
  description = "List of header names to redact from logs"
  default     = ["authorization", "cookie"]
}

variable "kms_key_arn" {
  type        = string
  description = "KMS key ARN for CloudWatch Logs encryption (null to skip)"
  default     = null
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
