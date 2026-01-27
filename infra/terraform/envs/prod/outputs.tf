# =============================================================================
# Outputs - Prod Environment
# =============================================================================
# Project: kanjona
# 47-funnel lead generation platform + 3-sided marketplace
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

# =============================================================================
# Platform Outputs (3-sided marketplace - conditional)
# =============================================================================

# -----------------------------------------------------------------------------
# Platform DynamoDB Tables
# -----------------------------------------------------------------------------
output "platform_orgs_table" {
  description = "Organizations DynamoDB table name"
  value       = var.enable_platform ? module.dynamodb_orgs[0].table_name : null
}

output "platform_users_table" {
  description = "Users DynamoDB table name"
  value       = var.enable_platform ? module.dynamodb_users[0].table_name : null
}

output "platform_memberships_table" {
  description = "Memberships DynamoDB table name"
  value       = var.enable_platform ? module.dynamodb_memberships[0].table_name : null
}

output "platform_assignment_rules_table" {
  description = "Assignment rules DynamoDB table name"
  value       = var.enable_platform ? module.dynamodb_assignment_rules[0].table_name : null
}

output "platform_unassigned_table" {
  description = "Unassigned leads DynamoDB table name"
  value       = var.enable_platform ? module.dynamodb_unassigned[0].table_name : null
}

output "platform_notifications_table" {
  description = "Notifications DynamoDB table name"
  value       = var.enable_platform ? module.dynamodb_notifications[0].table_name : null
}

output "platform_admin_audit_table" {
  description = "Admin audit DynamoDB table name"
  value       = var.enable_platform ? module.dynamodb_admin_audit[0].table_name : null
}

output "platform_exports_table" {
  description = "Exports DynamoDB table name"
  value       = var.enable_platform ? module.dynamodb_exports[0].table_name : null
}

# -----------------------------------------------------------------------------
# Platform SQS Queues
# -----------------------------------------------------------------------------
output "platform_assignment_queue_url" {
  description = "Assignment SQS queue URL"
  value       = var.enable_platform ? module.assignment_queue[0].queue_url : null
}

output "platform_notification_queue_url" {
  description = "Notification SQS queue URL"
  value       = var.enable_platform ? module.notification_queue[0].queue_url : null
}

# -----------------------------------------------------------------------------
# Platform Cognito
# -----------------------------------------------------------------------------
output "platform_admin_cognito_pool_id" {
  description = "Admin Cognito User Pool ID"
  value       = var.enable_platform ? module.cognito_admin[0].pool_id : null
}

output "platform_admin_cognito_client_id" {
  description = "Admin Cognito App Client ID"
  value       = var.enable_platform ? module.cognito_admin[0].client_id : null
}

output "platform_admin_cognito_domain" {
  description = "Admin Cognito hosted UI domain URL"
  value       = var.enable_platform ? module.cognito_admin[0].domain_url : null
}

output "platform_portal_cognito_pool_id" {
  description = "Portal Cognito User Pool ID"
  value       = var.enable_platform ? module.cognito_portal[0].pool_id : null
}

output "platform_portal_cognito_client_id" {
  description = "Portal Cognito App Client ID"
  value       = var.enable_platform ? module.cognito_portal[0].client_id : null
}

output "platform_portal_cognito_domain" {
  description = "Portal Cognito hosted UI domain URL"
  value       = var.enable_platform ? module.cognito_portal[0].domain_url : null
}

# -----------------------------------------------------------------------------
# Platform Worker Lambdas
# -----------------------------------------------------------------------------
output "platform_assignment_worker" {
  description = "Assignment worker Lambda function name"
  value       = var.enable_platform ? module.assignment_worker[0].function_name : null
}

output "platform_notification_worker" {
  description = "Notification worker Lambda function name"
  value       = var.enable_platform ? module.notification_worker[0].function_name : null
}

# -----------------------------------------------------------------------------
# Platform CloudFront Apps
# -----------------------------------------------------------------------------
output "platform_admin_app_distribution_id" {
  description = "Admin app CloudFront distribution ID"
  value       = var.enable_platform ? module.admin_app[0].distribution_id : null
}

output "platform_admin_app_bucket" {
  description = "Admin app S3 bucket name"
  value       = var.enable_platform ? module.admin_app[0].bucket_name : null
}

output "platform_portal_app_distribution_id" {
  description = "Portal app CloudFront distribution ID"
  value       = var.enable_platform ? module.portal_app[0].distribution_id : null
}

output "platform_portal_app_bucket" {
  description = "Portal app S3 bucket name"
  value       = var.enable_platform ? module.portal_app[0].bucket_name : null
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

output "platform_enabled" {
  description = "Whether 3-sided platform features are enabled"
  value       = var.enable_platform
}
