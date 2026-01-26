# =============================================================================
# Secrets Module Variables
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
# Twilio Configuration (Optional - use placeholders if not provided)
# -----------------------------------------------------------------------------
variable "twilio_account_sid" {
  type        = string
  description = "Twilio Account SID"
  default     = ""
  sensitive   = true
}

variable "twilio_auth_token" {
  type        = string
  description = "Twilio Auth Token"
  default     = ""
  sensitive   = true
}

variable "twilio_phone_number" {
  type        = string
  description = "Twilio phone number for outbound calls"
  default     = ""
  sensitive   = true
}

variable "twilio_api_key_sid" {
  type        = string
  description = "Twilio API Key SID"
  default     = ""
  sensitive   = true
}

variable "twilio_api_key_secret" {
  type        = string
  description = "Twilio API Key Secret"
  default     = ""
  sensitive   = true
}

# -----------------------------------------------------------------------------
# ElevenLabs Configuration (Optional - use placeholders if not provided)
# -----------------------------------------------------------------------------
variable "elevenlabs_api_key" {
  type        = string
  description = "ElevenLabs API Key"
  default     = ""
  sensitive   = true
}

variable "elevenlabs_voice_id" {
  type        = string
  description = "ElevenLabs Voice ID"
  default     = ""
}

variable "elevenlabs_model_id" {
  type        = string
  description = "ElevenLabs Model ID"
  default     = ""
}

# -----------------------------------------------------------------------------
# Security Configuration
# -----------------------------------------------------------------------------
variable "ip_hash_salt" {
  type        = string
  description = "Salt for IP address hashing (auto-generated if not provided)"
  default     = ""
  sensitive   = true
}

variable "webhook_secret" {
  type        = string
  description = "Secret for webhook signing (auto-generated if not provided)"
  default     = ""
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Tags
# -----------------------------------------------------------------------------
variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
