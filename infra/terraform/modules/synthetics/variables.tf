# =============================================================================
# CloudWatch Synthetics Module Variables
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
# Canary Configuration
# -----------------------------------------------------------------------------
variable "canary_runtime_version" {
  type        = string
  description = "Runtime version for synthetics canaries"
  default     = "syn-nodejs-puppeteer-9.1"
}

variable "canary_timeout_seconds" {
  type        = number
  description = "Timeout for canary execution in seconds"
  default     = 60
}

variable "artifact_retention_days" {
  type        = number
  description = "Number of days to retain canary artifacts"
  default     = 30
}

variable "enable_xray_tracing" {
  type        = bool
  description = "Enable X-Ray tracing for canaries"
  default     = false
}

# -----------------------------------------------------------------------------
# API Health Check Canary
# -----------------------------------------------------------------------------
variable "enable_api_canary" {
  type        = bool
  description = "Enable API health check canary"
  default     = true
}

variable "api_health_endpoint" {
  type        = string
  description = "URL of the API health check endpoint"
}

variable "api_canary_schedule" {
  type        = string
  description = "Schedule expression for API canary (rate or cron)"
  default     = "rate(5 minutes)"
}

variable "api_canary_duration_threshold" {
  type        = number
  description = "Duration threshold in milliseconds for API canary alarm"
  default     = 5000
}

# -----------------------------------------------------------------------------
# Website Availability Canary
# -----------------------------------------------------------------------------
variable "enable_website_canary" {
  type        = bool
  description = "Enable website availability canary"
  default     = true
}

variable "website_url" {
  type        = string
  description = "URL of the website to monitor"
}

variable "website_canary_schedule" {
  type        = string
  description = "Schedule expression for website canary (rate or cron)"
  default     = "rate(5 minutes)"
}

variable "website_canary_duration_threshold" {
  type        = number
  description = "Duration threshold in milliseconds for website canary alarm"
  default     = 10000
}

# -----------------------------------------------------------------------------
# Alerting
# -----------------------------------------------------------------------------
variable "sns_topic_arn" {
  type        = string
  description = "SNS topic ARN for canary failure alerts"
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
