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

variable "alert_email" {
  type        = string
  description = "Email address for alarm notifications"
  default     = ""
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
# Dashboard
# -----------------------------------------------------------------------------

variable "create_dashboard" {
  type        = bool
  description = "Create CloudWatch dashboard"
  default     = false
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
