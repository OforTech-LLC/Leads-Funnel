# =============================================================================
# Outputs - Prod Environment
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
  value       = "https://api.${var.root_domain}"
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
output "dynamodb_table_name" {
  description = "DynamoDB table name"
  value       = module.dynamodb.table_name
}

output "dynamodb_table_arn" {
  description = "DynamoDB table ARN"
  value       = module.dynamodb.table_arn
}

# -----------------------------------------------------------------------------
# Lambda
# -----------------------------------------------------------------------------
output "lambda_function_name" {
  description = "Lead capture Lambda function name"
  value       = module.api.lambda_function_name
}

output "lambda_function_arn" {
  description = "Lead capture Lambda function ARN"
  value       = module.api.lambda_function_arn
}

# -----------------------------------------------------------------------------
# EventBridge
# -----------------------------------------------------------------------------
output "event_bus_name" {
  description = "EventBridge event bus name"
  value       = module.eventing.event_bus_name
}

output "event_bus_arn" {
  description = "EventBridge event bus ARN"
  value       = module.eventing.event_bus_arn
}

# -----------------------------------------------------------------------------
# SQS (Conditional)
# -----------------------------------------------------------------------------
output "sqs_queue_url" {
  description = "SQS queue URL for lead processing"
  value       = var.enable_sqs ? module.eventing.queue_url : null
}

output "sqs_dlq_url" {
  description = "SQS DLQ URL"
  value       = var.enable_sqs ? module.eventing.dlq_url : null
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
