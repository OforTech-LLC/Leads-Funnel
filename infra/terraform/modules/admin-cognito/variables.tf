/**
 * Admin Cognito Module Variables
 */

variable "project_name" {
  description = "Project name used in resource naming"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "mfa_configuration" {
  description = "MFA configuration for admin users. Must be ON for admin pools."
  type        = string
  default     = "ON"

  validation {
    condition     = contains(["OFF", "ON", "OPTIONAL"], var.mfa_configuration)
    error_message = "MFA configuration must be OFF, ON, or OPTIONAL."
  }
}

variable "admin_callback_urls" {
  description = "Callback URLs for admin OAuth flow"
  type        = list(string)
  default     = []
}

variable "admin_logout_urls" {
  description = "Logout URLs for admin OAuth flow"
  type        = list(string)
  default     = []
}

variable "enable_localhost_callbacks" {
  description = "Enable localhost callback URLs for development (ignored in prod)"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
