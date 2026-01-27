# =============================================================================
# SQS Queue Module Variables
# =============================================================================

variable "queue_name" {
  type        = string
  description = "Name of the SQS queue"
}

# -----------------------------------------------------------------------------
# Queue Configuration
# -----------------------------------------------------------------------------
variable "visibility_timeout_seconds" {
  type        = number
  description = "Visibility timeout for the queue in seconds"
  default     = 60

  validation {
    condition     = var.visibility_timeout_seconds >= 0 && var.visibility_timeout_seconds <= 43200
    error_message = "Visibility timeout must be between 0 and 43200 seconds."
  }
}

variable "message_retention_seconds" {
  type        = number
  description = "Message retention period in seconds (default: 4 days)"
  default     = 345600 # 4 days

  validation {
    condition     = var.message_retention_seconds >= 60 && var.message_retention_seconds <= 1209600
    error_message = "Message retention must be between 60 and 1209600 seconds (14 days)."
  }
}

variable "receive_wait_time_seconds" {
  type        = number
  description = "Long polling wait time in seconds"
  default     = 20

  validation {
    condition     = var.receive_wait_time_seconds >= 0 && var.receive_wait_time_seconds <= 20
    error_message = "Receive wait time must be between 0 and 20 seconds."
  }
}

variable "delay_seconds" {
  type        = number
  description = "Delivery delay in seconds"
  default     = 0

  validation {
    condition     = var.delay_seconds >= 0 && var.delay_seconds <= 900
    error_message = "Delay must be between 0 and 900 seconds."
  }
}

variable "max_message_size" {
  type        = number
  description = "Maximum message size in bytes (default: 256KB)"
  default     = 262144

  validation {
    condition     = var.max_message_size >= 1024 && var.max_message_size <= 262144
    error_message = "Max message size must be between 1024 and 262144 bytes."
  }
}

# -----------------------------------------------------------------------------
# Dead Letter Queue Configuration
# -----------------------------------------------------------------------------
variable "max_receive_count" {
  type        = number
  description = "Maximum number of receives before message is sent to DLQ"
  default     = 3

  validation {
    condition     = var.max_receive_count >= 1
    error_message = "Max receive count must be at least 1."
  }
}

variable "dlq_retention_seconds" {
  type        = number
  description = "DLQ message retention period in seconds (default: 14 days)"
  default     = 1209600 # 14 days
}

# -----------------------------------------------------------------------------
# Queue Policy
# -----------------------------------------------------------------------------
variable "allowed_source_arns" {
  type        = list(string)
  description = "List of ARNs allowed to send messages to this queue (e.g., EventBridge rule ARNs)"
  default     = []
}

# -----------------------------------------------------------------------------
# Alarm Configuration
# -----------------------------------------------------------------------------
variable "enable_dlq_alarm" {
  type        = bool
  description = "Enable CloudWatch alarm for DLQ messages"
  default     = true
}

variable "dlq_alarm_threshold" {
  type        = number
  description = "Number of DLQ messages that triggers an alarm"
  default     = 0
}

variable "alarm_actions" {
  type        = list(string)
  description = "List of ARNs to notify when alarm triggers (e.g., SNS topic ARNs)"
  default     = []
}

# -----------------------------------------------------------------------------
# Tags
# -----------------------------------------------------------------------------
variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
