# =============================================================================
# SES Module - Simple Email Service
# =============================================================================
# This module creates:
# - SES domain identity with DKIM
# - MAIL FROM domain (optional)
# - Email identity for notifications
# - Configuration set for tracking
# - SNS topics for bounce/complaint handling
# - Route 53 DNS records for verification
#
# IMPORTANT: SES starts in sandbox mode. Both sender and recipient must be
# verified until you request production access from AWS.
# =============================================================================

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

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
    tls_policy = "Require"
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

# =============================================================================
# SNS Topics for Bounce/Complaint Handling
# =============================================================================
# These topics receive notifications when emails bounce or recipients complain.
# You can subscribe Lambda functions, email addresses, or HTTP endpoints.
# =============================================================================

# SNS Topic for Bounces
resource "aws_sns_topic" "ses_bounces" {
  count = var.enable_bounce_handling ? 1 : 0

  name = "${var.project_name}-${var.environment}-ses-bounces"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-ses-bounces"
  })
}

# SNS Topic for Complaints
resource "aws_sns_topic" "ses_complaints" {
  count = var.enable_bounce_handling ? 1 : 0

  name = "${var.project_name}-${var.environment}-ses-complaints"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-ses-complaints"
  })
}

# SNS Topic for Deliveries (optional - high volume)
resource "aws_sns_topic" "ses_deliveries" {
  count = var.enable_delivery_notifications ? 1 : 0

  name = "${var.project_name}-${var.environment}-ses-deliveries"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-ses-deliveries"
  })
}

# SNS Topic Policy - Allow SES to publish
resource "aws_sns_topic_policy" "ses_bounces" {
  count = var.enable_bounce_handling ? 1 : 0

  arn = aws_sns_topic.ses_bounces[0].arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowSESPublish"
        Effect = "Allow"
        Principal = {
          Service = "ses.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.ses_bounces[0].arn
        Condition = {
          StringEquals = {
            "AWS:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

resource "aws_sns_topic_policy" "ses_complaints" {
  count = var.enable_bounce_handling ? 1 : 0

  arn = aws_sns_topic.ses_complaints[0].arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowSESPublish"
        Effect = "Allow"
        Principal = {
          Service = "ses.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.ses_complaints[0].arn
        Condition = {
          StringEquals = {
            "AWS:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# Configure SES to send bounce notifications to SNS
resource "aws_ses_identity_notification_topic" "bounces" {
  count = var.enable_bounce_handling ? 1 : 0

  topic_arn                = aws_sns_topic.ses_bounces[0].arn
  notification_type        = "Bounce"
  identity                 = aws_ses_domain_identity.main.domain
  include_original_headers = var.include_original_headers

  depends_on = [aws_ses_domain_identity_verification.main]
}

# Configure SES to send complaint notifications to SNS
resource "aws_ses_identity_notification_topic" "complaints" {
  count = var.enable_bounce_handling ? 1 : 0

  topic_arn                = aws_sns_topic.ses_complaints[0].arn
  notification_type        = "Complaint"
  identity                 = aws_ses_domain_identity.main.domain
  include_original_headers = var.include_original_headers

  depends_on = [aws_ses_domain_identity_verification.main]
}

# Configure SES to send delivery notifications to SNS (optional)
resource "aws_ses_identity_notification_topic" "deliveries" {
  count = var.enable_delivery_notifications ? 1 : 0

  topic_arn                = aws_sns_topic.ses_deliveries[0].arn
  notification_type        = "Delivery"
  identity                 = aws_ses_domain_identity.main.domain
  include_original_headers = false # Deliveries don't need headers

  depends_on = [aws_ses_domain_identity_verification.main]
}

# =============================================================================
# SNS Event Destination for Configuration Set
# =============================================================================
# Route bounce/complaint events through the configuration set as well
# =============================================================================

resource "aws_ses_event_destination" "sns_bounces" {
  count = var.enable_bounce_handling ? 1 : 0

  name                   = "sns-bounces"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled                = true

  matching_types = ["bounce"]

  sns_destination {
    topic_arn = aws_sns_topic.ses_bounces[0].arn
  }
}

resource "aws_ses_event_destination" "sns_complaints" {
  count = var.enable_bounce_handling ? 1 : 0

  name                   = "sns-complaints"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled                = true

  matching_types = ["complaint"]

  sns_destination {
    topic_arn = aws_sns_topic.ses_complaints[0].arn
  }
}

# =============================================================================
# Email Subscriptions for Notifications (Optional)
# =============================================================================
# Subscribe an email address to receive bounce/complaint notifications
# =============================================================================

resource "aws_sns_topic_subscription" "bounce_email" {
  count = var.enable_bounce_handling && var.bounce_notification_email != "" ? 1 : 0

  topic_arn = aws_sns_topic.ses_bounces[0].arn
  protocol  = "email"
  endpoint  = var.bounce_notification_email
}

resource "aws_sns_topic_subscription" "complaint_email" {
  count = var.enable_bounce_handling && var.bounce_notification_email != "" ? 1 : 0

  topic_arn = aws_sns_topic.ses_complaints[0].arn
  protocol  = "email"
  endpoint  = var.bounce_notification_email
}

# =============================================================================
# CloudWatch Alarms for Email Issues
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "ses_bounce_rate" {
  count = var.enable_bounce_handling && var.enable_bounce_alarm ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-ses-bounce-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Reputation.BounceRate"
  namespace           = "AWS/SES"
  period              = 300
  statistic           = "Average"
  threshold           = var.bounce_rate_threshold
  alarm_description   = "SES bounce rate is above ${var.bounce_rate_threshold * 100}%"
  treat_missing_data  = "notBreaching"

  alarm_actions = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "ses_complaint_rate" {
  count = var.enable_bounce_handling && var.enable_bounce_alarm ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-ses-complaint-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Reputation.ComplaintRate"
  namespace           = "AWS/SES"
  period              = 300
  statistic           = "Average"
  threshold           = var.complaint_rate_threshold
  alarm_description   = "SES complaint rate is above ${var.complaint_rate_threshold * 100}%"
  treat_missing_data  = "notBreaching"

  alarm_actions = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  tags = var.tags
}
