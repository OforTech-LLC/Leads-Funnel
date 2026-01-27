# =============================================================================
# Lambda Worker Module Variables
# =============================================================================

variable "function_name" {
  type        = string
  description = "Lambda function name"
}

variable "description" {
  type        = string
  description = "Lambda function description"
  default     = ""
}

# -----------------------------------------------------------------------------
# Runtime Configuration
# -----------------------------------------------------------------------------
variable "runtime" {
  type        = string
  description = "Lambda runtime"
  default     = "nodejs22.x"
}

variable "handler" {
  type        = string
  description = "Lambda handler entry point"
  default     = "index.handler"
}

variable "architecture" {
  type        = string
  description = "Lambda architecture: arm64 or x86_64"
  default     = "arm64"

  validation {
    condition     = contains(["arm64", "x86_64"], var.architecture)
    error_message = "Architecture must be arm64 or x86_64."
  }
}

variable "memory_mb" {
  type        = number
  description = "Lambda memory in MB"
  default     = 256
}

variable "timeout_seconds" {
  type        = number
  description = "Lambda timeout in seconds"
  default     = 60
}

variable "reserved_concurrency" {
  type        = number
  description = "Reserved concurrent executions (null for no limit)"
  default     = null
}

# -----------------------------------------------------------------------------
# Deployment Package
# -----------------------------------------------------------------------------
variable "zip_path" {
  type        = string
  description = "Path to Lambda deployment ZIP file (empty for placeholder)"
  default     = ""
}

variable "zip_hash" {
  type        = string
  description = "Base64-encoded SHA256 hash of the deployment package"
  default     = ""
}

# -----------------------------------------------------------------------------
# Environment Variables
# -----------------------------------------------------------------------------
variable "environment_variables" {
  type        = map(string)
  description = "Environment variables for the Lambda function"
  default     = {}
}

# -----------------------------------------------------------------------------
# SQS Event Source
# -----------------------------------------------------------------------------
variable "sqs_queue_arn" {
  type        = string
  description = "ARN of SQS queue to trigger this Lambda (null to disable)"
  default     = null
}

variable "sqs_batch_size" {
  type        = number
  description = "Maximum number of SQS messages per Lambda invocation"
  default     = 10
}

variable "sqs_batching_window_seconds" {
  type        = number
  description = "Maximum batching window in seconds"
  default     = 0
}

# -----------------------------------------------------------------------------
# IAM Permissions - DynamoDB
# -----------------------------------------------------------------------------
variable "dynamodb_table_arns" {
  type        = list(string)
  description = "List of DynamoDB table ARNs the worker can access"
  default     = []
}

# -----------------------------------------------------------------------------
# IAM Permissions - SSM
# -----------------------------------------------------------------------------
variable "ssm_parameter_arns" {
  type        = list(string)
  description = "List of SSM parameter ARNs the worker can read"
  default     = []
}

# -----------------------------------------------------------------------------
# IAM Permissions - SQS Send
# -----------------------------------------------------------------------------
variable "sqs_send_queue_arns" {
  type        = list(string)
  description = "List of SQS queue ARNs the worker can send messages to"
  default     = []
}

# -----------------------------------------------------------------------------
# IAM Permissions - EventBridge
# -----------------------------------------------------------------------------
variable "event_bus_arn" {
  type        = string
  description = "EventBridge event bus ARN the worker can put events to"
  default     = null
}

# -----------------------------------------------------------------------------
# IAM Permissions - Secrets Manager
# -----------------------------------------------------------------------------
variable "secrets_arns" {
  type        = list(string)
  description = "List of Secrets Manager ARNs the worker can read"
  default     = []
}

# -----------------------------------------------------------------------------
# IAM Permissions - SES
# -----------------------------------------------------------------------------
variable "enable_ses" {
  type        = bool
  description = "Enable SES email sending permissions"
  default     = false
}

variable "ses_identity_arns" {
  type        = list(string)
  default     = ["*"]
  description = "ARNs of SES identities this worker can send from"
}

# -----------------------------------------------------------------------------
# IAM Permissions - SNS
# -----------------------------------------------------------------------------
variable "enable_sns" {
  type        = bool
  description = "Enable SNS publish permissions (for SMS)"
  default     = false
}

variable "sns_topic_arns" {
  type        = list(string)
  default     = ["*"]
  description = "ARNs of SNS topics this worker can publish to"
}

# -----------------------------------------------------------------------------
# IAM Permissions - Additional
# -----------------------------------------------------------------------------
variable "additional_policy_statements" {
  type        = list(any)
  description = "Additional IAM policy statements"
  default     = []
}

# -----------------------------------------------------------------------------
# Observability
# -----------------------------------------------------------------------------
variable "enable_xray" {
  type        = bool
  description = "Enable X-Ray tracing"
  default     = false
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention in days"
  default     = 7
}

variable "kms_key_arn" {
  type        = string
  description = "KMS key ARN for CloudWatch Logs encryption (null to skip)"
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
