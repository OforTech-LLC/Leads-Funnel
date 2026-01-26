# =============================================================================
# Lambda Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# Lead Handler
# -----------------------------------------------------------------------------
output "lead_handler_function_name" {
  description = "Lead handler Lambda function name"
  value       = aws_lambda_function.lead_handler.function_name
}

output "lead_handler_function_arn" {
  description = "Lead handler Lambda function ARN"
  value       = aws_lambda_function.lead_handler.arn
}

output "lead_handler_invoke_arn" {
  description = "Lead handler Lambda invoke ARN (for API Gateway)"
  value       = aws_lambda_function.lead_handler.invoke_arn
}

output "lead_handler_role_arn" {
  description = "Lead handler Lambda IAM role ARN"
  value       = aws_iam_role.lead_handler.arn
}

output "lead_handler_log_group_name" {
  description = "Lead handler CloudWatch log group name"
  value       = aws_cloudwatch_log_group.lead_handler.name
}

output "lead_handler_log_group_arn" {
  description = "Lead handler CloudWatch log group ARN"
  value       = aws_cloudwatch_log_group.lead_handler.arn
}

# -----------------------------------------------------------------------------
# Health Handler
# -----------------------------------------------------------------------------
output "health_handler_function_name" {
  description = "Health handler Lambda function name"
  value       = aws_lambda_function.health_handler.function_name
}

output "health_handler_function_arn" {
  description = "Health handler Lambda function ARN"
  value       = aws_lambda_function.health_handler.arn
}

output "health_handler_invoke_arn" {
  description = "Health handler Lambda invoke ARN (for API Gateway)"
  value       = aws_lambda_function.health_handler.invoke_arn
}

output "health_handler_log_group_name" {
  description = "Health handler CloudWatch log group name"
  value       = aws_cloudwatch_log_group.health_handler.name
}

# -----------------------------------------------------------------------------
# Voice Start
# -----------------------------------------------------------------------------
output "voice_start_function_name" {
  description = "Voice start Lambda function name"
  value       = var.enable_voice_agent ? aws_lambda_function.voice_start[0].function_name : null
}

output "voice_start_function_arn" {
  description = "Voice start Lambda function ARN"
  value       = var.enable_voice_agent ? aws_lambda_function.voice_start[0].arn : null
}

output "voice_start_invoke_arn" {
  description = "Voice start Lambda invoke ARN"
  value       = var.enable_voice_agent ? aws_lambda_function.voice_start[0].invoke_arn : null
}

output "voice_start_log_group_name" {
  description = "Voice start CloudWatch log group name"
  value       = var.enable_voice_agent ? aws_cloudwatch_log_group.voice_start[0].name : null
}

# -----------------------------------------------------------------------------
# Voice Webhook
# -----------------------------------------------------------------------------
output "voice_webhook_function_name" {
  description = "Voice webhook Lambda function name"
  value       = var.enable_voice_agent ? aws_lambda_function.voice_webhook[0].function_name : null
}

output "voice_webhook_function_arn" {
  description = "Voice webhook Lambda function ARN"
  value       = var.enable_voice_agent ? aws_lambda_function.voice_webhook[0].arn : null
}

output "voice_webhook_invoke_arn" {
  description = "Voice webhook Lambda invoke ARN (for API Gateway)"
  value       = var.enable_voice_agent ? aws_lambda_function.voice_webhook[0].invoke_arn : null
}

output "voice_webhook_log_group_name" {
  description = "Voice webhook CloudWatch log group name"
  value       = var.enable_voice_agent ? aws_cloudwatch_log_group.voice_webhook[0].name : null
}

# -----------------------------------------------------------------------------
# IAM Roles
# -----------------------------------------------------------------------------
output "voice_handler_role_arn" {
  description = "Voice handler Lambda IAM role ARN"
  value       = var.enable_voice_agent ? aws_iam_role.voice_handler[0].arn : null
}

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
output "function_names" {
  description = "Map of function names"
  value = {
    lead_handler   = aws_lambda_function.lead_handler.function_name
    health_handler = aws_lambda_function.health_handler.function_name
    voice_start    = var.enable_voice_agent ? aws_lambda_function.voice_start[0].function_name : null
    voice_webhook  = var.enable_voice_agent ? aws_lambda_function.voice_webhook[0].function_name : null
  }
}

output "function_arns" {
  description = "Map of function ARNs"
  value = {
    lead_handler   = aws_lambda_function.lead_handler.arn
    health_handler = aws_lambda_function.health_handler.arn
    voice_start    = var.enable_voice_agent ? aws_lambda_function.voice_start[0].arn : null
    voice_webhook  = var.enable_voice_agent ? aws_lambda_function.voice_webhook[0].arn : null
  }
}
