# =============================================================================
# SES Module Outputs
# =============================================================================

output "domain_identity_arn" {
  description = "SES domain identity ARN"
  value       = aws_ses_domain_identity.main.arn
}

output "domain_identity" {
  description = "SES domain identity (domain name)"
  value       = aws_ses_domain_identity.main.domain
}

output "verification_status" {
  description = "Domain verification status"
  value       = aws_ses_domain_identity_verification.main.id
}

output "dkim_tokens" {
  description = "DKIM tokens for DNS setup"
  value       = aws_ses_domain_dkim.main.dkim_tokens
}

output "configuration_set_name" {
  description = "SES configuration set name"
  value       = aws_ses_configuration_set.main.name
}

output "notification_email" {
  description = "Notification email (requires manual verification)"
  value       = var.notification_email != "" ? aws_ses_email_identity.notification[0].email : null
}

output "mail_from_domain" {
  description = "MAIL FROM domain"
  value       = var.enable_mail_from ? "mail.${var.root_domain}" : null
}
