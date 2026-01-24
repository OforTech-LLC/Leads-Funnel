# =============================================================================
# SES Module - Simple Email Service
# =============================================================================
# This module creates:
# - SES domain identity with DKIM
# - MAIL FROM domain (optional)
# - Email identity for notifications
# - Configuration set for tracking
# - Route 53 DNS records for verification
#
# IMPORTANT: SES starts in sandbox mode. Both sender and recipient must be
# verified until you request production access from AWS.
# =============================================================================

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------
data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# SES Domain Identity
# -----------------------------------------------------------------------------
resource "aws_ses_domain_identity" "main" {
  domain = var.root_domain
}

# -----------------------------------------------------------------------------
# SES Domain DKIM
# -----------------------------------------------------------------------------
resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

# -----------------------------------------------------------------------------
# Route 53 Records - Domain Verification
# -----------------------------------------------------------------------------
resource "aws_route53_record" "ses_verification" {
  zone_id = var.route53_zone_id
  name    = "_amazonses.${var.root_domain}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.main.verification_token]
}

# DKIM records (3 CNAME records)
resource "aws_route53_record" "ses_dkim" {
  count = 3

  zone_id = var.route53_zone_id
  name    = "${aws_ses_domain_dkim.main.dkim_tokens[count.index]}._domainkey.${var.root_domain}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.main.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

# -----------------------------------------------------------------------------
# SES Domain Identity Verification
# -----------------------------------------------------------------------------
resource "aws_ses_domain_identity_verification" "main" {
  domain = aws_ses_domain_identity.main.id

  depends_on = [aws_route53_record.ses_verification]

  timeouts {
    create = "30m"
  }
}

# -----------------------------------------------------------------------------
# MAIL FROM Domain (Optional but Recommended)
# -----------------------------------------------------------------------------
resource "aws_ses_domain_mail_from" "main" {
  count = var.enable_mail_from ? 1 : 0

  domain           = aws_ses_domain_identity.main.domain
  mail_from_domain = "mail.${var.root_domain}"
}

# MX record for MAIL FROM
resource "aws_route53_record" "ses_mail_from_mx" {
  count = var.enable_mail_from ? 1 : 0

  zone_id = var.route53_zone_id
  name    = "mail.${var.root_domain}"
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${data.aws_region.current.name}.amazonses.com"]
}

# SPF record for MAIL FROM
resource "aws_route53_record" "ses_mail_from_spf" {
  count = var.enable_mail_from ? 1 : 0

  zone_id = var.route53_zone_id
  name    = "mail.${var.root_domain}"
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}

# -----------------------------------------------------------------------------
# Email Identity for Notifications (Requires Manual Verification)
# -----------------------------------------------------------------------------
resource "aws_ses_email_identity" "notification" {
  count = var.notification_email != "" ? 1 : 0

  email = var.notification_email
}

# -----------------------------------------------------------------------------
# SES Configuration Set
# -----------------------------------------------------------------------------
resource "aws_ses_configuration_set" "main" {
  name = "${var.project_name}-${var.environment}-leads"

  reputation_metrics_enabled = true
  sending_enabled            = true

  delivery_options {
    tls_policy = "REQUIRE"
  }
}

# CloudWatch event destination for tracking
resource "aws_ses_event_destination" "cloudwatch" {
  name                   = "cloudwatch"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled                = true

  matching_types = [
    "bounce",
    "complaint",
    "delivery",
    "reject",
    "send",
  ]

  cloudwatch_destination {
    default_value  = "default"
    dimension_name = "ses:configuration-set"
    value_source   = "messageTag"
  }
}
