# =============================================================================
# DynamoDB Module Variables
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
  description = "List of funnel IDs to create tables for"

  validation {
    condition     = length(var.funnel_ids) > 0
    error_message = "At least one funnel ID must be provided."
  }

  validation {
    condition     = alltrue([for id in var.funnel_ids : can(regex("^[a-z0-9-]+$", id))])
    error_message = "Funnel IDs must contain only lowercase letters, numbers, and hyphens."
  }
}

# -----------------------------------------------------------------------------
# Point-in-Time Recovery
# -----------------------------------------------------------------------------
variable "enable_pitr" {
  type        = bool
  description = "Enable Point-in-Time Recovery for funnel tables"
  default     = false
}

variable "enable_rate_limits_pitr" {
  type        = bool
  description = "Enable Point-in-Time Recovery for rate limits table (usually false)"
  default     = false
}

# -----------------------------------------------------------------------------
# Deletion Protection
# -----------------------------------------------------------------------------
variable "enable_deletion_protection" {
  type        = bool
  description = "Enable deletion protection for funnel tables"
  default     = false
}

# -----------------------------------------------------------------------------
# Tags
# -----------------------------------------------------------------------------
variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
