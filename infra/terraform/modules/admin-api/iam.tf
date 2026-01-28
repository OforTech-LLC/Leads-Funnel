# =============================================================================
# Admin API IAM Roles and Policies
# =============================================================================
# Lambda execution role and policies for:
# - CloudWatch Logs (with KMS)
# - DynamoDB (lead tables + admin tables)
# - S3 (exports bucket)
# - SSM (parameter read)
# - X-Ray (optional)
# =============================================================================

# =====================================================
# Lambda IAM Role
# =====================================================

resource "aws_iam_role" "admin_lambda" {
  name = "${var.project_name}-${var.environment}-admin-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# CloudWatch Logs - Scoped to specific log group
resource "aws_iam_role_policy" "admin_lambda_logs" {
  name = "${var.project_name}-${var.environment}-admin-lambda-logs"
  role = aws_iam_role.admin_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.admin.arn}:*"
      },
      # KMS permissions for encrypted logs
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.admin_logs.arn
      }
    ]
  })
}

# DynamoDB - Lead tables: Scan separated from key-restricted operations
resource "aws_iam_role_policy" "admin_lambda_dynamodb_leads" {
  name = "${var.project_name}-${var.environment}-admin-lambda-ddb-leads"
  role = aws_iam_role.admin_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Key-restricted operations (GetItem, Query, UpdateItem, BatchGetItem)
      {
        Sid    = "DynamoDBKeyRestrictedOps"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:UpdateItem",
          "dynamodb:BatchGetItem"
        ]
        Resource = [
          "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${var.project_name}-${var.environment}-*",
          "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${var.project_name}-${var.environment}-*/index/*"
        ]
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = ["LEAD#*"]
          }
        }
      },
      # Scan permission - scoped to specific table ARNs (no LeadingKeys condition, since Scan reads all keys)
      {
        Sid    = "DynamoDBScan"
        Effect = "Allow"
        Action = [
          "dynamodb:Scan"
        ]
        Resource = [
          "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${var.project_name}-${var.environment}-*",
          "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${var.project_name}-${var.environment}-*/index/*"
        ]
      }
    ]
  })
}

# DynamoDB - Admin tables (audit, export jobs) - Scoped to specific tables
resource "aws_iam_role_policy" "admin_lambda_dynamodb_admin" {
  name = "${var.project_name}-${var.environment}-admin-lambda-ddb-admin"
  role = aws_iam_role.admin_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ]
        Resource = [
          var.audit_table_arn,
          var.export_jobs_table_arn
        ]
      }
    ]
  })
}

# DynamoDB - List/Describe tables (scoped to project tables only)
resource "aws_iam_role_policy" "admin_lambda_dynamodb_list" {
  name = "${var.project_name}-${var.environment}-admin-lambda-ddb-list"
  role = aws_iam_role.admin_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:ListTables"
        ]
        # ListTables does not support resource-level permissions, but we filter in code
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.aws_region
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeTable"
        ]
        # Scoped to only this project's tables
        Resource = "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${var.project_name}-${var.environment}-*"
      }
    ]
  })
}

# S3 - Exports bucket (scoped to specific bucket)
resource "aws_iam_role_policy" "admin_lambda_s3" {
  name = "${var.project_name}-${var.environment}-admin-lambda-s3"
  role = aws_iam_role.admin_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.exports_bucket_arn,
          "${var.exports_bucket_arn}/*"
        ]
      }
    ]
  })
}

# SSM - Read parameters (scoped to project/environment)
resource "aws_iam_role_policy" "admin_lambda_ssm" {
  name = "${var.project_name}-${var.environment}-admin-lambda-ssm"
  role = aws_iam_role.admin_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/*"
        ]
      }
    ]
  })
}

# X-Ray (optional) - Scoped permissions
resource "aws_iam_role_policy" "admin_lambda_xray" {
  count = var.xray_enabled ? 1 : 0
  name  = "${var.project_name}-${var.environment}-admin-lambda-xray"
  role  = aws_iam_role.admin_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords"
        ]
        # X-Ray requires * for resource, but we limit to specific actions
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.aws_region
          }
        }
      }
    ]
  })
}
