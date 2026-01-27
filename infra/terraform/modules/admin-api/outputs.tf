/**
 * Admin API Module Outputs
 */

output "lambda_function_name" {
  description = "Admin Lambda function name"
  value       = aws_lambda_function.admin.function_name
}

output "lambda_function_arn" {
  description = "Admin Lambda function ARN"
  value       = aws_lambda_function.admin.arn
}

output "lambda_role_arn" {
  description = "Admin Lambda IAM role ARN"
  value       = aws_iam_role.admin_lambda.arn
}

output "log_group_name" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.admin.name
}
