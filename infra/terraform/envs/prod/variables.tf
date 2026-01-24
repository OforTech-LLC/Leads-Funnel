# =============================================================================
# Variables - Prod Environment
# =============================================================================

# -----------------------------------------------------------------------------
# Core Variables
# -----------------------------------------------------------------------------
variable "project_name" {
  type        = string
  default     = "kanjona-funnel"
  description = "Project name used in resource naming"
}

variable "environment" {
  type        = string
  default     = "prod"
  description = "Environment name (dev or prod)"

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be 'dev' or 'prod'."
  }
}

variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Primary AWS region for deployment"
}

variable "root_domain" {
  type        = string
  description = "Root domain for the application (e.g., kanjona.com)"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]\\.[a-z]{2,}$", var.root_domain))
    error_message = "Root domain must be a valid domain name."
  }
}

# -----------------------------------------------------------------------------
# Feature Flags
# -----------------------------------------------------------------------------
variable "enable_waf" {
  type        = bool
  default     = true
  description = "Enable WAF Web ACL for CloudFront"
}

variable "enable_cloudfront_logging" {
  type        = bool
  default     = true
  description = "Enable CloudFront access logging to S3"
}

variable "enable_api_logging" {
  type        = bool
  default     = true
  description = "Enable API Gateway access logging"
}

variable "enable_sqs" {
  type        = bool
  default     = true
  description = "Enable SQS queue for async processing"
}

variable "enable_ses" {
  type        = bool
  default     = false
  description = "Enable SES for email notifications"
}

variable "enable_xray" {
  type        = bool
  default     = true
  description = "Enable X-Ray tracing for Lambda"
}

variable "enable_alarms" {
  type        = bool
  default     = true
  description = "Enable CloudWatch alarms"
}

variable "enable_pitr" {
  type        = bool
  default     = true
  description = "Enable DynamoDB point-in-time recovery"
}

# -----------------------------------------------------------------------------
# Lambda Configuration
# -----------------------------------------------------------------------------
variable "lambda_memory_mb" {
  type        = number
  default     = 512
  description = "Lambda memory size in MB"
}

variable "lambda_reserved_concurrency" {
  type        = number
  default     = 100
  description = "Lambda reserved concurrent executions (null for no limit)"
}

# -----------------------------------------------------------------------------
# CORS Configuration
# -----------------------------------------------------------------------------
variable "additional_cors_origins" {
  type        = list(string)
  default     = []
  description = "Additional CORS origins (empty for prod - no localhost)"
}

# -----------------------------------------------------------------------------
# Notifications
# -----------------------------------------------------------------------------
variable "alert_email" {
  type        = string
  default     = ""
  description = "Email address for alarm notifications"
}

variable "notification_email" {
  type        = string
  default     = ""
  description = "Email address for lead notifications (SES)"
}

# -----------------------------------------------------------------------------
# Content Security Policy
# -----------------------------------------------------------------------------
variable "content_security_policy" {
  type        = string
  default     = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.kanjona.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
  description = "Content Security Policy header value (stricter for prod)"
}

# -----------------------------------------------------------------------------
# Basic Authentication (Password Protection)
# -----------------------------------------------------------------------------
variable "enable_basic_auth" {
  type        = bool
  default     = true
  description = "Enable HTTP Basic Auth to password-protect the site during development"
}

variable "basic_auth_username" {
  type        = string
  default     = "admin"
  description = "Username for basic authentication"
  sensitive   = true
}

variable "basic_auth_password" {
  type        = string
  default     = "admin"
  description = "Password for basic authentication"
  sensitive   = true
}
