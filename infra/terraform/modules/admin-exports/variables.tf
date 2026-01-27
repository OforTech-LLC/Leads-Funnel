/**
 * Admin Exports Module Variables
 */

variable "project_name" {
  description = "Project name used in resource naming"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "export_retention_days" {
  description = "Number of days to retain exports in S3"
  type        = number
  default     = 14
}

variable "audit_ttl_enabled" {
  description = "Enable TTL on audit log table"
  type        = bool
  default     = true
}

variable "audit_ttl_days" {
  description = "Number of days to retain audit logs"
  type        = number
  default     = 90
}

variable "allowed_origins" {
  description = "Allowed CORS origins for S3"
  type        = list(string)
  default     = ["*"]
}

variable "enable_access_logging" {
  description = "Enable S3 access logging for the exports bucket"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
