# =============================================================================
# API Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# API Gateway
# -----------------------------------------------------------------------------
output "api_id" {
  description = "API Gateway API ID"
  value       = aws_apigatewayv2_api.main.id
}

output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "api_execution_arn" {
  description = "API Gateway execution ARN"
  value       = aws_apigatewayv2_api.main.execution_arn
}

# -----------------------------------------------------------------------------
# Custom Domain
# -----------------------------------------------------------------------------
output "custom_domain_name" {
  description = "API Gateway custom domain target domain name"
  value       = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
}

output "custom_domain_zone_id" {
  description = "API Gateway custom domain hosted zone ID"
  value       = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
}

output "api_url" {
  description = "Full API URL"
  value       = var.environment == "prod" ? "https://api.${var.root_domain}" : "https://api-${var.environment}.${var.root_domain}"
}

# -----------------------------------------------------------------------------
# Lambda
# -----------------------------------------------------------------------------
output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.lead_capture.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.lead_capture.arn
}

output "lambda_role_arn" {
  description = "Lambda IAM role ARN"
  value       = aws_iam_role.lambda.arn
}

output "lambda_log_group_name" {
  description = "Lambda CloudWatch log group name"
  value       = aws_cloudwatch_log_group.lambda.name
}

output "lambda_log_group_arn" {
  description = "Lambda CloudWatch log group ARN"
  value       = aws_cloudwatch_log_group.lambda.arn
}

# -----------------------------------------------------------------------------
# API Gateway Logging
# -----------------------------------------------------------------------------
output "api_log_group_name" {
  description = "API Gateway CloudWatch log group name"
  value       = var.enable_logging ? aws_cloudwatch_log_group.api[0].name : null
}
