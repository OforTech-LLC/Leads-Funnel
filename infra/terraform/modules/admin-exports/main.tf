/**
 * Admin Exports Infrastructure
 *
 * S3 bucket for exports and DynamoDB audit table.
 * Security features:
 * - KMS encryption for S3 bucket
 * - S3 access logging enabled
 * - Public access blocked
 * - Versioning enabled
 */

# =====================================================
# Data Sources
# =====================================================

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# =====================================================
# KMS Key for S3 Encryption
# =====================================================

resource "aws_kms_key" "exports" {
  description             = "KMS key for Admin Exports S3 - ${var.project_name}-${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Allow root account full access
      {
        Sid    = "EnableRootAccountPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      # Allow S3 service to use the key
      {
        Sid    = "AllowS3Service"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-exports-kms"
  })
}

resource "aws_kms_alias" "exports" {
  name          = "alias/${var.project_name}-${var.environment}-exports"
  target_key_id = aws_kms_key.exports.key_id
}

# =====================================================
# S3 Access Logs Bucket
# =====================================================

resource "aws_s3_bucket" "access_logs" {
  count  = var.enable_access_logging ? 1 : 0
  bucket = "${var.project_name}-${var.environment}-admin-exports-access-logs"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-admin-exports-access-logs"
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

# =====================================================
# S3 Export Bucket
# =====================================================

resource "aws_s3_bucket" "exports" {
  bucket = "${var.project_name}-${var.environment}-admin-exports"

  tags = var.tags
}

resource "aws_s3_bucket_versioning" "exports" {
  bucket = aws_s3_bucket.exports.id

  versioning_configuration {
    status = "Enabled"
  }
}

# KMS encryption instead of AES256
resource "aws_s3_bucket_server_side_encryption_configuration" "exports" {
  bucket = aws_s3_bucket.exports.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.exports.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "exports" {
  bucket = aws_s3_bucket.exports.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable access logging
resource "aws_s3_bucket_logging" "exports" {
  count  = var.enable_access_logging ? 1 : 0
  bucket = aws_s3_bucket.exports.id

  target_bucket = aws_s3_bucket.access_logs[0].id
  target_prefix = "exports-bucket-access/"
}

resource "aws_s3_bucket_lifecycle_configuration" "exports" {
  bucket = aws_s3_bucket.exports.id

  rule {
    id     = "expire-exports"
    status = "Enabled"

    filter {
      prefix = "exports/"
    }

    expiration {
      days = var.export_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }

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

resource "aws_s3_bucket_cors_configuration" "exports" {
  bucket = aws_s3_bucket.exports.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = var.allowed_origins
    expose_headers  = ["ETag", "Content-Length", "Content-Type"]
    max_age_seconds = 3600
  }
}

# Bucket policy to enforce HTTPS
resource "aws_s3_bucket_policy" "exports" {
  bucket = aws_s3_bucket.exports.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyNonHTTPS"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.exports.arn,
          "${aws_s3_bucket.exports.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.exports]
}

# =====================================================
# Admin Audit Log Table
# =====================================================

resource "aws_dynamodb_table" "audit" {
  name         = "${var.project_name}-${var.environment}-admin-audit"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "pk"
  range_key = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  # GSI for actor lookup
  attribute {
    name = "actorEmailHash"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "actorEmailHash"
    range_key       = "sk"
    projection_type = "ALL"
  }

  # TTL for automatic cleanup (optional)
  ttl {
    attribute_name = "ttl"
    enabled        = var.audit_ttl_enabled
  }

  point_in_time_recovery {
    enabled = var.environment == "prod"
  }

  deletion_protection_enabled = var.environment == "prod"

  tags = var.tags
}

# =====================================================
# Export Jobs Table (track export status)
# =====================================================

resource "aws_dynamodb_table" "export_jobs" {
  name         = "${var.project_name}-${var.environment}-admin-export-jobs"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "pk"
  range_key = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  # TTL for automatic cleanup
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = var.environment == "prod"
  }

  deletion_protection_enabled = var.environment == "prod"

  tags = var.tags
}
