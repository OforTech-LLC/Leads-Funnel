/**
 * Admin Module Variables
 */

# =====================================================
# Core Configuration
# =====================================================

variable "project_name" {
  description = "Project name used in resource naming"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

# =====================================================
# Feature Flags (CRITICAL - OFF by default)
# =====================================================

variable "enable_admin_console" {
  description = "Enable admin console feature flag. MUST be explicitly set to true."
  type        = bool
  default     = false
}

variable "enable_admin_ip_allowlist" {
  description = "Enable IP allowlist for admin access"
  type        = bool
  default     = false
}

variable "enable_cloudtrail" {
  description = "Enable CloudTrail for AWS API audit logging"
  type        = bool
  default     = false
}

# =====================================================
# Admin Access Configuration
# =====================================================

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

# =====================================================
# Cognito Configuration
# =====================================================

variable "use_existing_cognito" {
  description = "Reuse an existing Cognito user pool instead of creating a new one"
  type        = bool
  default     = false
}

variable "existing_cognito_user_pool_id" {
  description = "Existing Cognito User Pool ID (required when use_existing_cognito is true)"
  type        = string
  default     = ""

  validation {
    condition     = !var.use_existing_cognito || var.existing_cognito_user_pool_id != ""
    error_message = "existing_cognito_user_pool_id is required when use_existing_cognito is true."
  }
}

variable "existing_cognito_user_pool_arn" {
  description = "Existing Cognito User Pool ARN (optional)"
  type        = string
  default     = ""
}

variable "existing_cognito_client_id" {
  description = "Existing Cognito App Client ID (required when use_existing_cognito is true)"
  type        = string
  default     = ""

  validation {
    condition     = !var.use_existing_cognito || var.existing_cognito_client_id != ""
    error_message = "existing_cognito_client_id is required when use_existing_cognito is true."
  }
}

variable "existing_cognito_domain" {
  description = "Existing Cognito Hosted UI domain URL (required when use_existing_cognito is true)"
  type        = string
  default     = ""

  validation {
    condition     = !var.use_existing_cognito || var.existing_cognito_domain != ""
    error_message = "existing_cognito_domain is required when use_existing_cognito is true."
  }
}

variable "existing_cognito_admin_group_name" {
  description = "Existing Cognito admin group name (optional)"
  type        = string
  default     = ""
}

variable "existing_cognito_viewer_group_name" {
  description = "Existing Cognito viewer group name (optional)"
  type        = string
  default     = ""
}

variable "admin_console_callback_urls" {
  description = "OAuth callback URLs for admin console"
  type        = list(string)
}

variable "admin_console_logout_urls" {
  description = "OAuth logout URLs for admin console"
  type        = list(string)
}

variable "cognito_domain_prefix" {
  description = "Cognito hosted UI domain prefix"
  type        = string
}

variable "mfa_configuration" {
  description = "MFA configuration (OFF, ON, OPTIONAL)"
  type        = string
  default     = "ON"

  validation {
    condition     = contains(["OFF", "ON", "OPTIONAL"], var.mfa_configuration)
    error_message = "MFA configuration must be OFF, ON, or OPTIONAL."
  }
}

variable "enable_localhost_callbacks" {
  description = "Enable localhost callback URLs for development (ignored in prod)"
  type        = bool
  default     = true
}

# =====================================================
# Exports Configuration
# =====================================================

variable "exports_bucket_name" {
  description = "S3 bucket name for exports (must be globally unique)"
  type        = string
}

variable "exports_retention_days" {
  description = "Days to retain export files before deletion"
  type        = number
  default     = 7
}

variable "enable_bucket_versioning" {
  description = "Enable S3 bucket versioning"
  type        = bool
  default     = false
}

variable "enable_access_logging" {
  description = "Enable S3 access logging for exports bucket"
  type        = bool
  default     = true
}

# =====================================================
# Lambda Configuration
# =====================================================

variable "lambda_zip_path" {
  description = "Path to Lambda deployment package"
  type        = string
}

variable "lambda_zip_hash" {
  description = "Base64-encoded SHA256 hash of Lambda package"
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "xray_enabled" {
  description = "Enable X-Ray tracing"
  type        = bool
  default     = false
}

# =====================================================
# API Gateway Configuration
# =====================================================

variable "api_gateway_id" {
  description = "API Gateway ID to add admin routes"
  type        = string
}

variable "api_gateway_execution_arn" {
  description = "API Gateway execution ARN"
  type        = string
}

# =====================================================
# Platform Table Configuration
# =====================================================

variable "platform_orgs_table_name" {
  description = "DynamoDB orgs table name for platform admin"
  type        = string
  default     = ""
}

variable "platform_users_table_name" {
  description = "DynamoDB users table name for platform admin"
  type        = string
  default     = ""
}

variable "platform_memberships_table_name" {
  description = "DynamoDB memberships table name for platform admin"
  type        = string
  default     = ""
}

variable "platform_assignment_rules_table_name" {
  description = "DynamoDB assignment rules table name for platform admin"
  type        = string
  default     = ""
}

variable "platform_leads_table_name" {
  description = "DynamoDB leads table name for platform admin"
  type        = string
  default     = ""
}

variable "platform_notifications_table_name" {
  description = "DynamoDB notifications table name for platform admin"
  type        = string
  default     = ""
}

variable "platform_unassigned_table_name" {
  description = "DynamoDB unassigned table name for platform admin"
  type        = string
  default     = ""
}

# =====================================================
# Data Retention & Protection
# =====================================================

variable "audit_log_retention_days" {
  description = "Days to retain audit log records"
  type        = number
  default     = 365
}

variable "enable_audit_pitr" {
  description = "Enable Point-in-Time Recovery for audit table"
  type        = bool
  default     = true
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for DynamoDB tables"
  type        = bool
  default     = false
}

# =====================================================
# CloudTrail Configuration
# =====================================================

variable "cloudtrail_multi_region" {
  description = "Enable multi-region CloudTrail trail"
  type        = bool
  default     = true
}

variable "cloudtrail_enable_cloudwatch" {
  description = "Enable CloudWatch Logs integration for CloudTrail"
  type        = bool
  default     = true
}

variable "cloudtrail_s3_data_events" {
  description = "Enable S3 data events logging (increases costs)"
  type        = bool
  default     = false
}

variable "cloudtrail_lambda_data_events" {
  description = "Enable Lambda data events logging (increases costs)"
  type        = bool
  default     = false
}

variable "cloudtrail_log_retention_days" {
  description = "Days to retain CloudTrail logs in S3"
  type        = number
  default     = 365
}

# =====================================================
# Tags
# =====================================================

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
