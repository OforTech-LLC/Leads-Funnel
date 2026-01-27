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

# -----------------------------------------------------------------------------
# Bounce/Complaint Handling
# -----------------------------------------------------------------------------

variable "enable_bounce_handling" {
  type        = bool
  description = "Enable SNS topics for bounce and complaint handling"
  default     = true
}

variable "enable_delivery_notifications" {
  type        = bool
  description = "Enable delivery notifications (can be high volume)"
  default     = false
}

variable "include_original_headers" {
  type        = bool
  description = "Include original email headers in bounce/complaint notifications"
  default     = true
}

variable "bounce_notification_email" {
  type        = string
  description = "Email address to receive bounce/complaint notifications"
  default     = ""
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms
# -----------------------------------------------------------------------------

variable "enable_bounce_alarm" {
  type        = bool
  description = "Enable CloudWatch alarms for bounce/complaint rates"
  default     = true
}

variable "bounce_rate_threshold" {
  type        = number
  description = "Bounce rate threshold for alarm (0.05 = 5%)"
  default     = 0.05

  validation {
    condition     = var.bounce_rate_threshold >= 0 && var.bounce_rate_threshold <= 1
    error_message = "Bounce rate threshold must be between 0 and 1."
  }
}

variable "complaint_rate_threshold" {
  type        = number
  description = "Complaint rate threshold for alarm (0.001 = 0.1%)"
  default     = 0.001

  validation {
    condition     = var.complaint_rate_threshold >= 0 && var.complaint_rate_threshold <= 1
    error_message = "Complaint rate threshold must be between 0 and 1."
  }
}

variable "alarm_sns_topic_arn" {
  type        = string
  description = "SNS topic ARN for alarm notifications"
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
