/**
 * Admin API Module Variables
 */

variable "project_name" {
  description = "Project name used in resource naming"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "lambda_zip_path" {
  description = "Path to Lambda deployment package"
  type        = string
}

variable "lambda_zip_hash" {
  description = "Base64-encoded SHA256 hash of Lambda package"
  type        = string
}

variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID for authentication"
  type        = string
}

variable "cognito_client_id" {
  description = "Cognito App Client ID"
  type        = string
}

variable "cognito_issuer" {
  description = "Cognito JWT issuer URL"
  type        = string
}

variable "exports_bucket_name" {
  description = "S3 bucket name for exports"
  type        = string
}

variable "exports_bucket_arn" {
  description = "S3 bucket ARN for exports"
  type        = string
}

variable "audit_table_name" {
  description = "DynamoDB audit table name"
  type        = string
}

variable "audit_table_arn" {
  description = "DynamoDB audit table ARN"
  type        = string
}

variable "export_jobs_table_name" {
  description = "DynamoDB export jobs table name"
  type        = string
}

variable "export_jobs_table_arn" {
  description = "DynamoDB export jobs table ARN"
  type        = string
}

variable "platform_orgs_table_name" {
  description = "DynamoDB orgs table name"
  type        = string
  default     = ""
}

variable "platform_users_table_name" {
  description = "DynamoDB users table name"
  type        = string
  default     = ""
}

variable "platform_memberships_table_name" {
  description = "DynamoDB memberships table name"
  type        = string
  default     = ""
}

variable "platform_assignment_rules_table_name" {
  description = "DynamoDB assignment rules table name"
  type        = string
  default     = ""
}

variable "platform_leads_table_name" {
  description = "DynamoDB leads table name"
  type        = string
  default     = ""
}

variable "platform_notifications_table_name" {
  description = "DynamoDB notifications table name"
  type        = string
  default     = ""
}

variable "platform_unassigned_table_name" {
  description = "DynamoDB unassigned table name"
  type        = string
  default     = ""
}

variable "api_gateway_id" {
  description = "API Gateway ID to add admin routes"
  type        = string
}

variable "api_gateway_execution_arn" {
  description = "API Gateway execution ARN"
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "xray_enabled" {
  description = "Enable X-Ray tracing"
  type        = bool
  default     = false
}

variable "admin_cognito_client_id" {
  description = "Cognito App Client ID for admin JWT authorizer"
  type        = string
  default     = ""
}

variable "admin_cognito_pool_id" {
  description = "Cognito User Pool ID for admin JWT authorizer"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
