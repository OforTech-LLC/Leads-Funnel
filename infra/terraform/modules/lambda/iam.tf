# =============================================================================
# Lambda IAM Roles and Policies
# =============================================================================
# IAM roles and inline policies for all Lambda functions:
# - Lead Handler: DynamoDB, EventBridge, Secrets Manager, SSM, KMS
# - Health Handler: Basic execution + KMS
# - Voice Handler: DynamoDB, Secrets Manager, SSM, EventBridge, KMS
# =============================================================================

# -----------------------------------------------------------------------------
# Lead Handler IAM Role
# -----------------------------------------------------------------------------
resource "aws_iam_role" "lead_handler" {
  name = "${local.function_prefix}-lead-handler-role"

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
    Name = "${local.function_prefix}-lead-handler-role"
  })
}

resource "aws_iam_role_policy_attachment" "lead_handler_basic" {
  role       = aws_iam_role.lead_handler.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lead_handler_xray" {
  count = var.enable_xray ? 1 : 0

  role       = aws_iam_role.lead_handler.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_iam_role_policy" "lead_handler" {
  name = "${local.function_prefix}-lead-handler-policy"
  role = aws_iam_role.lead_handler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # DynamoDB - Access specific funnel tables (scoped to project/environment)
      {
        Sid    = "DynamoDBFunnelTables"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:Query",
          "dynamodb:GetItem",
        ]
        Resource = concat(
          var.all_funnel_table_arns,
          var.all_funnel_gsi_arns,
          [var.rate_limits_table_arn, var.idempotency_table_arn]
        )
      },
      # EventBridge - Put events to specific bus
      {
        Sid      = "EventBridgePutEvents"
        Effect   = "Allow"
        Action   = ["events:PutEvents"]
        Resource = var.event_bus_arn
      },
      # Secrets Manager - Read specific secret only
      {
        Sid    = "SecretsManagerRead"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
        ]
        Resource = var.ip_hash_salt_secret_arn
      },
      # SSM Parameter Store - Read specific parameters
      {
        Sid    = "SSMParameterRead"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath",
        ]
        Resource = var.ssm_parameter_arns
      },
      # KMS - Decrypt for CloudWatch Logs
      {
        Sid    = "KMSDecryptLogs"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.lambda_logs.arn
      },
    ]
  })
}

# -----------------------------------------------------------------------------
# Health Handler IAM Role
# -----------------------------------------------------------------------------
resource "aws_iam_role" "health_handler" {
  name = "${local.function_prefix}-health-handler-role"

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
    Name = "${local.function_prefix}-health-handler-role"
  })
}

resource "aws_iam_role_policy_attachment" "health_handler_basic" {
  role       = aws_iam_role.health_handler.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "health_handler_xray" {
  count = var.enable_xray ? 1 : 0

  role       = aws_iam_role.health_handler.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# KMS permissions for health handler logs
resource "aws_iam_role_policy" "health_handler_kms" {
  name = "${local.function_prefix}-health-handler-kms-policy"
  role = aws_iam_role.health_handler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "KMSDecryptLogs"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.lambda_logs.arn
      }
    ]
  })
}

# DynamoDB permissions for health check connectivity test
resource "aws_iam_role_policy" "health_handler_dynamodb" {
  name = "${local.function_prefix}-health-handler-dynamodb-policy"
  role = aws_iam_role.health_handler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBDescribe"
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeTable"
        ]
        Resource = "arn:aws:dynamodb:*:*:table/${var.project_name}-${var.environment}-*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Voice Handler IAM Role (shared by voice-start and voice-webhook)
# -----------------------------------------------------------------------------
resource "aws_iam_role" "voice_handler" {
  count = var.enable_voice_agent ? 1 : 0

  name = "${local.function_prefix}-voice-handler-role"

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
    Name = "${local.function_prefix}-voice-handler-role"
  })
}

resource "aws_iam_role_policy_attachment" "voice_handler_basic" {
  count = var.enable_voice_agent ? 1 : 0

  role       = aws_iam_role.voice_handler[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "voice_handler_xray" {
  count = var.enable_voice_agent && var.enable_xray ? 1 : 0

  role       = aws_iam_role.voice_handler[0].name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_iam_role_policy" "voice_handler" {
  count = var.enable_voice_agent ? 1 : 0

  name = "${local.function_prefix}-voice-handler-policy"
  role = aws_iam_role.voice_handler[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # DynamoDB - Access specific funnel tables (scoped)
      {
        Sid    = "DynamoDBFunnels"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
        ]
        Resource = concat(
          var.all_funnel_table_arns,
          var.all_funnel_gsi_arns,
          [var.rate_limits_table_arn, var.idempotency_table_arn]
        )
      },
      # Secrets Manager - Read specific secrets only
      {
        Sid    = "SecretsManagerRead"
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = compact([
          var.twilio_secret_arn,
          var.elevenlabs_secret_arn,
          var.webhook_secret_arn,
        ])
      },
      # SSM Parameter Store - Read specific parameters
      {
        Sid    = "SSMParameterRead"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
        ]
        Resource = var.ssm_parameter_arns
      },
      # EventBridge - Put events to specific bus
      {
        Sid      = "EventBridgePutEvents"
        Effect   = "Allow"
        Action   = ["events:PutEvents"]
        Resource = var.event_bus_arn
      },
      # KMS - Decrypt for CloudWatch Logs
      {
        Sid    = "KMSDecryptLogs"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.lambda_logs.arn
      },
    ]
  })
}
