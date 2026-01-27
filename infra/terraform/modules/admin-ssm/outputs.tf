/**
 * Admin SSM Module Outputs
 */

output "enable_admin_console_parameter_arn" {
  description = "ARN of enable_admin_console SSM parameter"
  value       = aws_ssm_parameter.enable_admin_console.arn
}

output "enable_admin_console_parameter_name" {
  description = "Name of enable_admin_console SSM parameter"
  value       = aws_ssm_parameter.enable_admin_console.name
}

output "enable_admin_ip_allowlist_parameter_arn" {
  description = "ARN of enable_admin_ip_allowlist SSM parameter"
  value       = aws_ssm_parameter.enable_admin_ip_allowlist.arn
}

output "admin_allowed_emails_parameter_arn" {
  description = "ARN of admin_allowed_emails SSM parameter"
  value       = aws_ssm_parameter.admin_allowed_emails.arn
}

output "admin_allowed_cidrs_parameter_arn" {
  description = "ARN of admin_allowed_cidrs SSM parameter"
  value       = aws_ssm_parameter.admin_allowed_cidrs.arn
}

output "cognito_user_pool_id_parameter_arn" {
  description = "ARN of cognito_user_pool_id SSM parameter"
  value       = aws_ssm_parameter.cognito_user_pool_id.arn
}

output "cognito_client_id_parameter_arn" {
  description = "ARN of cognito_client_id SSM parameter"
  value       = aws_ssm_parameter.cognito_client_id.arn
}

output "cognito_domain_parameter_arn" {
  description = "ARN of cognito_domain SSM parameter"
  value       = aws_ssm_parameter.cognito_domain.arn
}

output "ssm_parameter_path_prefix" {
  description = "SSM parameter path prefix for this environment"
  value       = "/${var.project_name}/${var.environment}"
}
