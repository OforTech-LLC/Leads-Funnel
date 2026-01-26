# =============================================================================
# Outputs - Prod Environment
# =============================================================================
# Project: kanjona
# 47-funnel lead generation platform
# =============================================================================

# -----------------------------------------------------------------------------
# URLs
# -----------------------------------------------------------------------------
output "site_url" {
  description = "URL of the landing page"
  value       = "https://${var.root_domain}"
}

output "site_url_www" {
  description = "WWW URL of the landing page"
  value       = "https://www.${var.root_domain}"
}

output "api_url" {
  description = "URL of the API endpoint"
  value       = module.api_gateway.api_url
}

output "health_endpoint" {
  description = "Health check endpoint URL"
  value       = module.api_gateway.health_endpoint
}

output "lead_endpoint" {
  description = "Lead capture endpoint URL"
  value       = module.api_gateway.lead_endpoint
}

# -----------------------------------------------------------------------------
# CloudFront
# -----------------------------------------------------------------------------
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = module.static_site.distribution_id
}

output "cloudfront_domain_name" {
  description = "CloudFront domain name"
  value       = module.static_site.domain_name
}

# -----------------------------------------------------------------------------
# Route 53
# -----------------------------------------------------------------------------
output "route53_zone_id" {
  description = "Route 53 hosted zone ID"
  value       = module.dns.zone_id
}

output "route53_nameservers" {
  description = "Nameservers to configure at domain registrar"
  value       = module.dns.nameservers
}

# -----------------------------------------------------------------------------
# S3
# -----------------------------------------------------------------------------
output "s3_site_bucket" {
  description = "S3 bucket name for site content"
  value       = module.static_site.bucket_name
}

# -----------------------------------------------------------------------------
# DynamoDB
# -----------------------------------------------------------------------------
output "dynamodb_funnel_table_names" {
  description = "Map of funnel ID to DynamoDB table name"
  value       = module.dynamodb.funnel_table_names
}

output "dynamodb_rate_limits_table" {
  description = "Rate limits DynamoDB table name"
  value       = module.dynamodb.rate_limits_table_name
}

output "dynamodb_idempotency_table" {
  description = "Idempotency DynamoDB table name"
  value       = module.dynamodb.idempotency_table_name
}

output "dynamodb_table_count" {
  description = "Total number of DynamoDB tables created"
  value       = module.dynamodb.table_count
}

# -----------------------------------------------------------------------------
# Lambda
# -----------------------------------------------------------------------------
output "lambda_lead_handler" {
  description = "Lead handler Lambda function name"
  value       = module.lambda.lead_handler_function_name
}

output "lambda_health_handler" {
  description = "Health handler Lambda function name"
  value       = module.lambda.health_handler_function_name
}

output "lambda_voice_start" {
  description = "Voice start Lambda function name"
  value       = module.lambda.voice_start_function_name
}

output "lambda_voice_webhook" {
  description = "Voice webhook Lambda function name"
  value       = module.lambda.voice_webhook_function_name
}

# -----------------------------------------------------------------------------
# EventBridge
# -----------------------------------------------------------------------------
output "event_bus_name" {
  description = "EventBridge event bus name"
  value       = module.eventbridge.event_bus_name
}

output "event_bus_arn" {
  description = "EventBridge event bus ARN"
  value       = module.eventbridge.event_bus_arn
}

# -----------------------------------------------------------------------------
# Secrets Manager
# -----------------------------------------------------------------------------
output "twilio_secret_arn" {
  description = "Twilio credentials secret ARN"
  value       = module.secrets.twilio_secret_arn
}

output "elevenlabs_secret_arn" {
  description = "ElevenLabs credentials secret ARN"
  value       = module.secrets.elevenlabs_secret_arn
}

# -----------------------------------------------------------------------------
# SSM Parameter Store
# -----------------------------------------------------------------------------
output "ssm_parameter_prefix" {
  description = "SSM parameter prefix for this environment"
  value       = module.ssm.parameter_prefix
}

output "ssm_feature_flags" {
  description = "SSM feature flag parameter names"
  value       = module.ssm.feature_flag_names
}

# -----------------------------------------------------------------------------
# SQS (Conditional)
# -----------------------------------------------------------------------------
output "sqs_queue_url" {
  description = "SQS queue URL for lead processing"
  value       = var.enable_sqs ? module.eventbridge.queue_url : null
}

output "sqs_dlq_url" {
  description = "SQS DLQ URL"
  value       = var.enable_sqs ? module.eventbridge.dlq_url : null
}

# -----------------------------------------------------------------------------
# WAF (Conditional)
# -----------------------------------------------------------------------------
output "waf_web_acl_arn" {
  description = "WAF Web ACL ARN"
  value       = var.enable_waf ? module.waf[0].web_acl_arn : null
}

# -----------------------------------------------------------------------------
# SES (Conditional)
# -----------------------------------------------------------------------------
output "ses_domain_identity" {
  description = "SES domain identity"
  value       = var.enable_ses ? module.ses[0].domain_identity : null
}

# -----------------------------------------------------------------------------
# Monitoring (Conditional)
# -----------------------------------------------------------------------------
output "sns_alerts_topic_arn" {
  description = "SNS topic ARN for alerts"
  value       = var.enable_alarms ? module.monitoring[0].sns_topic_arn : null
}

output "cloudwatch_dashboard_name" {
  description = "CloudWatch dashboard name"
  value       = var.enable_alarms ? module.monitoring[0].dashboard_name : null
}

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
output "funnel_count" {
  description = "Number of funnels configured"
  value       = length(var.funnel_ids)
}

output "environment" {
  description = "Current environment"
  value       = var.environment
}

output "project_name" {
  description = "Project name"
  value       = var.project_name
}
