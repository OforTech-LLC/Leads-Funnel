# =============================================================================
# Variables - Dev Environment (Core)
# =============================================================================
# Project: kanjona
# 47-funnel lead generation platform + 3-sided marketplace
#
# Related files:
# - variables-platform.tf: Admin console, platform Cognito, exports config
# =============================================================================

# -----------------------------------------------------------------------------
# Core Variables
# -----------------------------------------------------------------------------
variable "project_name" {
  type        = string
  default     = "kanjona"
  description = "Project name used in resource naming"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "environment" {
  type        = string
  default     = "dev"
  description = "Environment name (dev or prod)"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be 'dev', 'staging', or 'prod'."
  }
}

variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Primary AWS region for deployment"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]+$", var.aws_region))
    error_message = "AWS region must be a valid region identifier (e.g., us-east-1)."
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

# -----------------------------------------------------------------------------
# Subdomain Prefixes (parameterized to avoid hardcoding)
# -----------------------------------------------------------------------------
variable "env_subdomain" {
  type        = string
  default     = "dev"
  description = "Subdomain prefix for this environment (e.g., 'dev' for dev.kanjona.com)"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.env_subdomain))
    error_message = "Subdomain must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "admin_subdomain" {
  type        = string
  default     = "admin.dev"
  description = "Subdomain prefix for the admin app (e.g., 'admin.dev' for admin.dev.kanjona.com)"

  validation {
    condition     = can(regex("^[a-z0-9.-]+$", var.admin_subdomain))
    error_message = "Subdomain must contain only lowercase letters, numbers, hyphens, and periods."
  }
}

variable "portal_subdomain" {
  type        = string
  default     = "portal.dev"
  description = "Subdomain prefix for the portal app (e.g., 'portal.dev' for portal.dev.kanjona.com)"

  validation {
    condition     = can(regex("^[a-z0-9.-]+$", var.portal_subdomain))
    error_message = "Subdomain must contain only lowercase letters, numbers, hyphens, and periods."
  }
}

variable "api_subdomain" {
  type        = string
  default     = "api-dev"
  description = "Subdomain prefix for the API (e.g., 'api-dev' for api-dev.kanjona.com)"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.api_subdomain))
    error_message = "Subdomain must contain only lowercase letters, numbers, and hyphens."
  }
}

# -----------------------------------------------------------------------------
# Quality Scoring
# -----------------------------------------------------------------------------
variable "quality_quarantine_threshold" {
  type        = number
  default     = 0
  description = "Lead quality score threshold for quarantine (0-100). 0 disables quarantine."
}

# -----------------------------------------------------------------------------
# Funnel Configuration (47 funnels)
# -----------------------------------------------------------------------------
# -----------------------------------------------------------------------------
# Feature Flags
# -----------------------------------------------------------------------------
variable "enable_waf" {
  type        = bool
  default     = false
  description = "Enable WAF Web ACL for CloudFront"
}

variable "enable_cloudfront_logging" {
  type        = bool
  default     = false
  description = "Enable CloudFront access logging to S3"
}

variable "enable_api_logging" {
  type        = bool
  default     = false
  description = "Enable API Gateway access logging"
}

variable "enable_sqs" {
  type        = bool
  default     = false
  description = "Enable SQS queue for async processing"
}

variable "enable_ses" {
  type        = bool
  default     = false
  description = "Enable SES for email notifications"
}

variable "enable_email_mfa" {
  type        = bool
  default     = false
  description = "Enable Cognito Email MFA (requires SES)"

  validation {
    condition     = !var.enable_email_mfa || var.enable_ses
    error_message = "enable_email_mfa requires enable_ses to be true."
  }
}

variable "enable_xray" {
  type        = bool
  default     = false
  description = "Enable X-Ray tracing for Lambda"
}

variable "enable_alarms" {
  type        = bool
  default     = false
  description = "Enable CloudWatch alarms"
}

variable "enable_synthetics" {
  type        = bool
  default     = false
  description = "Enable CloudWatch Synthetics canary monitoring"
}

variable "enable_pitr" {
  type        = bool
  default     = false
  description = "Enable DynamoDB point-in-time recovery"
}

variable "enable_voice_agent" {
  type        = bool
  default     = false
  description = "Enable AI voice agent functionality"
}

variable "enable_twilio" {
  type        = bool
  default     = false
  description = "Enable Twilio SMS/Voice integration"
}

variable "enable_elevenlabs" {
  type        = bool
  default     = false
  description = "Enable ElevenLabs AI voice synthesis"
}

variable "enable_cloudtrail" {
  type        = bool
  default     = false
  description = "Enable CloudTrail for AWS API audit logging"
}

# -----------------------------------------------------------------------------
# Platform Feature Flag (3-sided marketplace)
# -----------------------------------------------------------------------------
variable "enable_platform" {
  type        = bool
  default     = false
  description = "Enable 3-sided platform features (orgs, users, memberships, assignment, notifications, admin/portal Cognito pools, CloudFront apps)"
}

# -----------------------------------------------------------------------------
# Lambda Configuration
# -----------------------------------------------------------------------------
variable "lambda_memory_mb" {
  type        = number
  default     = 256
  description = "Lambda memory size in MB"

  validation {
    condition     = var.lambda_memory_mb >= 128 && var.lambda_memory_mb <= 10240
    error_message = "Lambda memory must be between 128 MB and 10240 MB."
  }
}

variable "lambda_reserved_concurrency" {
  type        = number
  default     = null
  description = "Lambda reserved concurrent executions (null for no limit)"
}

# -----------------------------------------------------------------------------
# Lambda Deployment Packages
# -----------------------------------------------------------------------------
variable "lead_handler_zip_path" {
  type        = string
  default     = "../../../../apps/api/dist/lead-handler.zip"
  description = "Path to lead handler Lambda deployment package"
}

variable "health_handler_zip_path" {
  type        = string
  default     = "../../../../apps/api/dist/health-handler.zip"
  description = "Path to health handler Lambda deployment package"
}

# -----------------------------------------------------------------------------
# CORS Configuration
# -----------------------------------------------------------------------------
variable "additional_cors_origins" {
  type        = list(string)
  default     = ["http://localhost:3000", "http://localhost:5173"]
  description = "Additional CORS origins (e.g., localhost for development)"
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
  default     = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.kanjona.com https://*.amazonaws.com https://*.amazoncognito.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
  description = "Content Security Policy header value"
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
  description = "Username for basic authentication. Set via TF_VAR_basic_auth_username"
  sensitive   = true
  default     = ""
}

variable "basic_auth_password" {
  type        = string
  description = "Password for basic authentication. Set via TF_VAR_basic_auth_password"
  sensitive   = true
  default     = ""

  validation {
    condition     = var.basic_auth_password == "" || length(var.basic_auth_password) >= 12
    error_message = "basic_auth_password must be at least 12 characters."
  }
}
