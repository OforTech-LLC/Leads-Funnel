/**
 * Admin API Infrastructure
 *
 * Lambda function and API Gateway routes for admin operations.
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
  handler       = "admin-handler.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 512

  filename         = var.lambda_zip_path
  source_code_hash = var.lambda_zip_hash

  architectures = ["arm64"]

  environment {
    variables = {
      ENV                     = var.environment
      PROJECT_NAME            = var.project_name
      AWS_REGION_NAME         = var.aws_region
      COGNITO_USER_POOL_ID    = var.cognito_user_pool_id
      COGNITO_CLIENT_ID       = var.cognito_client_id
      COGNITO_ISSUER          = var.cognito_issuer
      EXPORTS_BUCKET          = var.exports_bucket_name
      AUDIT_TABLE             = var.audit_table_name
      EXPORT_JOBS_TABLE       = var.export_jobs_table_name
      ALLOWED_EMAILS_SSM_PATH = "/${var.project_name}/${var.environment}/admin/allowed_emails"
      FEATURE_FLAG_SSM_PATH   = "/${var.project_name}/${var.environment}/features/enable_admin_console"
      IP_ALLOWLIST_FLAG_PATH  = "/${var.project_name}/${var.environment}/features/enable_admin_ip_allowlist"
      IP_ALLOWLIST_SSM_PATH   = "/${var.project_name}/${var.environment}/admin/allowed_cidrs"
      LOG_LEVEL               = var.environment == "prod" ? "info" : "debug"
    }
  }

  tracing_config {
    mode = var.xray_enabled ? "Active" : "PassThrough"
  }

  depends_on = [aws_cloudwatch_log_group.admin]

  tags = var.tags
}

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

# DynamoDB - Lead tables (read/write with restricted ARN pattern)
resource "aws_iam_role_policy" "admin_lambda_dynamodb_leads" {
  name = "${var.project_name}-${var.environment}-admin-lambda-ddb-leads"
  role = aws_iam_role.admin_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan",
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

# =====================================================
# CloudWatch Log Group
# =====================================================

resource "aws_cloudwatch_log_group" "admin" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-admin-handler"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.admin_logs.arn

  tags = var.tags
}

# =====================================================
# API Gateway Integration
# =====================================================

resource "aws_apigatewayv2_integration" "admin" {
  api_id                 = var.api_gateway_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.admin.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Admin routes
resource "aws_apigatewayv2_route" "admin_funnels" {
  api_id    = var.api_gateway_id
  route_key = "GET /admin/funnels"
  target    = "integrations/${aws_apigatewayv2_integration.admin.id}"
}

resource "aws_apigatewayv2_route" "admin_query" {
  api_id    = var.api_gateway_id
  route_key = "POST /admin/query"
  target    = "integrations/${aws_apigatewayv2_integration.admin.id}"
}

resource "aws_apigatewayv2_route" "admin_leads_update" {
  api_id    = var.api_gateway_id
  route_key = "POST /admin/leads/update"
  target    = "integrations/${aws_apigatewayv2_integration.admin.id}"
}

resource "aws_apigatewayv2_route" "admin_leads_bulk_update" {
  api_id    = var.api_gateway_id
  route_key = "POST /admin/leads/bulk-update"
  target    = "integrations/${aws_apigatewayv2_integration.admin.id}"
}

resource "aws_apigatewayv2_route" "admin_exports_create" {
  api_id    = var.api_gateway_id
  route_key = "POST /admin/exports/create"
  target    = "integrations/${aws_apigatewayv2_integration.admin.id}"
}

resource "aws_apigatewayv2_route" "admin_exports_status" {
  api_id    = var.api_gateway_id
  route_key = "GET /admin/exports/status"
  target    = "integrations/${aws_apigatewayv2_integration.admin.id}"
}

resource "aws_apigatewayv2_route" "admin_exports_download" {
  api_id    = var.api_gateway_id
  route_key = "GET /admin/exports/download"
  target    = "integrations/${aws_apigatewayv2_integration.admin.id}"
}

resource "aws_apigatewayv2_route" "admin_stats" {
  api_id    = var.api_gateway_id
  route_key = "GET /admin/stats"
  target    = "integrations/${aws_apigatewayv2_integration.admin.id}"
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "admin_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.admin.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*"
}
