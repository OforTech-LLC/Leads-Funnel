/**
 * CloudTrail Module - KMS, CloudWatch, and Trail Configuration
 *
 * This file contains:
 * - KMS key for CloudTrail encryption
 * - CloudWatch log group for real-time monitoring
 * - IAM role for CloudWatch integration
 * - The CloudTrail trail itself
 *
 * S3 buckets for log storage are defined in s3.tf
 *
 * Security Features:
 * - All logs encrypted with KMS (encryption at rest)
 * - Log file validation enabled (tamper detection)
 * - Multi-region trail (captures global service events)
 *
 * Compliance: This configuration supports SOC2, HIPAA, and PCI-DSS
 * audit requirements by providing immutable, encrypted audit logs
 * with configurable retention.
 */

# =====================================================
# Data Sources
# =====================================================

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# =====================================================
# KMS Key for CloudTrail Encryption
# =====================================================

# Security: Customer-managed KMS key provides control over encryption
# and enables key rotation, access auditing, and compliance requirements.
resource "aws_kms_key" "cloudtrail" {
  description             = "KMS key for CloudTrail encryption - ${var.project_name}-${var.environment}"
  deletion_window_in_days = var.kms_deletion_window_days # Allows key recovery if deleted accidentally
  enable_key_rotation     = true                         # Security: Annual automatic key rotation (AWS managed)
  multi_region            = false                        # Single-region key reduces cost; multi-region trail still works

  # Security: Key policy defines who can use and manage this key
  # Follows principle of least privilege - only CloudTrail and CloudWatch can use it
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Root account access - required for key administration
      # Security: Only root account can modify key policy, not IAM users
      {
        Sid    = "EnableRootAccountPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      # CloudTrail encryption permissions
      # Security: Condition restricts to CloudTrail ARNs only, preventing misuse
      {
        Sid    = "AllowCloudTrailEncrypt"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action = [
          "kms:GenerateDataKey*", # Generate data keys for envelope encryption
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringLike = {
            # Security: Only CloudTrail trails in this account can use this key
            "kms:EncryptionContext:aws:cloudtrail:arn" = "arn:aws:cloudtrail:*:${data.aws_caller_identity.current.account_id}:trail/*"
          }
        }
      },
      # CloudTrail describe key permission (no condition needed for describe)
      {
        Sid    = "AllowCloudTrailDescribe"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "kms:DescribeKey"
        Resource = "*"
      },
      # CloudWatch Logs permissions for encrypted log delivery
      # Security: Condition restricts to specific log group ARN pattern
      {
        Sid    = "AllowCloudWatchLogs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${data.aws_region.current.name}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt*",
          "kms:Decrypt*",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:Describe*"
        ]
        Resource = "*"
        Condition = {
          ArnLike = {
            # Security: Only CloudTrail-related log groups can use this key
            "kms:EncryptionContext:aws:logs:arn" = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/cloudtrail/${var.project_name}-${var.environment}*"
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-cloudtrail-kms"
  })
}

# Human-readable alias for the KMS key
resource "aws_kms_alias" "cloudtrail" {
  name          = "alias/${var.project_name}-${var.environment}-cloudtrail"
  target_key_id = aws_kms_key.cloudtrail.key_id
}

# =====================================================
# CloudWatch Log Group for CloudTrail
# =====================================================

# Security: CloudWatch integration enables real-time alerting on security events
# Can trigger alarms for suspicious API calls (e.g., IAM changes, root login)
resource "aws_cloudwatch_log_group" "cloudtrail" {
  count             = var.enable_cloudwatch_logs ? 1 : 0
  name              = "/aws/cloudtrail/${var.project_name}-${var.environment}"
  retention_in_days = var.cloudwatch_log_retention_days # Separate from S3 retention
  kms_key_id        = aws_kms_key.cloudtrail.arn        # Encrypted at rest

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-cloudtrail-logs"
  })
}

# IAM role for CloudTrail to write to CloudWatch Logs
resource "aws_iam_role" "cloudtrail_cloudwatch" {
  count = var.enable_cloudwatch_logs ? 1 : 0
  name  = "${var.project_name}-${var.environment}-cloudtrail-cloudwatch-role"

  # Security: Only CloudTrail service can assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.tags
}

# Security: Least privilege - only allow writing to the specific log group
resource "aws_iam_role_policy" "cloudtrail_cloudwatch" {
  count = var.enable_cloudwatch_logs ? 1 : 0
  name  = "${var.project_name}-${var.environment}-cloudtrail-cloudwatch-policy"
  role  = aws_iam_role.cloudtrail_cloudwatch[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudWatchLogsWrite"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        # Security: Scoped to specific log group only
        Resource = "${aws_cloudwatch_log_group.cloudtrail[0].arn}:*"
      }
    ]
  })
}

# =====================================================
# CloudTrail Trail
# =====================================================

# The main CloudTrail configuration
resource "aws_cloudtrail" "main" {
  name                          = "${var.project_name}-${var.environment}-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail_logs.id
  include_global_service_events = true                       # Capture IAM, CloudFront, etc. (global services)
  is_multi_region_trail         = var.is_multi_region_trail  # Capture events from all regions
  enable_log_file_validation    = true                       # Security: Detect log tampering via digest files
  kms_key_id                    = aws_kms_key.cloudtrail.arn # Encryption at rest

  # CloudWatch Logs integration for real-time alerting
  cloud_watch_logs_group_arn = var.enable_cloudwatch_logs ? "${aws_cloudwatch_log_group.cloudtrail[0].arn}:*" : null
  cloud_watch_logs_role_arn  = var.enable_cloudwatch_logs ? aws_iam_role.cloudtrail_cloudwatch[0].arn : null

  # Management events - captures all AWS API calls (console, CLI, SDK)
  event_selector {
    read_write_type           = "All" # Both read and write operations
    include_management_events = true
  }

  # Data events for S3 (optional - can significantly increase costs)
  # Security: Tracks object-level access to S3 buckets
  # Cost Warning: High-volume buckets can generate millions of events/day
  dynamic "event_selector" {
    for_each = var.enable_s3_data_events ? [1] : []
    content {
      read_write_type           = "All"
      include_management_events = false

      data_resource {
        type   = "AWS::S3::Object"
        values = ["arn:aws:s3"] # All S3 buckets (can be scoped to specific buckets)
      }
    }
  }

  # Data events for Lambda (optional)
  # Security: Tracks Lambda invocations - useful for detecting unauthorized access
  dynamic "event_selector" {
    for_each = var.enable_lambda_data_events ? [1] : []
    content {
      read_write_type           = "All"
      include_management_events = false

      data_resource {
        type   = "AWS::Lambda::Function"
        values = ["arn:aws:lambda"] # All Lambda functions
      }
    }
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-trail"
  })

  # Ensure bucket policy and KMS key are ready before creating trail
  depends_on = [
    aws_s3_bucket_policy.cloudtrail_logs,
    aws_kms_key.cloudtrail
  ]
}
