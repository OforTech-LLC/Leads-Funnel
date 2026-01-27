/**
 * CloudTrail Module - Audit Logging for AWS API Calls
 *
 * This module creates:
 * - KMS key for CloudTrail encryption
 * - S3 bucket for CloudTrail logs with encryption and access logging
 * - CloudTrail trail for all regions
 * - CloudWatch log group for CloudTrail events
 *
 * Security Features:
 * - All logs encrypted with KMS (encryption at rest)
 * - Log file validation enabled (tamper detection)
 * - Multi-region trail (captures global service events)
 * - S3 access logging enabled (audit who accessed the audit logs)
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
# S3 Bucket for CloudTrail Logs
# =====================================================

# Security: Dedicated bucket for audit logs ensures separation of concerns
# and enables specific retention/compliance policies
resource "aws_s3_bucket" "cloudtrail_logs" {
  bucket = "${var.project_name}-${var.environment}-cloudtrail-logs-${data.aws_caller_identity.current.account_id}"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-cloudtrail-logs"
  })
}

# Security: Block ALL public access - audit logs should never be public
# This is a critical security control for compliance
resource "aws_s3_bucket_public_access_block" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  block_public_acls       = true # Block public ACLs being set
  block_public_policy     = true # Block public bucket policies
  ignore_public_acls      = true # Ignore any existing public ACLs
  restrict_public_buckets = true # Restrict public bucket policies
}

# Security: Versioning enables recovery of deleted/modified logs
# Critical for compliance - proves logs haven't been tampered with
resource "aws_s3_bucket_versioning" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Security: Server-side encryption with customer-managed KMS key
# Ensures logs are encrypted at rest with auditable key access
resource "aws_s3_bucket_server_side_encryption_configuration" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.cloudtrail.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true # Cost optimization: Reduces KMS API calls
  }
}

# Cost Optimization: Lifecycle rules to manage storage costs
# Balances compliance retention requirements with cost efficiency
resource "aws_s3_bucket_lifecycle_configuration" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  rule {
    id     = "transition-to-glacier"
    status = "Enabled"

    filter {
      prefix = "AWSLogs/"
    }

    # Move older logs to Glacier for cost savings (compliance often requires years of retention)
    transition {
      days          = var.transition_to_glacier_days # e.g., 90 days
      storage_class = "GLACIER"
    }

    # Delete after retention period (ensure this meets compliance requirements)
    expiration {
      days = var.log_retention_days # e.g., 2555 days (7 years) for SOC2
    }

    # Clean up old versions (still keeps current version for compliance)
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  # Cleanup incomplete multipart uploads to avoid orphaned data and costs
  rule {
    id     = "abort-multipart"
    status = "Enabled"

    filter {
      prefix = ""
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# Security: Bucket policy restricts access to CloudTrail service only
# Plus enforces HTTPS for all access (encryption in transit)
resource "aws_s3_bucket_policy" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Allow CloudTrail to check bucket ACL (required for trail setup)
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail_logs.arn
        Condition = {
          StringEquals = {
            # Security: Only our specific trail can access this bucket
            "AWS:SourceArn" = "arn:aws:cloudtrail:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:trail/${var.project_name}-${var.environment}-trail"
          }
        }
      },
      # Allow CloudTrail to write log files
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail_logs.arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl"  = "bucket-owner-full-control" # Bucket owner has full control of logs
            "AWS:SourceArn" = "arn:aws:cloudtrail:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:trail/${var.project_name}-${var.environment}-trail"
          }
        }
      },
      # Security: Deny all non-HTTPS access (encryption in transit)
      # Critical for compliance - ensures logs are never transmitted in plaintext
      {
        Sid       = "DenyNonHTTPS"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.cloudtrail_logs.arn,
          "${aws_s3_bucket.cloudtrail_logs.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.cloudtrail_logs]
}

# =====================================================
# S3 Bucket for Access Logging (audit the audit logs)
# =====================================================

# Security: Logs access to the CloudTrail bucket itself
# "Who looked at the audit logs?" - critical for investigating breaches
resource "aws_s3_bucket" "access_logs" {
  count  = var.enable_access_logging ? 1 : 0
  bucket = "${var.project_name}-${var.environment}-cloudtrail-access-logs-${data.aws_caller_identity.current.account_id}"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-cloudtrail-access-logs"
  })
}

resource "aws_s3_bucket_public_access_block" "access_logs" {
  count  = var.enable_access_logging ? 1 : 0
  bucket = aws_s3_bucket.access_logs[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Access logs use AES256 (S3 managed keys) - simpler since these are secondary logs
resource "aws_s3_bucket_server_side_encryption_configuration" "access_logs" {
  count  = var.enable_access_logging ? 1 : 0
  bucket = aws_s3_bucket.access_logs[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Shorter retention for access logs (90 days is typically sufficient)
resource "aws_s3_bucket_lifecycle_configuration" "access_logs" {
  count  = var.enable_access_logging ? 1 : 0
  bucket = aws_s3_bucket.access_logs[0].id

  rule {
    id     = "expire-access-logs"
    status = "Enabled"

    filter {
      prefix = ""
    }

    expiration {
      days = 90
    }
  }
}

# Enable access logging on the CloudTrail bucket
resource "aws_s3_bucket_logging" "cloudtrail_logs" {
  count  = var.enable_access_logging ? 1 : 0
  bucket = aws_s3_bucket.cloudtrail_logs.id

  target_bucket = aws_s3_bucket.access_logs[0].id
  target_prefix = "cloudtrail-bucket-access/"
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
