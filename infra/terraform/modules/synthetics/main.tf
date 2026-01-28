# =============================================================================
# CloudWatch Synthetics Module - S3 Artifacts and IAM
# =============================================================================
# This file contains:
# - S3 bucket for canary artifact storage
# - IAM role and policy for canary execution
#
# Canary resources are defined in canaries.tf
# CloudWatch alarms are defined in alarms.tf
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
}

# =============================================================================
# S3 Bucket for Canary Artifacts
# =============================================================================
resource "aws_s3_bucket" "canary_artifacts" {
  bucket = "${local.name_prefix}-canary-artifacts-${data.aws_caller_identity.current.account_id}"

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-canary-artifacts"
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "canary_artifacts" {
  bucket = aws_s3_bucket.canary_artifacts.id

  rule {
    id     = "cleanup-old-artifacts"
    status = "Enabled"

    filter {}

    expiration {
      days = var.artifact_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }
}

resource "aws_s3_bucket_versioning" "canary_artifacts" {
  bucket = aws_s3_bucket.canary_artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "canary_artifacts" {
  bucket = aws_s3_bucket.canary_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "canary_artifacts" {
  bucket = aws_s3_bucket.canary_artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# =============================================================================
# IAM Role for Canaries
# =============================================================================
resource "aws_iam_role" "canary" {
  name = "${local.name_prefix}-canary-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-canary-role"
  })
}

resource "aws_iam_role_policy" "canary" {
  name = "${local.name_prefix}-canary-policy"
  role = aws_iam_role.canary.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # S3 permissions for artifact storage
      {
        Sid    = "S3ArtifactAccess"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:GetBucketLocation"
        ]
        Resource = [
          aws_s3_bucket.canary_artifacts.arn,
          "${aws_s3_bucket.canary_artifacts.arn}/*"
        ]
      },
      # CloudWatch Logs permissions
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:CreateLogGroup"
        ]
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/cwsyn-*"
      },
      # CloudWatch metrics permissions
      {
        Sid    = "CloudWatchMetrics"
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "cloudwatch:namespace" = "CloudWatchSynthetics"
          }
        }
      },
      # X-Ray tracing (optional)
      {
        Sid    = "XRayTracing"
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments"
        ]
        Resource = "*"
      }
    ]
  })
}
