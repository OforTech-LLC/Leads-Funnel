# =============================================================================
# Avatar Bucket Module Outputs
# =============================================================================

output "bucket_name" {
  description = "S3 bucket name for avatars"
  value       = aws_s3_bucket.avatars.id
}

output "bucket_arn" {
  description = "S3 bucket ARN for avatars"
  value       = aws_s3_bucket.avatars.arn
}

output "bucket_regional_domain_name" {
  description = "S3 bucket regional domain name for avatars"
  value       = aws_s3_bucket.avatars.bucket_regional_domain_name
}
