# =============================================================================
# Monitoring Module Variables
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

variable "aws_region" {
  type        = string
  description = "AWS region for dashboard"
  default     = "us-east-1"
}

# -----------------------------------------------------------------------------
# Alert Configuration
# -----------------------------------------------------------------------------
variable "alert_email" {
  type        = string
  description = "Primary email address for alarm notifications"
  default     = ""
}

variable "additional_alert_emails" {
  type        = list(string)
  description = "Additional email addresses for escalation notifications"
  default     = []
}

variable "enable_sns_encryption" {
  type        = bool
  description = "Enable KMS encryption for SNS topic"
  default     = false
}

# -----------------------------------------------------------------------------
# Resource References
# -----------------------------------------------------------------------------
variable "lambda_function_name" {
  type        = string
  description = "Lambda function name for alarms"
}

variable "api_gateway_id" {
  type        = string
  description = "API Gateway ID for alarms"
}

variable "api_gateway_name" {
  type        = string
  description = "API Gateway name for dashboard display"
  default     = ""
}

variable "dynamodb_table_name" {
  type        = string
  description = "DynamoDB table name for alarms"
}

variable "sqs_queue_name" {
  type        = string
  description = "SQS queue name for alarms (empty if SQS disabled)"
  default     = ""
}

variable "sqs_dlq_name" {
  type        = string
  description = "SQS DLQ name for alarms (empty if SQS disabled)"
  default     = ""
}

# -----------------------------------------------------------------------------
# Lambda Alarm Thresholds
# -----------------------------------------------------------------------------
variable "lambda_error_threshold" {
  type        = number
  description = "Threshold for Lambda error count alarm"
  default     = 5
}

variable "lambda_error_rate_threshold" {
  type        = number
  description = "Threshold for Lambda error rate percentage (0-100)"
  default     = 1

  validation {
    condition     = var.lambda_error_rate_threshold >= 0 && var.lambda_error_rate_threshold <= 100
    error_message = "Lambda error rate threshold must be between 0 and 100."
  }
}

variable "lambda_duration_threshold" {
  type        = number
  description = "Threshold for Lambda P99 duration in seconds"
  default     = 10
}

variable "lambda_concurrent_threshold" {
  type        = number
  description = "Threshold for Lambda concurrent executions (0 to disable)"
  default     = 0
}

# -----------------------------------------------------------------------------
# API Gateway Alarm Thresholds
# -----------------------------------------------------------------------------
variable "api_5xx_threshold" {
  type        = number
  description = "Threshold for API Gateway 5xx error count"
  default     = 10
}

variable "api_4xx_threshold" {
  type        = number
  description = "Threshold for API Gateway 4xx error count"
  default     = 100
}

variable "api_error_rate_threshold" {
  type        = number
  description = "Threshold for API error rate percentage (0-100)"
  default     = 1

  validation {
    condition     = var.api_error_rate_threshold >= 0 && var.api_error_rate_threshold <= 100
    error_message = "API error rate threshold must be between 0 and 100."
  }
}

variable "api_latency_p99_threshold" {
  type        = number
  description = "Threshold for API Gateway P99 latency in milliseconds"
  default     = 3000
}

variable "api_integration_latency_threshold" {
  type        = number
  description = "Threshold for API Gateway integration latency in milliseconds"
  default     = 5000
}

# -----------------------------------------------------------------------------
# DynamoDB Alarm Thresholds
# -----------------------------------------------------------------------------
variable "enable_capacity_alarms" {
  type        = bool
  description = "Enable DynamoDB capacity utilization alarms"
  default     = false
}

variable "dynamodb_read_capacity_threshold" {
  type        = number
  description = "Threshold for DynamoDB read capacity units"
  default     = 1000
}

variable "dynamodb_write_capacity_threshold" {
  type        = number
  description = "Threshold for DynamoDB write capacity units"
  default     = 1000
}

# -----------------------------------------------------------------------------
# SQS Alarm Thresholds
# -----------------------------------------------------------------------------
variable "sqs_message_age_threshold" {
  type        = number
  description = "Threshold for SQS message age in seconds"
  default     = 3600 # 1 hour
}

variable "sqs_queue_depth_threshold" {
  type        = number
  description = "Threshold for SQS queue depth (0 to disable)"
  default     = 0
}

# -----------------------------------------------------------------------------
# Dashboard Configuration
# -----------------------------------------------------------------------------
variable "create_dashboard" {
  type        = bool
  description = "Create CloudWatch dashboard"
  default     = false
}

# -----------------------------------------------------------------------------
# Advanced Features
# -----------------------------------------------------------------------------
variable "create_composite_alarms" {
  type        = bool
  description = "Create composite alarms for critical scenarios"
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
