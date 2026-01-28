# =============================================================================
# CloudTrail S3 Buckets - Log Storage and Access Logging
# =============================================================================
# This file contains:
# - S3 bucket for CloudTrail log files (encrypted, versioned, lifecycle)
# - S3 bucket policy (CloudTrail service + HTTPS enforcement)
# - S3 access logging bucket (audit the audit logs)
#
# KMS, CloudWatch, and trail configuration are in main.tf
# =============================================================================

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
