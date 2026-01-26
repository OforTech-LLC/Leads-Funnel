# =============================================================================
# DNS Module Outputs
# =============================================================================

output "zone_id" {
  description = "Route 53 hosted zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "zone_arn" {
  description = "Route 53 hosted zone ARN"
  value       = aws_route53_zone.main.arn
}

output "nameservers" {
  description = "Nameservers to configure at domain registrar"
  value       = aws_route53_zone.main.name_servers
}

output "root_domain_fqdn" {
  description = "Fully qualified domain name for root (null if not created)"
  value       = var.create_root_records ? aws_route53_record.root[0].fqdn : null
}

output "www_domain_fqdn" {
  description = "Fully qualified domain name for www (null if not created)"
  value       = var.create_root_records ? aws_route53_record.www[0].fqdn : null
}

output "api_domain_fqdn" {
  description = "Fully qualified domain name for api"
  value       = aws_route53_record.api.fqdn
}
