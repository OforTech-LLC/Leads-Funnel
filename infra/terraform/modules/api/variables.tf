# =============================================================================
# API Module Variables
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
  description = "Root domain for the application (e.g., kanjona.com)"
}

variable "acm_certificate_arn" {
  type        = string
  description = "ARN of ACM certificate for HTTPS"
}

# -----------------------------------------------------------------------------
# CORS Configuration
# -----------------------------------------------------------------------------
variable "cors_allowed_origins" {
  type        = list(string)
  description = "List of allowed origins for CORS"
}

# -----------------------------------------------------------------------------
# Throttling
# -----------------------------------------------------------------------------
variable "throttling_rate_limit" {
  type        = number
  description = "API Gateway rate limit (requests per second)"
  default     = 100
}

variable "throttling_burst_limit" {
  type        = number
  description = "API Gateway burst limit"
  default     = 200
}

# -----------------------------------------------------------------------------
# Lambda Configuration
# -----------------------------------------------------------------------------
variable "lambda_memory_mb" {
  type        = number
  description = "Lambda memory size in MB"
  default     = 256

  validation {
    condition     = var.lambda_memory_mb >= 128 && var.lambda_memory_mb <= 10240
    error_message = "Lambda memory must be between 128 and 10240 MB."
  }
}

variable "lambda_reserved_concurrency" {
  type        = number
  description = "Lambda reserved concurrent executions (null for no limit)"
  default     = null
}

variable "enable_xray" {
  type        = bool
  description = "Enable X-Ray tracing"
  default     = false
}

# -----------------------------------------------------------------------------
# DynamoDB Integration
# -----------------------------------------------------------------------------
variable "dynamodb_table_name" {
  type        = string
  description = "DynamoDB table name for storing leads"
}

variable "dynamodb_table_arn" {
  type        = string
  description = "DynamoDB table ARN for IAM policy"
}

# -----------------------------------------------------------------------------
# EventBridge Integration
# -----------------------------------------------------------------------------
variable "event_bus_name" {
  type        = string
  description = "EventBridge event bus name"
  default     = "default"
}

variable "event_bus_arn" {
  type        = string
  description = "EventBridge event bus ARN for IAM policy"
}

# -----------------------------------------------------------------------------
# Rate Limiting and Security
# -----------------------------------------------------------------------------
variable "rate_limit_max" {
  type        = number
  description = "Maximum requests per rate limit window"
  default     = 10
}

variable "rate_limit_window_min" {
  type        = number
  description = "Rate limit window size in minutes"
  default     = 10
}

variable "idempotency_ttl_hours" {
  type        = number
  description = "Idempotency record TTL in hours"
  default     = 24
}

variable "ip_hash_salt" {
  type        = string
  description = "Salt for IP address hashing (for privacy)"
  default     = ""
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------
variable "enable_logging" {
  type        = bool
  description = "Enable API Gateway access logging"
  default     = false
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention in days"
  default     = 7
}

variable "kms_key_arn" {
  type        = string
  description = "KMS key ARN for CloudWatch Logs encryption (null to skip)"
  default     = null
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
