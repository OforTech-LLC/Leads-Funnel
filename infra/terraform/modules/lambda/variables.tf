# =============================================================================
# Lambda Module Variables
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
  description = "Root domain for constructing webhook URLs"
}

# -----------------------------------------------------------------------------
# Runtime Configuration
# -----------------------------------------------------------------------------
variable "runtime" {
  type        = string
  description = "Lambda runtime"
  default     = "nodejs22.x"
}

variable "app_version" {
  type        = string
  description = "Application version for health checks"
  default     = "1.0.0"
}

# -----------------------------------------------------------------------------
# Funnel Configuration
# -----------------------------------------------------------------------------
variable "funnel_ids" {
  type        = list(string)
  description = "List of all funnel IDs"
}

# -----------------------------------------------------------------------------
# Lead Handler Configuration
# -----------------------------------------------------------------------------
variable "lead_handler_zip_path" {
  type        = string
  description = "Path to lead handler Lambda ZIP file (empty for placeholder)"
  default     = ""
}

variable "lead_handler_handler" {
  type        = string
  description = "Lead handler entry point"
  default     = "index.handler"
}

variable "lead_handler_memory_mb" {
  type        = number
  description = "Lead handler memory in MB"
  default     = 256
}

variable "lead_handler_timeout" {
  type        = number
  description = "Lead handler timeout in seconds"
  default     = 30
}

variable "lead_handler_reserved_concurrency" {
  type        = number
  description = "Lead handler reserved concurrency (null for no limit)"
  default     = null
}

# -----------------------------------------------------------------------------
# Health Handler Configuration
# -----------------------------------------------------------------------------
variable "health_handler_zip_path" {
  type        = string
  description = "Path to health handler Lambda ZIP file (empty for placeholder)"
  default     = ""
}

variable "health_handler_handler" {
  type        = string
  description = "Health handler entry point"
  default     = "index.handler"
}

# -----------------------------------------------------------------------------
# Voice Handler Configuration
# -----------------------------------------------------------------------------
variable "enable_voice_agent" {
  type        = bool
  description = "Enable voice agent Lambda functions"
  default     = false
}

variable "voice_start_zip_path" {
  type        = string
  description = "Path to voice start Lambda ZIP file (empty for placeholder)"
  default     = ""
}

variable "voice_start_handler" {
  type        = string
  description = "Voice start handler entry point"
  default     = "index.handler"
}

variable "voice_webhook_zip_path" {
  type        = string
  description = "Path to voice webhook Lambda ZIP file (empty for placeholder)"
  default     = ""
}

variable "voice_webhook_handler" {
  type        = string
  description = "Voice webhook handler entry point"
  default     = "index.handler"
}

variable "voice_functions_memory_mb" {
  type        = number
  description = "Voice functions memory in MB"
  default     = 512
}

variable "voice_reserved_concurrency" {
  type        = number
  description = "Voice functions reserved concurrency (null for no limit)"
  default     = null
}

# -----------------------------------------------------------------------------
# DynamoDB Integration
# -----------------------------------------------------------------------------
variable "all_funnel_table_arns" {
  type        = list(string)
  description = "List of all funnel DynamoDB table ARNs"
}

variable "all_funnel_gsi_arns" {
  type        = list(string)
  description = "List of all funnel DynamoDB GSI ARNs"
}

variable "rate_limits_table_name" {
  type        = string
  description = "Rate limits DynamoDB table name"
}

variable "rate_limits_table_arn" {
  type        = string
  description = "Rate limits DynamoDB table ARN"
}

variable "idempotency_table_name" {
  type        = string
  description = "Idempotency DynamoDB table name"
}

variable "idempotency_table_arn" {
  type        = string
  description = "Idempotency DynamoDB table ARN"
}

# -----------------------------------------------------------------------------
# EventBridge Integration
# -----------------------------------------------------------------------------
variable "event_bus_name" {
  type        = string
  description = "EventBridge event bus name"
}

variable "event_bus_arn" {
  type        = string
  description = "EventBridge event bus ARN"
}

# -----------------------------------------------------------------------------
# Secrets Manager Integration
# -----------------------------------------------------------------------------
variable "twilio_secret_arn" {
  type        = string
  description = "ARN of Twilio credentials secret"
  default     = ""
}

variable "elevenlabs_secret_arn" {
  type        = string
  description = "ARN of ElevenLabs credentials secret"
  default     = ""
}

variable "ip_hash_salt_secret_arn" {
  type        = string
  description = "ARN of IP hash salt secret"
}

variable "webhook_secret_arn" {
  type        = string
  description = "ARN of webhook signing secret"
  default     = ""
}

# -----------------------------------------------------------------------------
# SSM Parameter Store Integration
# -----------------------------------------------------------------------------
variable "ssm_parameter_arns" {
  type        = list(string)
  description = "List of SSM parameter ARNs for IAM policy"
  default     = []
}

# -----------------------------------------------------------------------------
# Observability
# -----------------------------------------------------------------------------
variable "enable_xray" {
  type        = bool
  description = "Enable X-Ray tracing"
  default     = false
}

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
