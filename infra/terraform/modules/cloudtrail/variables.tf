/**
 * CloudTrail Module Variables
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

# =====================================================
# CloudTrail Configuration
# =====================================================

variable "is_multi_region_trail" {
  description = "Enable multi-region trail for all AWS regions"
  type        = bool
  default     = true
}

variable "enable_s3_data_events" {
  description = "Enable S3 data events logging (increases costs)"
  type        = bool
  default     = false
}

variable "enable_lambda_data_events" {
  description = "Enable Lambda data events logging (increases costs)"
  type        = bool
  default     = false
}

# =====================================================
# KMS Configuration
# =====================================================

variable "kms_deletion_window_days" {
  description = "KMS key deletion window in days"
  type        = number
  default     = 30

  validation {
    condition     = var.kms_deletion_window_days >= 7 && var.kms_deletion_window_days <= 30
    error_message = "KMS deletion window must be between 7 and 30 days."
  }
}

# =====================================================
# S3 Configuration
# =====================================================

variable "log_retention_days" {
  description = "Days to retain CloudTrail logs in S3 before deletion"
  type        = number
  default     = 365
}

variable "transition_to_glacier_days" {
  description = "Days before transitioning logs to Glacier"
  type        = number
  default     = 90
}

variable "enable_access_logging" {
  description = "Enable S3 access logging for the CloudTrail bucket"
  type        = bool
  default     = true
}

# =====================================================
# CloudWatch Configuration
# =====================================================

variable "enable_cloudwatch_logs" {
  description = "Enable CloudWatch Logs integration for real-time monitoring"
  type        = bool
  default     = true
}

variable "cloudwatch_log_retention_days" {
  description = "CloudWatch log group retention in days"
  type        = number
  default     = 30
}

# =====================================================
# Tags
# =====================================================

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
