# =============================================================================
# CloudWatch Synthetics Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# API Health Check Canary
# -----------------------------------------------------------------------------
output "api_canary_name" {
  description = "Name of the API health check canary"
  value       = var.enable_api_canary ? aws_synthetics_canary.api_health[0].name : null
}

output "api_canary_arn" {
  description = "ARN of the API health check canary"
  value       = var.enable_api_canary ? aws_synthetics_canary.api_health[0].arn : null
}

output "api_canary_status" {
  description = "Status of the API health check canary"
  value       = var.enable_api_canary ? aws_synthetics_canary.api_health[0].status : null
}

# -----------------------------------------------------------------------------
# Website Availability Canary
# -----------------------------------------------------------------------------
output "website_canary_name" {
  description = "Name of the website availability canary"
  value       = var.enable_website_canary ? aws_synthetics_canary.website[0].name : null
}

output "website_canary_arn" {
  description = "ARN of the website availability canary"
  value       = var.enable_website_canary ? aws_synthetics_canary.website[0].arn : null
}

output "website_canary_status" {
  description = "Status of the website availability canary"
  value       = var.enable_website_canary ? aws_synthetics_canary.website[0].status : null
}

# -----------------------------------------------------------------------------
# S3 Artifacts Bucket
# -----------------------------------------------------------------------------
output "artifacts_bucket_name" {
  description = "Name of the S3 bucket for canary artifacts"
  value       = aws_s3_bucket.canary_artifacts.id
}

output "artifacts_bucket_arn" {
  description = "ARN of the S3 bucket for canary artifacts"
  value       = aws_s3_bucket.canary_artifacts.arn
}

# -----------------------------------------------------------------------------
# IAM Role
# -----------------------------------------------------------------------------
output "canary_role_arn" {
  description = "ARN of the IAM role used by canaries"
  value       = aws_iam_role.canary.arn
}

# -----------------------------------------------------------------------------
# Alarms
# -----------------------------------------------------------------------------
output "alarm_names" {
  description = "List of CloudWatch alarm names for canaries"
  value = concat(
    var.enable_api_canary ? [
      aws_cloudwatch_metric_alarm.api_canary_failed[0].alarm_name,
      aws_cloudwatch_metric_alarm.api_canary_duration[0].alarm_name,
    ] : [],
    var.enable_website_canary ? [
      aws_cloudwatch_metric_alarm.website_canary_failed[0].alarm_name,
      aws_cloudwatch_metric_alarm.website_canary_duration[0].alarm_name,
    ] : []
  )
}

output "alarm_arns" {
  description = "Map of canary alarm ARNs"
  value = {
    api_canary_failed       = var.enable_api_canary ? aws_cloudwatch_metric_alarm.api_canary_failed[0].arn : null
    api_canary_duration     = var.enable_api_canary ? aws_cloudwatch_metric_alarm.api_canary_duration[0].arn : null
    website_canary_failed   = var.enable_website_canary ? aws_cloudwatch_metric_alarm.website_canary_failed[0].arn : null
    website_canary_duration = var.enable_website_canary ? aws_cloudwatch_metric_alarm.website_canary_duration[0].arn : null
  }
}

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
output "canaries_enabled" {
  description = "Map of enabled canaries"
  value = {
    api_health = var.enable_api_canary
    website    = var.enable_website_canary
  }
}
