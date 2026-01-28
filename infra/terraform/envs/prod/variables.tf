# =============================================================================
# Variables - Prod Environment (Core)
# =============================================================================
# Project: kanjona
# 47-funnel lead generation platform + 3-sided marketplace
#
# Related files:
# - variables-platform.tf: Admin console, platform Cognito, exports config
# =============================================================================

# -----------------------------------------------------------------------------
# Core Variables
# -----------------------------------------------------------------------------
variable "project_name" {
  type        = string
  default     = "kanjona"
  description = "Project name used in resource naming"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "environment" {
  type        = string
  default     = "prod"
  description = "Environment name (dev, staging, or prod)"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be 'dev', 'staging', or 'prod'."
  }
}

variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Primary AWS region for deployment"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]+$", var.aws_region))
    error_message = "AWS region must be a valid region identifier (e.g., us-east-1)."
  }
}

variable "root_domain" {
  type        = string
  description = "Root domain for the application (e.g., kanjona.com)"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]\\.[a-z]{2,}$", var.root_domain))
    error_message = "Root domain must be a valid domain name."
  }
}

# -----------------------------------------------------------------------------
# Subdomain Prefixes (parameterized to avoid hardcoding)
# -----------------------------------------------------------------------------
variable "admin_subdomain" {
  type        = string
  default     = "admin"
  description = "Subdomain prefix for the admin app (e.g., 'admin' for admin.kanjona.com)"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.admin_subdomain))
    error_message = "Subdomain must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "portal_subdomain" {
  type        = string
  default     = "portal"
  description = "Subdomain prefix for the portal app (e.g., 'portal' for portal.kanjona.com)"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.portal_subdomain))
    error_message = "Subdomain must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "api_subdomain" {
  type        = string
  default     = "api"
  description = "Subdomain prefix for the API (e.g., 'api' for api.kanjona.com)"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.api_subdomain))
    error_message = "Subdomain must contain only lowercase letters, numbers, and hyphens."
  }
}

# -----------------------------------------------------------------------------
# Funnel Configuration (47 funnels)
# -----------------------------------------------------------------------------
variable "funnel_ids" {
  type        = list(string)
  description = "List of all funnel IDs for the platform"
  default = [
    "real-estate", "roofing", "cleaning", "hvac", "plumbing", "electrician",
    "pest-control", "landscaping", "pool-service", "home-remodeling", "solar",
    "pressure-washing", "locksmith", "water-damage-restoration", "mold-remediation",
    "flooring", "painting", "windows-doors", "fencing", "concrete", "moving",
    "junk-removal", "appliance-repair", "dentist", "plastic-surgeon", "orthodontist",
    "dermatology", "medspa", "chiropractic", "physical-therapy", "hair-transplant",
    "cosmetic-dentistry", "personal-injury-attorney", "immigration-attorney",
    "criminal-defense-attorney", "tax-accounting", "business-consulting",
    "life-insurance", "commercial-cleaning", "security-systems", "it-services",
    "marketing-agency", "auto-repair", "auto-detailing", "towing", "auto-glass",
    "construction"
  ]

  validation {
    condition     = length(var.funnel_ids) > 0
    error_message = "At least one funnel ID must be provided."
  }

  validation {
    condition     = alltrue([for id in var.funnel_ids : can(regex("^[a-z0-9-]+$", id))])
    error_message = "Funnel IDs must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "funnel_metadata" {
  type = map(object({
    display_name = string
    category     = string
    active       = bool
  }))
  description = "Metadata for each funnel"
  default = {
    "real-estate"               = { display_name = "Real Estate", category = "real-estate", active = true }
    "roofing"                   = { display_name = "Roofing", category = "home-services", active = true }
    "cleaning"                  = { display_name = "Cleaning", category = "home-services", active = true }
    "hvac"                      = { display_name = "HVAC", category = "home-services", active = true }
    "plumbing"                  = { display_name = "Plumbing", category = "home-services", active = true }
    "electrician"               = { display_name = "Electrician", category = "home-services", active = true }
    "pest-control"              = { display_name = "Pest Control", category = "home-services", active = true }
    "landscaping"               = { display_name = "Landscaping", category = "home-services", active = true }
    "pool-service"              = { display_name = "Pool Service", category = "home-services", active = true }
    "home-remodeling"           = { display_name = "Home Remodeling", category = "home-services", active = true }
    "solar"                     = { display_name = "Solar", category = "home-services", active = true }
    "pressure-washing"          = { display_name = "Pressure Washing", category = "home-services", active = true }
    "locksmith"                 = { display_name = "Locksmith", category = "home-maintenance", active = true }
    "water-damage-restoration"  = { display_name = "Water Damage Restoration", category = "home-maintenance", active = true }
    "mold-remediation"          = { display_name = "Mold Remediation", category = "home-maintenance", active = true }
    "flooring"                  = { display_name = "Flooring", category = "home-maintenance", active = true }
    "painting"                  = { display_name = "Painting", category = "home-maintenance", active = true }
    "windows-doors"             = { display_name = "Windows & Doors", category = "home-maintenance", active = true }
    "fencing"                   = { display_name = "Fencing", category = "home-maintenance", active = true }
    "concrete"                  = { display_name = "Concrete", category = "home-maintenance", active = true }
    "moving"                    = { display_name = "Moving", category = "moving-services", active = true }
    "junk-removal"              = { display_name = "Junk Removal", category = "moving-services", active = true }
    "appliance-repair"          = { display_name = "Appliance Repair", category = "moving-services", active = true }
    "dentist"                   = { display_name = "Dentist", category = "healthcare", active = true }
    "plastic-surgeon"           = { display_name = "Plastic Surgeon", category = "healthcare", active = true }
    "orthodontist"              = { display_name = "Orthodontist", category = "healthcare", active = true }
    "dermatology"               = { display_name = "Dermatology", category = "healthcare", active = true }
    "medspa"                    = { display_name = "MedSpa", category = "healthcare", active = true }
    "chiropractic"              = { display_name = "Chiropractic", category = "healthcare", active = true }
    "physical-therapy"          = { display_name = "Physical Therapy", category = "healthcare", active = true }
    "hair-transplant"           = { display_name = "Hair Transplant", category = "healthcare", active = true }
    "cosmetic-dentistry"        = { display_name = "Cosmetic Dentistry", category = "healthcare", active = true }
    "personal-injury-attorney"  = { display_name = "Personal Injury Attorney", category = "legal", active = true }
    "immigration-attorney"      = { display_name = "Immigration Attorney", category = "legal", active = true }
    "criminal-defense-attorney" = { display_name = "Criminal Defense Attorney", category = "legal", active = true }
    "tax-accounting"            = { display_name = "Tax & Accounting", category = "financial", active = true }
    "business-consulting"       = { display_name = "Business Consulting", category = "financial", active = true }
    "life-insurance"            = { display_name = "Life Insurance", category = "financial", active = true }
    "commercial-cleaning"       = { display_name = "Commercial Cleaning", category = "commercial", active = true }
    "security-systems"          = { display_name = "Security Systems", category = "commercial", active = true }
    "it-services"               = { display_name = "IT Services", category = "commercial", active = true }
    "marketing-agency"          = { display_name = "Marketing Agency", category = "marketing", active = true }
    "auto-repair"               = { display_name = "Auto Repair", category = "automotive", active = true }
    "auto-detailing"            = { display_name = "Auto Detailing", category = "automotive", active = true }
    "towing"                    = { display_name = "Towing", category = "automotive", active = true }
    "auto-glass"                = { display_name = "Auto Glass", category = "automotive", active = true }
    "construction"              = { display_name = "Construction", category = "construction", active = true }
  }
}

# -----------------------------------------------------------------------------
# Feature Flags
# -----------------------------------------------------------------------------
variable "enable_waf" {
  type        = bool
  default     = true
  description = "Enable WAF Web ACL for CloudFront"
}

variable "enable_cloudfront_logging" {
  type        = bool
  default     = true
  description = "Enable CloudFront access logging to S3"
}

variable "enable_api_logging" {
  type        = bool
  default     = true
  description = "Enable API Gateway access logging"
}

variable "enable_sqs" {
  type        = bool
  default     = true
  description = "Enable SQS queue for async processing"
}

variable "enable_ses" {
  type        = bool
  default     = false
  description = "Enable SES for email notifications"
}

variable "enable_xray" {
  type        = bool
  default     = true
  description = "Enable X-Ray tracing for Lambda"
}

variable "enable_alarms" {
  type        = bool
  default     = true
  description = "Enable CloudWatch alarms"
}

variable "enable_synthetics" {
  type        = bool
  default     = true
  description = "Enable CloudWatch Synthetics canary monitoring"
}

variable "enable_pitr" {
  type        = bool
  default     = true
  description = "Enable DynamoDB point-in-time recovery"
}

variable "enable_voice_agent" {
  type        = bool
  default     = false
  description = "Enable AI voice agent functionality"
}

variable "enable_twilio" {
  type        = bool
  default     = false
  description = "Enable Twilio SMS/Voice integration"
}

variable "enable_elevenlabs" {
  type        = bool
  default     = false
  description = "Enable ElevenLabs AI voice synthesis"
}

variable "enable_cloudtrail" {
  type        = bool
  default     = true
  description = "Enable CloudTrail for AWS API audit logging (recommended for production)"
}

# -----------------------------------------------------------------------------
# Platform Feature Flag (3-sided marketplace)
# -----------------------------------------------------------------------------
variable "enable_platform" {
  type        = bool
  default     = false
  description = "Enable 3-sided platform features (orgs, users, memberships, assignment, notifications, admin/portal Cognito pools, CloudFront apps)"
}

# -----------------------------------------------------------------------------
# Lambda Configuration
# -----------------------------------------------------------------------------
variable "lambda_memory_mb" {
  type        = number
  default     = 512
  description = "Lambda memory size in MB"

  validation {
    condition     = var.lambda_memory_mb >= 128 && var.lambda_memory_mb <= 10240
    error_message = "Lambda memory must be between 128 MB and 10240 MB."
  }
}

variable "lambda_reserved_concurrency" {
  type        = number
  default     = 100
  description = "Lambda reserved concurrent executions (null for no limit)"
}

# -----------------------------------------------------------------------------
# CORS Configuration
# -----------------------------------------------------------------------------
variable "additional_cors_origins" {
  type        = list(string)
  default     = []
  description = "Additional CORS origins (empty for prod - no localhost)"
}

# -----------------------------------------------------------------------------
# Notifications
# -----------------------------------------------------------------------------
variable "alert_email" {
  type        = string
  default     = ""
  description = "Email address for alarm notifications"
}

variable "notification_email" {
  type        = string
  default     = ""
  description = "Email address for lead notifications (SES)"
}

# -----------------------------------------------------------------------------
# Content Security Policy
# -----------------------------------------------------------------------------
variable "content_security_policy" {
  type        = string
  default     = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.kanjona.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
  description = "Content Security Policy header value (stricter for prod)"
}

# -----------------------------------------------------------------------------
# Basic Authentication (Password Protection)
# -----------------------------------------------------------------------------
variable "enable_basic_auth" {
  type        = bool
  default     = false
  description = "Enable HTTP Basic Auth (disable for public release)"
}

variable "basic_auth_username" {
  type        = string
  default     = ""
  description = "Username for basic authentication"
  sensitive   = true
}

variable "basic_auth_password" {
  type        = string
  default     = ""
  description = "Password for basic authentication"
  sensitive   = true
}
