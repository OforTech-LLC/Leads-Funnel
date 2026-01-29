# =============================================================================
# Avatar Bucket Module Variables
# =============================================================================

variable "project_name" {
  type        = string
  description = "Project name used in resource naming"
}

variable "environment" {
  type        = string
  description = "Environment name (dev or prod)"
}

variable "allowed_origins" {
  type        = list(string)
  description = "Allowed CORS origins for avatar uploads"
  default     = []
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
