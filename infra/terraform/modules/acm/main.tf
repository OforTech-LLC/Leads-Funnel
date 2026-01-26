# =============================================================================
# ACM Module - SSL/TLS Certificates
# =============================================================================
# This module creates:
# - ACM certificate with SANs for root, www, and api subdomains
# - DNS validation (requires Route 53 zone to be created first)
# - Certificate validation waiter
#
# IMPORTANT: This certificate MUST be created in us-east-1 for CloudFront
# =============================================================================

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# -----------------------------------------------------------------------------
# ACM Certificate
# -----------------------------------------------------------------------------
locals {
  # Use environment-specific API subdomain
  api_subdomain = var.environment == "prod" ? "api.${var.root_domain}" : "api-${var.environment}.${var.root_domain}"

  # Primary domain: prod uses root domain, dev uses subdomain
  primary_domain = var.environment == "prod" ? var.root_domain : "${var.environment}.${var.root_domain}"

  # SANs: prod includes www, dev doesn't need additional subdomains
  base_sans = var.environment == "prod" ? [
    "www.${var.root_domain}",
    local.api_subdomain,
    ] : [
    local.api_subdomain,
  ]
}

resource "aws_acm_certificate" "main" {
  domain_name       = local.primary_domain
  validation_method = "DNS"

  subject_alternative_names = concat(local.base_sans, var.additional_sans)

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-cert"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# -----------------------------------------------------------------------------
# Certificate Validation
# -----------------------------------------------------------------------------
# Note: The actual Route 53 records are created by the DNS module
# This resource waits for the certificate to be validated
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_acm_certificate.main.domain_validation_options : record.resource_record_name]

  timeouts {
    create = "30m"
  }
}

# -----------------------------------------------------------------------------
# Local Values for Validation Records
# -----------------------------------------------------------------------------
locals {
  # Transform domain validation options into a map for the DNS module
  validation_records = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }
}
