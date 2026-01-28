# =============================================================================
# Monitoring Module - SNS Topic and KMS Encryption
# =============================================================================
# This file contains:
# - SNS topic for alerts with email subscriptions
# - KMS key for SNS encryption (optional)
# - SNS topic policy for CloudWatch
#
# Alarms are defined in alarms.tf
# Dashboard is defined in dashboard.tf
# =============================================================================

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# Local Values
# -----------------------------------------------------------------------------
locals {
  name_prefix = "${var.project_name}-${var.environment}"

  # Default alarm thresholds (can be overridden via variables)
  default_thresholds = {
    api_error_rate_percent    = 1    # 1% error rate
    lambda_error_rate_percent = 1    # 1% error rate
    lambda_duration_seconds   = 10   # 10 seconds
    api_latency_p99_ms        = 3000 # 3 seconds
  }
}

# =============================================================================
# SNS Topic for Alerts
# =============================================================================
resource "aws_sns_topic" "alerts" {
  name = "${local.name_prefix}-alerts"

  # Enable server-side encryption
  kms_master_key_id = var.enable_sns_encryption ? aws_kms_key.sns[0].id : null

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-alerts"
  })
}

# KMS key for SNS encryption (optional)
resource "aws_kms_key" "sns" {
  count = var.enable_sns_encryption ? 1 : 0

  description             = "KMS key for SNS topic encryption - ${local.name_prefix}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccountPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowCloudWatchAlarms"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey*"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowSNSService"
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-sns-kms"
  })
}

resource "aws_kms_alias" "sns" {
  count = var.enable_sns_encryption ? 1 : 0

  name          = "alias/${local.name_prefix}-sns"
  target_key_id = aws_kms_key.sns[0].key_id
}

# Email subscription (if provided)
resource "aws_sns_topic_subscription" "email" {
  count = var.alert_email != "" ? 1 : 0

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Additional email subscriptions (for escalation)
resource "aws_sns_topic_subscription" "additional_emails" {
  for_each = toset(var.additional_alert_emails)

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = each.value
}

# SNS Topic Policy (allows CloudWatch to publish)
resource "aws_sns_topic_policy" "alerts" {
  arn = aws_sns_topic.alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudWatchAlarms"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.alerts.arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:aws:cloudwatch:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:alarm:*"
          }
        }
      }
    ]
  })
}
