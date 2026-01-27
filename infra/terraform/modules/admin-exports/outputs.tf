/**
 * Admin Exports Module Outputs
 */

output "bucket_name" {
  description = "S3 exports bucket name"
  value       = aws_s3_bucket.exports.id
}

output "bucket_arn" {
  description = "S3 exports bucket ARN"
  value       = aws_s3_bucket.exports.arn
}

# Backwards compatibility aliases
output "exports_bucket_name" {
  description = "S3 exports bucket name (alias)"
  value       = aws_s3_bucket.exports.id
}

output "exports_bucket_arn" {
  description = "S3 exports bucket ARN (alias)"
  value       = aws_s3_bucket.exports.arn
}

output "audit_table_name" {
  description = "Admin audit DynamoDB table name"
  value       = aws_dynamodb_table.audit.name
}

output "audit_table_arn" {
  description = "Admin audit DynamoDB table ARN"
  value       = aws_dynamodb_table.audit.arn
}

output "export_jobs_table_name" {
  description = "Export jobs DynamoDB table name"
  value       = aws_dynamodb_table.export_jobs.name
}

output "export_jobs_table_arn" {
  description = "Export jobs DynamoDB table ARN"
  value       = aws_dynamodb_table.export_jobs.arn
}

output "kms_key_arn" {
  description = "KMS key ARN for S3 encryption"
  value       = aws_kms_key.exports.arn
}

output "kms_key_id" {
  description = "KMS key ID for S3 encryption"
  value       = aws_kms_key.exports.key_id
}

output "access_logs_bucket_name" {
  description = "S3 access logs bucket name (if enabled)"
  value       = var.enable_access_logging ? aws_s3_bucket.access_logs[0].id : null
}
