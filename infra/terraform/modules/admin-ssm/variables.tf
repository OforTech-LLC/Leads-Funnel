/**
 * Admin SSM Module Variables
 */

variable "project_name" {
  description = "Project name used in resource naming"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "enable_admin_console" {
  description = "Enable admin console feature flag"
  type        = bool
  default     = false
}

variable "enable_admin_ip_allowlist" {
  description = "Enable IP allowlist for admin access"
  type        = bool
  default     = false
}

variable "admin_allowed_emails" {
  description = "Comma-separated list of allowed admin emails"
  type        = string
  default     = ""
  sensitive   = true
}

variable "admin_allowed_cidrs" {
  description = "Comma-separated list of allowed CIDR blocks"
  type        = string
  default     = "0.0.0.0/0"
  sensitive   = true
}

variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  type        = string
}

variable "cognito_client_id" {
  description = "Cognito App Client ID"
  type        = string
}

variable "cognito_domain" {
  description = "Cognito Hosted UI domain URL"
  type        = string
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
