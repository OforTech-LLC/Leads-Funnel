# =============================================================================
# VPC Module Variables
# =============================================================================

# -----------------------------------------------------------------------------
# Core Configuration
# -----------------------------------------------------------------------------

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
# VPC Configuration
# -----------------------------------------------------------------------------

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid CIDR block."
  }
}

variable "az_count" {
  type        = number
  description = "Number of availability zones to use"
  default     = 2

  validation {
    condition     = var.az_count >= 2 && var.az_count <= 4
    error_message = "AZ count must be between 2 and 4."
  }
}

# -----------------------------------------------------------------------------
# NAT Gateway Configuration
# -----------------------------------------------------------------------------

variable "enable_nat_gateway" {
  type        = bool
  description = "Enable NAT Gateway for internet access from private subnets"
  default     = false
}

variable "single_nat_gateway" {
  type        = bool
  description = "Use a single NAT Gateway (cost optimization) vs one per AZ (high availability)"
  default     = true
}

# -----------------------------------------------------------------------------
# VPC Endpoint Configuration
# -----------------------------------------------------------------------------

variable "enable_dynamodb_endpoint" {
  type        = bool
  description = "Enable VPC Gateway Endpoint for DynamoDB (free)"
  default     = true
}

variable "enable_s3_endpoint" {
  type        = bool
  description = "Enable VPC Gateway Endpoint for S3 (free)"
  default     = true
}

variable "enable_ssm_endpoint" {
  type        = bool
  description = "Enable VPC Interface Endpoint for SSM Parameter Store (charged per hour + data)"
  default     = true
}

variable "enable_secrets_endpoint" {
  type        = bool
  description = "Enable VPC Interface Endpoint for Secrets Manager (charged per hour + data)"
  default     = true
}

variable "enable_logs_endpoint" {
  type        = bool
  description = "Enable VPC Interface Endpoint for CloudWatch Logs (charged per hour + data)"
  default     = true
}

variable "enable_events_endpoint" {
  type        = bool
  description = "Enable VPC Interface Endpoint for EventBridge (charged per hour + data)"
  default     = false
}

variable "enable_sts_endpoint" {
  type        = bool
  description = "Enable VPC Interface Endpoint for STS (charged per hour + data)"
  default     = true
}

variable "enable_kms_endpoint" {
  type        = bool
  description = "Enable VPC Interface Endpoint for KMS (charged per hour + data)"
  default     = true
}

# -----------------------------------------------------------------------------
# Flow Logs Configuration
# -----------------------------------------------------------------------------

variable "enable_flow_logs" {
  type        = bool
  description = "Enable VPC Flow Logs for network monitoring"
  default     = false
}

variable "flow_logs_retention_days" {
  type        = number
  description = "Retention period for VPC Flow Logs in CloudWatch"
  default     = 14
}

# -----------------------------------------------------------------------------
# Tags
# -----------------------------------------------------------------------------

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
