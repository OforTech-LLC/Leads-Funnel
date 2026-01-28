/**
 * Admin Module Outputs
 */

# =====================================================
# Cognito Outputs
# =====================================================

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = module.cognito.user_pool_arn
}

output "cognito_client_id" {
  description = "Cognito App Client ID"
  value       = module.cognito.web_client_id
}

output "cognito_hosted_ui_domain" {
  description = "Cognito Hosted UI domain"
  value       = module.cognito.user_pool_domain_url
}

output "cognito_issuer_url" {
  description = "Cognito JWT issuer URL"
  value       = "https://${module.cognito.user_pool_endpoint}"
}

output "cognito_admin_group_name" {
  description = "Cognito Admin group name"
  value       = module.cognito.admin_group_name
}

output "cognito_viewer_group_name" {
  description = "Cognito Viewer group name"
  value       = module.cognito.viewer_group_name
}

# =====================================================
# Exports Outputs
# =====================================================

output "exports_bucket_name" {
  description = "S3 exports bucket name"
  value       = module.exports.bucket_name
}

output "exports_bucket_arn" {
  description = "S3 exports bucket ARN"
  value       = module.exports.bucket_arn
}

output "audit_table_name" {
  description = "Audit log DynamoDB table name"
  value       = module.exports.audit_table_name
}

output "audit_table_arn" {
  description = "Audit log DynamoDB table ARN"
  value       = module.exports.audit_table_arn
}

output "export_jobs_table_name" {
  description = "Export jobs DynamoDB table name"
  value       = module.exports.export_jobs_table_name
}

output "export_jobs_table_arn" {
  description = "Export jobs DynamoDB table ARN"
  value       = module.exports.export_jobs_table_arn
}

# =====================================================
# API Outputs
# =====================================================

output "lambda_function_name" {
  description = "Admin Lambda function name"
  value       = module.api.lambda_function_name
}

output "lambda_function_arn" {
  description = "Admin Lambda function ARN"
  value       = module.api.lambda_function_arn
}

output "lambda_role_arn" {
  description = "Admin Lambda IAM role ARN"
  value       = module.api.lambda_role_arn
}

output "log_group_name" {
  description = "CloudWatch log group name"
  value       = module.api.log_group_name
}

# =====================================================
# SSM Parameter Paths (for documentation)
# =====================================================

output "ssm_parameter_path_prefix" {
  description = "SSM parameter path prefix"
  value       = module.ssm.ssm_parameter_path_prefix
}
