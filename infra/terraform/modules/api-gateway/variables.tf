# =============================================================================
# API Gateway Module Variables
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
# Lambda Functions - Lead Handler
# -----------------------------------------------------------------------------
variable "lead_handler_function_name" {
  type        = string
  description = "Lead handler Lambda function name"
}

variable "lead_handler_invoke_arn" {
  type        = string
  description = "Lead handler Lambda invoke ARN"
}

# -----------------------------------------------------------------------------
# Lambda Functions - Health Handler
# -----------------------------------------------------------------------------
variable "health_handler_function_name" {
  type        = string
  description = "Health handler Lambda function name"
}

variable "health_handler_invoke_arn" {
  type        = string
  description = "Health handler Lambda invoke ARN"
}

# -----------------------------------------------------------------------------
# Lambda Functions - Voice (Optional)
# -----------------------------------------------------------------------------
variable "enable_voice_agent" {
  type        = bool
  description = "Enable voice agent routes"
  default     = false
}

variable "voice_start_function_name" {
  type        = string
  description = "Voice start Lambda function name"
  default     = null
}

variable "voice_start_invoke_arn" {
  type        = string
  description = "Voice start Lambda invoke ARN"
  default     = null
}

variable "voice_webhook_function_name" {
  type        = string
  description = "Voice webhook Lambda function name"
  default     = null
}

variable "voice_webhook_invoke_arn" {
  type        = string
  description = "Voice webhook Lambda invoke ARN"
  default     = null
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

# -----------------------------------------------------------------------------
# Tags
# -----------------------------------------------------------------------------
variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
