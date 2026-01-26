# =============================================================================
# EventBridge Module Variables
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
variable "enable_sqs" {
  type        = bool
  description = "Enable SQS queue for async lead processing"
  default     = false
}

variable "enable_voice_agent" {
  type        = bool
  description = "Enable voice agent event rules and targets"
  default     = false
}

variable "enable_logging" {
  type        = bool
  description = "Enable CloudWatch Logs for EventBridge events"
  default     = false
}

# -----------------------------------------------------------------------------
# Lambda Integration (Optional)
# -----------------------------------------------------------------------------
variable "voice_start_lambda_arn" {
  type        = string
  description = "ARN of voice-start Lambda function for EventBridge target"
  default     = null
}

variable "voice_start_function_name" {
  type        = string
  description = "Name of voice-start Lambda function for permissions"
  default     = null
}

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------
variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention in days"
  default     = 7
}

# -----------------------------------------------------------------------------
# Tags
# -----------------------------------------------------------------------------
variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
