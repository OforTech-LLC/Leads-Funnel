# =============================================================================
# SES Module Variables
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
  description = "Root domain for SES identity"
}

variable "route53_zone_id" {
  type        = string
  description = "Route 53 zone ID for DNS records"
}

variable "notification_email" {
  type        = string
  description = "Email address for notifications (must be verified in SES sandbox)"
  default     = ""
}

variable "enable_mail_from" {
  type        = bool
  description = "Enable custom MAIL FROM domain"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
