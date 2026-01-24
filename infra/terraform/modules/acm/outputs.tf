# =============================================================================
# ACM Module Outputs
# =============================================================================

output "certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = aws_acm_certificate.main.arn
}

output "certificate_domain_name" {
  description = "Domain name of the certificate"
  value       = aws_acm_certificate.main.domain_name
}

output "certificate_status" {
  description = "Status of the certificate"
  value       = aws_acm_certificate.main.status
}

output "validation_records" {
  description = "DNS validation records to create in Route 53"
  value       = local.validation_records
}

output "validated_certificate_arn" {
  description = "ARN of the validated certificate (use this for CloudFront)"
  value       = aws_acm_certificate_validation.main.certificate_arn
}
