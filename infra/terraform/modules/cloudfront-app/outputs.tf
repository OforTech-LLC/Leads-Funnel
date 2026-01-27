# =============================================================================
# CloudFront App Module Outputs
# =============================================================================

output "distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.app.id
}

output "distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.app.arn
}

output "domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.app.domain_name
}

output "hosted_zone_id" {
  description = "CloudFront distribution hosted zone ID"
  value       = aws_cloudfront_distribution.app.hosted_zone_id
}

output "bucket_name" {
  description = "S3 bucket name for the app origin"
  value       = aws_s3_bucket.app.id
}

output "bucket_arn" {
  description = "S3 bucket ARN for the app origin"
  value       = aws_s3_bucket.app.arn
}

output "bucket_regional_domain_name" {
  description = "S3 bucket regional domain name"
  value       = aws_s3_bucket.app.bucket_regional_domain_name
}
