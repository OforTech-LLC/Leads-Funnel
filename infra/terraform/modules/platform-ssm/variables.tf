# =============================================================================
# Platform SSM Module Variables
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

# -----------------------------------------------------------------------------
# Feature Flags
# -----------------------------------------------------------------------------
variable "enable_assignment_engine" {
  type        = bool
  description = "Enable lead assignment engine"
  default     = false
}

variable "enable_portal" {
  type        = bool
  description = "Enable service provider portal"
  default     = false
}

variable "enable_multi_tenant" {
  type        = bool
  description = "Enable multi-tenant organization support"
  default     = false
}

variable "enable_auto_assignment" {
  type        = bool
  description = "Enable automatic lead assignment based on rules"
  default     = false
}

variable "enable_lead_notifications" {
  type        = bool
  description = "Enable lead assignment notifications (email/SMS)"
  default     = false
}

variable "enable_org_management" {
  type        = bool
  description = "Enable organization management features"
  default     = false
}

variable "enable_exports" {
  type        = bool
  description = "Enable data export functionality"
  default     = false
}

variable "enable_audit_logging" {
  type        = bool
  description = "Enable admin audit logging"
  default     = false
}

variable "enable_email_notifications" {
  type        = bool
  description = "Enable email notifications for platform leads"
  default     = false
}

variable "enable_sms_notifications" {
  type        = bool
  description = "Enable SMS notifications for platform leads"
  default     = false
}

variable "enable_twilio_sms" {
  type        = bool
  description = "Enable Twilio SMS integration for notifications"
  default     = false
}

variable "enable_sns_sms" {
  type        = bool
  description = "Enable SNS SMS integration for notifications"
  default     = false
}

variable "assignment_rules_json" {
  type        = string
  description = "JSON array of assignment rules for the assignment worker"
  default     = "[]"
}

variable "internal_recipients_json" {
  type        = string
  description = "JSON array of internal notification recipients"
  default     = "[]"
}

# -----------------------------------------------------------------------------
# CORS Origins
# -----------------------------------------------------------------------------
variable "admin_cors_origins" {
  type        = list(string)
  description = "Allowed CORS origins for admin app"
  default     = []
}

variable "portal_cors_origins" {
  type        = list(string)
  description = "Allowed CORS origins for portal app"
  default     = []
}

# -----------------------------------------------------------------------------
# Table Name References
# -----------------------------------------------------------------------------
variable "orgs_table_name" {
  type        = string
  description = "DynamoDB table name for organizations"
  default     = ""
}

variable "users_table_name" {
  type        = string
  description = "DynamoDB table name for users"
  default     = ""
}

variable "memberships_table_name" {
  type        = string
  description = "DynamoDB table name for memberships"
  default     = ""
}

variable "assignment_rules_table_name" {
  type        = string
  description = "DynamoDB table name for assignment rules"
  default     = ""
}

variable "unassigned_table_name" {
  type        = string
  description = "DynamoDB table name for unassigned leads"
  default     = ""
}

variable "notifications_table_name" {
  type        = string
  description = "DynamoDB table name for notifications"
  default     = ""
}

# -----------------------------------------------------------------------------
# Queue URL References
# -----------------------------------------------------------------------------
variable "assignment_queue_url" {
  type        = string
  description = "SQS queue URL for lead assignment"
  default     = ""
}

variable "notification_queue_url" {
  type        = string
  description = "SQS queue URL for notifications"
  default     = ""
}

# -----------------------------------------------------------------------------
# Cognito References
# -----------------------------------------------------------------------------
variable "admin_cognito_pool_id" {
  type        = string
  description = "Cognito User Pool ID for admin authentication"
  default     = ""
}

variable "admin_cognito_client_id" {
  type        = string
  description = "Cognito App Client ID for admin authentication"
  default     = ""
}

variable "portal_cognito_pool_id" {
  type        = string
  description = "Cognito User Pool ID for portal authentication"
  default     = ""
}

variable "portal_cognito_client_id" {
  type        = string
  description = "Cognito App Client ID for portal authentication"
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
