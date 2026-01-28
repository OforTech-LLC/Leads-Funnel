# =============================================================================
# Variables - Prod Environment (Admin Console & Platform)
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
  default     = true
  description = "Enable IP allowlist restriction for admin access (recommended for prod)"
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
  description = "Comma-separated list of allowed CIDR blocks for admin access (required if IP allowlist enabled)"
  sensitive   = true
}

variable "admin_cognito_domain_prefix" {
  type        = string
  default     = "kanjona-admin"
  description = "Cognito hosted UI domain prefix for admin authentication"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.admin_cognito_domain_prefix))
    error_message = "Cognito domain prefix must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "admin_exports_bucket_name" {
  type        = string
  default     = "kanjona-admin-exports-prod"
  description = "S3 bucket name for admin exports (must be globally unique)"

  validation {
    condition     = can(regex("^[a-z0-9.-]+$", var.admin_exports_bucket_name))
    error_message = "S3 bucket name must contain only lowercase letters, numbers, dots, and hyphens."
  }
}

variable "admin_lambda_zip_path" {
  type        = string
  default     = "../../../apps/api/dist/admin-handler.zip"
  description = "Path to admin Lambda deployment package"
}

variable "admin_lambda_zip_hash" {
  type        = string
  default     = ""
  description = "Base64-encoded SHA256 hash of admin Lambda package"
}

# -----------------------------------------------------------------------------
# Platform Cognito Domains (3-sided marketplace)
# -----------------------------------------------------------------------------
variable "platform_admin_cognito_domain" {
  type        = string
  default     = "kanjona-platform-admin"
  description = "Cognito hosted UI domain prefix for platform admin pool"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.platform_admin_cognito_domain))
    error_message = "Cognito domain prefix must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "platform_portal_cognito_domain" {
  type        = string
  default     = "kanjona-platform-portal"
  description = "Cognito hosted UI domain prefix for platform portal pool"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.platform_portal_cognito_domain))
    error_message = "Cognito domain prefix must contain only lowercase letters, numbers, and hyphens."
  }
}
