# =============================================================================
# Platform EventBridge Module Variables
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
# EventBridge Bus
# -----------------------------------------------------------------------------
variable "event_bus_name" {
  type        = string
  description = "Name of the existing EventBridge event bus"
}

variable "event_bus_arn" {
  type        = string
  description = "ARN of the existing EventBridge event bus"
}

# -----------------------------------------------------------------------------
# SQS Queue References
# -----------------------------------------------------------------------------
variable "assignment_queue_arn" {
  type        = string
  description = "ARN of the assignment SQS queue"
}

variable "assignment_queue_url" {
  type        = string
  description = "URL of the assignment SQS queue"
}

variable "notification_queue_arn" {
  type        = string
  description = "ARN of the notification SQS queue"
}

variable "notification_queue_url" {
  type        = string
  description = "URL of the notification SQS queue"
}

# -----------------------------------------------------------------------------
# Tags
# -----------------------------------------------------------------------------
variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
