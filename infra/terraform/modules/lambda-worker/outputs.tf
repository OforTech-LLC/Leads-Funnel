# =============================================================================
# Lambda Worker Module Outputs
# =============================================================================

output "function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.worker.arn
}

output "function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.worker.function_name
}

output "invoke_arn" {
  description = "Lambda function invoke ARN (for API Gateway)"
  value       = aws_lambda_function.worker.invoke_arn
}

output "role_arn" {
  description = "Lambda execution role ARN"
  value       = aws_iam_role.worker.arn
}

output "role_name" {
  description = "Lambda execution role name"
  value       = aws_iam_role.worker.name
}

output "log_group_name" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.worker.name
}

output "log_group_arn" {
  description = "CloudWatch log group ARN"
  value       = aws_cloudwatch_log_group.worker.arn
}
