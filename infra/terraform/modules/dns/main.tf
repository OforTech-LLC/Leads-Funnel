# =============================================================================
# DNS Module - Route 53 Hosted Zone and DNS Records
# =============================================================================
# This module creates:
# - Route 53 hosted zone for the root domain
# - DNS records for root, www, and api subdomains
# - ACM validation records (passed in from ACM module)
# =============================================================================

# -----------------------------------------------------------------------------
# Hosted Zone
# -----------------------------------------------------------------------------
resource "aws_route53_zone" "main" {
  name    = var.root_domain
  comment = "${var.project_name} ${var.environment} hosted zone"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-zone"
  })
}

# -----------------------------------------------------------------------------
# Root Domain Record (CloudFront Alias)
# -----------------------------------------------------------------------------
resource "aws_route53_record" "root" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.root_domain
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# IPv6 record for root domain
resource "aws_route53_record" "root_aaaa" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.root_domain
  type    = "AAAA"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# -----------------------------------------------------------------------------
# WWW Subdomain Record (CloudFront Alias)
# -----------------------------------------------------------------------------
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.root_domain}"
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# IPv6 record for www
resource "aws_route53_record" "www_aaaa" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.root_domain}"
  type    = "AAAA"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# -----------------------------------------------------------------------------
# API Subdomain Record (API Gateway Custom Domain)
# -----------------------------------------------------------------------------
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.root_domain}"
  type    = "A"

  alias {
    name                   = var.api_gateway_domain_name
    zone_id                = var.api_gateway_hosted_zone_id
    evaluate_target_health = false
  }
}

# IPv6 record for API
resource "aws_route53_record" "api_aaaa" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.root_domain}"
  type    = "AAAA"

  alias {
    name                   = var.api_gateway_domain_name
    zone_id                = var.api_gateway_hosted_zone_id
    evaluate_target_health = false
  }
}

# -----------------------------------------------------------------------------
# Additional Subdomain Records (e.g., dev.kanjona.com)
# -----------------------------------------------------------------------------
resource "aws_route53_record" "additional" {
  for_each = toset(var.additional_subdomains)

  zone_id = aws_route53_zone.main.zone_id
  name    = "${each.value}.${var.root_domain}"
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# IPv6 records for additional subdomains
resource "aws_route53_record" "additional_aaaa" {
  for_each = toset(var.additional_subdomains)

  zone_id = aws_route53_zone.main.zone_id
  name    = "${each.value}.${var.root_domain}"
  type    = "AAAA"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# -----------------------------------------------------------------------------
# ACM Certificate Validation Records
# -----------------------------------------------------------------------------
resource "aws_route53_record" "acm_validation" {
  for_each = var.acm_validation_records

  zone_id = aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 300
  records = [each.value.record]

  # Prevent recreation on every apply
  allow_overwrite = true
}
