# =============================================================================
# Variables - Dev Environment (Admin Console & Platform)
# =============================================================================
# This file contains:
# - Admin console configuration (feature flag, IP allowlist, exports)
# - Admin Cognito domain prefix
# - Admin Lambda deployment settings
# - Platform Cognito domain prefixes (3-sided marketplace)
#
# Related files:
# - variables.tf: Core variables, feature flags, funnel config
# =============================================================================

# -----------------------------------------------------------------------------
# Admin Console Configuration (DISABLED by default)
# -----------------------------------------------------------------------------
variable "enable_admin_console" {
  type        = bool
  default     = false
  description = "Enable admin console feature. MUST be explicitly enabled."
}

variable "enable_admin_ip_allowlist" {
  type        = bool
  default     = false
  description = "Enable IP allowlist restriction for admin access"
}

variable "admin_allowed_emails" {
  type        = string
  default     = ""
  description = "Comma-separated list of allowed admin email addresses"
  sensitive   = true
}

variable "admin_allowed_cidrs" {
  type        = string
  default     = ""
  description = "Comma-separated CIDR blocks for admin access. Must be explicitly configured."
  sensitive   = true

  validation {
    condition     = var.admin_allowed_cidrs != "0.0.0.0/0"
    error_message = "admin_allowed_cidrs cannot be 0.0.0.0/0 - this provides no restriction."
  }
}

variable "admin_cognito_domain_prefix" {
  type        = string
  default     = "kanjona-admin-dev"
  description = "Cognito hosted UI domain prefix for admin authentication"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.admin_cognito_domain_prefix))
    error_message = "Cognito domain prefix must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "admin_exports_bucket_name" {
  type        = string
  default     = "kanjona-admin-exports-dev"
  description = "S3 bucket name for admin exports (must be globally unique)"

  validation {
    condition     = can(regex("^[a-z0-9.-]+$", var.admin_exports_bucket_name))
    error_message = "S3 bucket name must contain only lowercase letters, numbers, dots, and hyphens."
  }
}

variable "admin_lambda_zip_path" {
  type        = string
  default     = "../../../../apps/api/dist/admin-handler.zip"
  description = "Path to admin Lambda deployment package"
}

variable "admin_lambda_zip_hash" {
  type        = string
  default     = ""
  description = "Base64-encoded SHA256 hash of admin Lambda package"
}

# -----------------------------------------------------------------------------
# Platform Worker Lambda Packages
# -----------------------------------------------------------------------------
variable "assignment_worker_zip_path" {
  type        = string
  default     = "../../../../apps/api/dist/assignment-worker.zip"
  description = "Path to assignment worker Lambda deployment package"
}

variable "notification_worker_zip_path" {
  type        = string
  default     = "../../../../apps/api/dist/notification-worker.zip"
  description = "Path to notification worker Lambda deployment package"
}

variable "pre_token_admin_zip_path" {
  type        = string
  default     = "../../../../apps/api/dist/pre-token-admin.zip"
  description = "Path to admin pre-token Lambda deployment package"
}

variable "pre_token_portal_zip_path" {
  type        = string
  default     = "../../../../apps/api/dist/pre-token-portal.zip"
  description = "Path to portal pre-token Lambda deployment package"
}

# -----------------------------------------------------------------------------
# Platform Cognito Domains (3-sided marketplace)
# -----------------------------------------------------------------------------
variable "platform_admin_cognito_domain" {
  type        = string
  default     = "kanjona-platform-admin-dev"
  description = "Cognito hosted UI domain prefix for platform admin pool"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.platform_admin_cognito_domain))
    error_message = "Cognito domain prefix must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "platform_portal_cognito_domain" {
  type        = string
  default     = "kanjona-platform-portal-dev"
  description = "Cognito hosted UI domain prefix for platform portal pool"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.platform_portal_cognito_domain))
    error_message = "Cognito domain prefix must contain only lowercase letters, numbers, and hyphens."
  }
}
