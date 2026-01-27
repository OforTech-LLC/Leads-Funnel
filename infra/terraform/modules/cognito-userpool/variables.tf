# =============================================================================
# Cognito User Pool Module Variables
# =============================================================================

variable "pool_name" {
  type        = string
  description = "Name of the Cognito User Pool"
}

variable "domain_prefix" {
  type        = string
  description = "Cognito hosted UI domain prefix (must be globally unique)"
}

# -----------------------------------------------------------------------------
# Username & Verification
# -----------------------------------------------------------------------------
variable "username_attributes" {
  type        = list(string)
  description = "Attributes that can be used as username"
  default     = ["email"]
}

variable "auto_verified_attributes" {
  type        = list(string)
  description = "Attributes to auto-verify"
  default     = ["email"]
}

# -----------------------------------------------------------------------------
# Password Policy
# -----------------------------------------------------------------------------
variable "password_minimum_length" {
  type        = number
  description = "Minimum password length"
  default     = 12
}

variable "password_require_lowercase" {
  type        = bool
  description = "Require lowercase characters"
  default     = true
}

variable "password_require_uppercase" {
  type        = bool
  description = "Require uppercase characters"
  default     = true
}

variable "password_require_numbers" {
  type        = bool
  description = "Require numbers"
  default     = true
}

variable "password_require_symbols" {
  type        = bool
  description = "Require symbols"
  default     = true
}

variable "temporary_password_validity_days" {
  type        = number
  description = "Number of days a temporary password is valid"
  default     = 7
}

# -----------------------------------------------------------------------------
# MFA Configuration
# -----------------------------------------------------------------------------
variable "mfa_configuration" {
  type        = string
  description = "MFA configuration: OFF, ON, or OPTIONAL"
  default     = "OPTIONAL"

  validation {
    condition     = contains(["OFF", "ON", "OPTIONAL"], var.mfa_configuration)
    error_message = "MFA configuration must be OFF, ON, or OPTIONAL."
  }
}

# -----------------------------------------------------------------------------
# Security
# -----------------------------------------------------------------------------
variable "advanced_security_mode" {
  type        = string
  description = "Advanced security mode: OFF, AUDIT, or ENFORCED"
  default     = "AUDIT"

  validation {
    condition     = contains(["OFF", "AUDIT", "ENFORCED"], var.advanced_security_mode)
    error_message = "Advanced security mode must be OFF, AUDIT, or ENFORCED."
  }
}

variable "challenge_on_new_device" {
  type        = bool
  description = "Require challenge when signing in from a new device"
  default     = true
}

# -----------------------------------------------------------------------------
# Email Configuration
# -----------------------------------------------------------------------------
variable "ses_email_arn" {
  type        = string
  description = "SES verified email ARN for sending emails (null for Cognito default)"
  default     = null
}

variable "from_email_address" {
  type        = string
  description = "From email address for Cognito emails"
  default     = null
}

# -----------------------------------------------------------------------------
# Custom Attributes
# -----------------------------------------------------------------------------
variable "custom_attributes" {
  type = list(object({
    name                = string
    attribute_data_type = string
    required            = optional(bool, false)
    mutable             = optional(bool, true)
    min_length          = optional(number, 1)
    max_length          = optional(number, 256)
    min_value           = optional(number)
    max_value           = optional(number)
  }))
  description = "List of custom schema attributes"
  default     = []
}

# -----------------------------------------------------------------------------
# Admin Settings
# -----------------------------------------------------------------------------
variable "allow_admin_create_user_only" {
  type        = bool
  description = "Only allow admin to create users (no self-registration)"
  default     = true
}

variable "invite_email_subject" {
  type        = string
  description = "Email subject for invite messages"
  default     = "Your account has been created"
}

variable "invite_email_message" {
  type        = string
  description = "Email body for invite messages"
  default     = "Your account has been created. Username: {username}, Temporary password: {####}. Please log in and change your password."
}

# -----------------------------------------------------------------------------
# OAuth & Client Configuration
# -----------------------------------------------------------------------------
variable "allowed_oauth_flows" {
  type        = list(string)
  description = "Allowed OAuth flows"
  default     = ["code"]
}

variable "allowed_oauth_scopes" {
  type        = list(string)
  description = "Allowed OAuth scopes"
  default     = ["email", "openid", "profile"]
}

variable "supported_identity_providers" {
  type        = list(string)
  description = "Supported identity providers"
  default     = ["COGNITO"]
}

variable "callback_urls" {
  type        = list(string)
  description = "OAuth callback URLs"
}

variable "logout_urls" {
  type        = list(string)
  description = "OAuth logout URLs"
}

variable "explicit_auth_flows" {
  type        = list(string)
  description = "Explicit auth flows for the client"
  default     = ["ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_SRP_AUTH"]
}

variable "read_attributes" {
  type        = list(string)
  description = "Readable user attributes"
  default     = ["email", "email_verified"]
}

variable "write_attributes" {
  type        = list(string)
  description = "Writable user attributes"
  default     = ["email"]
}

variable "generate_client_secret" {
  type        = bool
  description = "Generate a client secret"
  default     = false
}

# -----------------------------------------------------------------------------
# Token Validity
# -----------------------------------------------------------------------------
variable "access_token_validity" {
  type        = number
  description = "Access token validity in hours"
  default     = 1
}

variable "id_token_validity" {
  type        = number
  description = "ID token validity in hours"
  default     = 1
}

variable "refresh_token_validity" {
  type        = number
  description = "Refresh token validity in days"
  default     = 30
}

# -----------------------------------------------------------------------------
# User Groups (RBAC)
# -----------------------------------------------------------------------------
variable "user_groups" {
  type = list(object({
    name        = string
    description = string
    precedence  = number
  }))
  description = "List of user groups to create"
  default     = []
}

# -----------------------------------------------------------------------------
# Lambda Triggers
# -----------------------------------------------------------------------------
variable "pre_token_generation_lambda_arn" {
  type        = string
  description = "ARN of Lambda function for pre-token generation trigger"
  default     = null
}

variable "pre_token_generation_lambda_name" {
  type        = string
  description = "Name of Lambda function for pre-token generation trigger (for permissions)"
  default     = null
}

# -----------------------------------------------------------------------------
# Tags
# -----------------------------------------------------------------------------
variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
