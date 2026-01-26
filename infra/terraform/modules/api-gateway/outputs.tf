# =============================================================================
# API Gateway Module Outputs
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

output "stage_id" {
  description = "API Gateway stage ID"
  value       = aws_apigatewayv2_stage.default.id
}

output "stage_name" {
  description = "API Gateway stage name"
  value       = aws_apigatewayv2_stage.default.name
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
  value       = "https://api.${var.root_domain}"
}

# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------
output "lead_endpoint" {
  description = "Lead capture endpoint URL"
  value       = "https://api.${var.root_domain}/lead"
}

output "health_endpoint" {
  description = "Health check endpoint URL"
  value       = "https://api.${var.root_domain}/health"
}

output "voice_start_endpoint" {
  description = "Voice start endpoint URL"
  value       = var.enable_voice_agent ? "https://api.${var.root_domain}/voice/start" : null
}

output "voice_webhook_endpoint" {
  description = "Voice webhook endpoint URL"
  value       = var.enable_voice_agent ? "https://api.${var.root_domain}/voice/webhook" : null
}

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------
output "log_group_name" {
  description = "API Gateway CloudWatch log group name"
  value       = var.enable_logging ? aws_cloudwatch_log_group.api[0].name : null
}

output "log_group_arn" {
  description = "API Gateway CloudWatch log group ARN"
  value       = var.enable_logging ? aws_cloudwatch_log_group.api[0].arn : null
}
