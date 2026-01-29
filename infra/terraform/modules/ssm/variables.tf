# =============================================================================
# SSM Module Variables
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
# Funnel Configuration
# -----------------------------------------------------------------------------
variable "funnel_ids" {
  type        = list(string)
  description = "List of funnel IDs"
}

variable "funnel_metadata" {
  type = map(object({
    display_name = string
    category     = string
    active       = bool
  }))
  description = "Metadata for each funnel"
  default     = {}
}

# -----------------------------------------------------------------------------
# Feature Flags
# -----------------------------------------------------------------------------
variable "enable_voice_agent" {
  type        = bool
  description = "Enable AI voice agent functionality"
  default     = false
}

variable "enable_twilio" {
  type        = bool
  description = "Enable Twilio SMS/Voice integration"
  default     = false
}

variable "enable_elevenlabs" {
  type        = bool
  description = "Enable ElevenLabs AI voice synthesis"
  default     = false
}

variable "enable_waf" {
  type        = bool
  description = "Enable WAF protection"
  default     = false
}

variable "enable_pitr" {
  type        = bool
  description = "Enable DynamoDB Point-in-Time Recovery"
  default     = false
}

variable "enable_email_notifications" {
  type        = bool
  description = "Enable email notifications for new leads"
  default     = false
}

variable "enable_sms_notifications" {
  type        = bool
  description = "Enable SMS notifications for new leads"
  default     = false
}

variable "enable_deduplication" {
  type        = bool
  description = "Enable lead deduplication"
  default     = true
}

variable "enable_rate_limiting" {
  type        = bool
  description = "Enable rate limiting"
  default     = true
}

variable "enable_debug" {
  type        = bool
  description = "Enable debug mode"
  default     = false
}

# -----------------------------------------------------------------------------
# Runtime Configuration
# -----------------------------------------------------------------------------
variable "rate_limit_max" {
  type        = number
  description = "Maximum requests per rate limit window"
  default     = 10
}

variable "rate_limit_window_minutes" {
  type        = number
  description = "Rate limit window size in minutes"
  default     = 10
}

variable "idempotency_ttl_hours" {
  type        = number
  description = "Idempotency key TTL in hours"
  default     = 24
}

variable "api_base_url" {
  type        = string
  description = "API base URL"
  default     = ""
}

variable "quality_quarantine_threshold" {
  type        = number
  description = "Lead quality score threshold for quarantine (0-100). 0 disables quarantine."
  default     = 0
}

# -----------------------------------------------------------------------------
# Tags
# -----------------------------------------------------------------------------
variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
