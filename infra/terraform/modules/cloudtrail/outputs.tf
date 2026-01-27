/**
 * CloudTrail Module Outputs
 */

# =====================================================
# CloudTrail
# =====================================================

output "trail_arn" {
  description = "CloudTrail trail ARN"
  value       = aws_cloudtrail.main.arn
}

output "trail_name" {
  description = "CloudTrail trail name"
  value       = aws_cloudtrail.main.name
}

output "trail_home_region" {
  description = "CloudTrail home region"
  value       = aws_cloudtrail.main.home_region
}

# =====================================================
# S3 Bucket
# =====================================================

output "s3_bucket_name" {
  description = "S3 bucket name for CloudTrail logs"
  value       = aws_s3_bucket.cloudtrail_logs.id
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN for CloudTrail logs"
  value       = aws_s3_bucket.cloudtrail_logs.arn
}

output "access_logs_bucket_name" {
  description = "S3 bucket name for access logs (if enabled)"
  value       = var.enable_access_logging ? aws_s3_bucket.access_logs[0].id : null
}

# =====================================================
# KMS Key
# =====================================================

output "kms_key_arn" {
  description = "KMS key ARN for CloudTrail encryption"
  value       = aws_kms_key.cloudtrail.arn
}

output "kms_key_id" {
  description = "KMS key ID for CloudTrail encryption"
  value       = aws_kms_key.cloudtrail.key_id
}

output "kms_key_alias" {
  description = "KMS key alias"
  value       = aws_kms_alias.cloudtrail.name
}

# =====================================================
# CloudWatch Logs
# =====================================================

output "cloudwatch_log_group_arn" {
  description = "CloudWatch log group ARN (if enabled)"
  value       = var.enable_cloudwatch_logs ? aws_cloudwatch_log_group.cloudtrail[0].arn : null
}

output "cloudwatch_log_group_name" {
  description = "CloudWatch log group name (if enabled)"
  value       = var.enable_cloudwatch_logs ? aws_cloudwatch_log_group.cloudtrail[0].name : null
}

# =====================================================
# Retention Policy Information
# =====================================================

output "retention_policy" {
  description = "Audit log retention policy configuration"
  value = {
    s3_log_retention_days         = var.log_retention_days
    s3_glacier_transition_days    = var.transition_to_glacier_days
    cloudwatch_log_retention_days = var.cloudwatch_log_retention_days
    access_log_retention_days     = 90 # Fixed value for access logs bucket
    compliance_note               = "Logs are encrypted with KMS, versioning enabled, and automatically transitioned to Glacier for cost optimization"
  }
}
