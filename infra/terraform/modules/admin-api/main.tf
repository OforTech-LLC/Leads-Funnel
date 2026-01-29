/**
 * Admin API Infrastructure - Lambda + CloudWatch Logs
 *
 * This file contains:
 * - KMS key for CloudWatch log encryption
 * - Admin Lambda function
 * - CloudWatch log group
 *
 * IAM roles and policies are in iam.tf
 * API Gateway routes are in routes.tf
 */

# =====================================================
# Data Sources
# =====================================================

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# =====================================================
# KMS Key for CloudWatch Log Encryption
# =====================================================

resource "aws_kms_key" "admin_logs" {
  description             = "KMS key for Admin API CloudWatch Logs - ${var.project_name}-${var.environment}"
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
      # Allow CloudWatch Logs to use the key
      {
        Sid    = "AllowCloudWatchLogs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${var.aws_region}.amazonaws.com"
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
            "kms:EncryptionContext:aws:logs:arn" = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project_name}-${var.environment}-admin*"
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-admin-logs-kms"
  })
}

resource "aws_kms_alias" "admin_logs" {
  name          = "alias/${var.project_name}-${var.environment}-admin-logs"
  target_key_id = aws_kms_key.admin_logs.key_id
}

# =====================================================
# Admin Lambda Function
# =====================================================

resource "aws_lambda_function" "admin" {
  function_name = "${var.project_name}-${var.environment}-admin-handler"
  role          = aws_iam_role.admin_lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  timeout       = 30
  memory_size   = 512

  filename         = var.lambda_zip_path
  source_code_hash = var.lambda_zip_hash

  architectures = ["arm64"]

  environment {
    variables = {
      ENV                       = var.environment
      PROJECT_NAME              = var.project_name
      AWS_REGION_NAME           = var.aws_region
      COGNITO_USER_POOL_ID      = var.cognito_user_pool_id
      COGNITO_CLIENT_ID         = var.cognito_client_id
      COGNITO_ISSUER            = var.cognito_issuer
      EXPORTS_BUCKET            = var.exports_bucket_name
      AUDIT_TABLE               = var.audit_table_name
      EXPORT_JOBS_TABLE         = var.export_jobs_table_name
      PLATFORM_LEADS_TABLE_NAME = var.platform_leads_table_name
      ORGS_TABLE_NAME           = var.platform_orgs_table_name
      USERS_TABLE_NAME          = var.platform_users_table_name
      MEMBERSHIPS_TABLE_NAME    = var.platform_memberships_table_name
      ASSIGNMENT_RULES_TABLE    = var.platform_assignment_rules_table_name
      NOTIFICATIONS_TABLE       = var.platform_notifications_table_name
      UNASSIGNED_TABLE_NAME     = var.platform_unassigned_table_name
      ALLOWED_EMAILS_SSM_PATH   = "/${var.project_name}/${var.environment}/admin/allowed_emails"
      IP_ALLOWLIST_FLAG_PATH    = "/${var.project_name}/${var.environment}/features/enable_admin_ip_allowlist"
      IP_ALLOWLIST_SSM_PATH     = "/${var.project_name}/${var.environment}/admin/allowed_cidrs"
      LOG_LEVEL                 = var.environment == "prod" ? "info" : "debug"
    }
  }

  tracing_config {
    mode = var.xray_enabled ? "Active" : "PassThrough"
  }

  depends_on = [aws_cloudwatch_log_group.admin]

  tags = var.tags
}

# =====================================================
# CloudWatch Log Group
# =====================================================

resource "aws_cloudwatch_log_group" "admin" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-admin-handler"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.admin_logs.arn

  tags = var.tags
}
