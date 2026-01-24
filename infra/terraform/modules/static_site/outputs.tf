# =============================================================================
# Static Site Module Outputs
# =============================================================================

output "bucket_name" {
  description = "S3 bucket name for site content"
  value       = aws_s3_bucket.site.id
}

output "bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.site.arn
}

output "bucket_regional_domain_name" {
  description = "S3 bucket regional domain name"
  value       = aws_s3_bucket.site.bucket_regional_domain_name
}

output "distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = aws_cloudfront_distribution.site.id
}

output "distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.site.arn
}

output "domain_name" {
  description = "CloudFront domain name"
  value       = aws_cloudfront_distribution.site.domain_name
}

output "hosted_zone_id" {
  description = "CloudFront hosted zone ID for Route 53 alias records"
  value       = aws_cloudfront_distribution.site.hosted_zone_id
}

output "logs_bucket_name" {
  description = "S3 bucket name for CloudFront logs (if enabled)"
  value       = var.enable_logging ? aws_s3_bucket.logs[0].id : null
}

output "oac_id" {
  description = "CloudFront Origin Access Control ID"
  value       = aws_cloudfront_origin_access_control.site.id
}
