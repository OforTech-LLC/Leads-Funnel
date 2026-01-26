# =============================================================================
# Lambda Module - Lead Capture & Voice Agent Functions
# =============================================================================
# This module creates:
# - lead-handler: Main lead capture Lambda
# - health-handler: Health check endpoint
# - voice-start: Initiates voice agent calls (Twilio)
# - voice-webhook: Handles Twilio voice webhooks
#
# All functions use ARM64 (Graviton2) for cost efficiency.
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
  function_prefix = "${var.project_name}-${var.environment}"

  # Common environment variables for all Lambda functions
  common_env_vars = {
    ENVIRONMENT                         = var.environment
    PROJECT_NAME                        = var.project_name
    LOG_LEVEL                           = var.environment == "prod" ? "INFO" : "DEBUG"
    AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
  }

  # DynamoDB related environment variables
  dynamodb_env_vars = {
    RATE_LIMITS_TABLE_NAME = var.rate_limits_table_name
    IDEMPOTENCY_TABLE_NAME = var.idempotency_table_name
  }

  # Voice agent environment variables (for voice-start and voice-webhook)
  voice_env_vars = {
    TWILIO_SECRET_ARN     = var.twilio_secret_arn
    ELEVENLABS_SECRET_ARN = var.elevenlabs_secret_arn
    VOICE_WEBHOOK_URL     = "https://api.${var.root_domain}/voice/webhook"
    VOICE_STATUS_CALLBACK = "https://api.${var.root_domain}/voice/status"
  }
}

# =============================================================================
# Lead Handler Lambda
# =============================================================================
# Main lead capture function - handles POST /lead requests
# Stores leads in per-funnel DynamoDB tables
# =============================================================================

resource "aws_lambda_function" "lead_handler" {
  function_name = "${local.function_prefix}-lead-handler"
  description   = "Lead capture handler for ${var.project_name}"

  filename         = var.lead_handler_zip_path != "" ? var.lead_handler_zip_path : data.archive_file.placeholder.output_path
  source_code_hash = var.lead_handler_zip_path != "" ? filebase64sha256(var.lead_handler_zip_path) : data.archive_file.placeholder.output_base64sha256

  handler       = var.lead_handler_handler
  runtime       = var.runtime
  architectures = ["arm64"]

  memory_size = var.lead_handler_memory_mb
  timeout     = var.lead_handler_timeout

  reserved_concurrent_executions = var.lead_handler_reserved_concurrency

  role = aws_iam_role.lead_handler.arn

  environment {
    variables = merge(
      local.common_env_vars,
      local.dynamodb_env_vars,
      {
        EVENT_BUS_NAME   = var.event_bus_name
        FUNNEL_IDS       = join(",", var.funnel_ids)
        IP_HASH_SALT_ARN = var.ip_hash_salt_secret_arn
      }
    )
  }

  tracing_config {
    mode = var.enable_xray ? "Active" : "PassThrough"
  }

  depends_on = [
    aws_cloudwatch_log_group.lead_handler,
    aws_iam_role_policy_attachment.lead_handler_basic,
    aws_iam_role_policy.lead_handler,
  ]

  tags = merge(var.tags, {
    Name     = "${local.function_prefix}-lead-handler"
    Function = "lead-handler"
  })
}

resource "aws_cloudwatch_log_group" "lead_handler" {
  name              = "/aws/lambda/${local.function_prefix}-lead-handler"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name = "${local.function_prefix}-lead-handler-logs"
  })
}

# =============================================================================
# Health Handler Lambda
# =============================================================================
# Health check endpoint - handles GET /health
# Returns system status and basic metrics
# =============================================================================

resource "aws_lambda_function" "health_handler" {
  function_name = "${local.function_prefix}-health-handler"
  description   = "Health check handler for ${var.project_name}"

  filename         = var.health_handler_zip_path != "" ? var.health_handler_zip_path : data.archive_file.placeholder.output_path
  source_code_hash = var.health_handler_zip_path != "" ? filebase64sha256(var.health_handler_zip_path) : data.archive_file.placeholder.output_base64sha256

  handler       = var.health_handler_handler
  runtime       = var.runtime
  architectures = ["arm64"]

  memory_size = 128 # Minimal memory for health checks
  timeout     = 10

  role = aws_iam_role.health_handler.arn

  environment {
    variables = merge(local.common_env_vars, {
      VERSION = var.app_version
    })
  }

  tracing_config {
    mode = var.enable_xray ? "Active" : "PassThrough"
  }

  depends_on = [
    aws_cloudwatch_log_group.health_handler,
    aws_iam_role_policy_attachment.health_handler_basic,
  ]

  tags = merge(var.tags, {
    Name     = "${local.function_prefix}-health-handler"
    Function = "health-handler"
  })
}

resource "aws_cloudwatch_log_group" "health_handler" {
  name              = "/aws/lambda/${local.function_prefix}-health-handler"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name = "${local.function_prefix}-health-handler-logs"
  })
}

# =============================================================================
# Voice Start Lambda
# =============================================================================
# Initiates outbound voice calls via Twilio
# Triggered by EventBridge when enable_voice_agent is true
# =============================================================================

resource "aws_lambda_function" "voice_start" {
  count = var.enable_voice_agent ? 1 : 0

  function_name = "${local.function_prefix}-voice-start"
  description   = "Voice agent call initiator for ${var.project_name}"

  filename         = var.voice_start_zip_path != "" ? var.voice_start_zip_path : data.archive_file.placeholder.output_path
  source_code_hash = var.voice_start_zip_path != "" ? filebase64sha256(var.voice_start_zip_path) : data.archive_file.placeholder.output_base64sha256

  handler       = var.voice_start_handler
  runtime       = var.runtime
  architectures = ["arm64"]

  memory_size = var.voice_functions_memory_mb
  timeout     = 30

  reserved_concurrent_executions = var.voice_reserved_concurrency

  role = aws_iam_role.voice_handler[0].arn

  environment {
    variables = merge(
      local.common_env_vars,
      local.voice_env_vars,
      local.dynamodb_env_vars
    )
  }

  tracing_config {
    mode = var.enable_xray ? "Active" : "PassThrough"
  }

  depends_on = [
    aws_cloudwatch_log_group.voice_start[0],
    aws_iam_role_policy_attachment.voice_handler_basic[0],
    aws_iam_role_policy.voice_handler[0],
  ]

  tags = merge(var.tags, {
    Name     = "${local.function_prefix}-voice-start"
    Function = "voice-start"
  })
}

resource "aws_cloudwatch_log_group" "voice_start" {
  count = var.enable_voice_agent ? 1 : 0

  name              = "/aws/lambda/${local.function_prefix}-voice-start"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name = "${local.function_prefix}-voice-start-logs"
  })
}

# =============================================================================
# Voice Webhook Lambda
# =============================================================================
# Handles incoming Twilio webhooks for voice call events
# Processes call status updates and speech results
# =============================================================================

resource "aws_lambda_function" "voice_webhook" {
  count = var.enable_voice_agent ? 1 : 0

  function_name = "${local.function_prefix}-voice-webhook"
  description   = "Voice agent webhook handler for ${var.project_name}"

  filename         = var.voice_webhook_zip_path != "" ? var.voice_webhook_zip_path : data.archive_file.placeholder.output_path
  source_code_hash = var.voice_webhook_zip_path != "" ? filebase64sha256(var.voice_webhook_zip_path) : data.archive_file.placeholder.output_base64sha256

  handler       = var.voice_webhook_handler
  runtime       = var.runtime
  architectures = ["arm64"]

  memory_size = var.voice_functions_memory_mb
  timeout     = 30

  reserved_concurrent_executions = var.voice_reserved_concurrency

  role = aws_iam_role.voice_handler[0].arn

  environment {
    variables = merge(
      local.common_env_vars,
      local.voice_env_vars,
      local.dynamodb_env_vars,
      {
        WEBHOOK_SECRET_ARN = var.webhook_secret_arn
      }
    )
  }

  tracing_config {
    mode = var.enable_xray ? "Active" : "PassThrough"
  }

  depends_on = [
    aws_cloudwatch_log_group.voice_webhook[0],
    aws_iam_role_policy_attachment.voice_handler_basic[0],
    aws_iam_role_policy.voice_handler[0],
  ]

  tags = merge(var.tags, {
    Name     = "${local.function_prefix}-voice-webhook"
    Function = "voice-webhook"
  })
}

resource "aws_cloudwatch_log_group" "voice_webhook" {
  count = var.enable_voice_agent ? 1 : 0

  name              = "/aws/lambda/${local.function_prefix}-voice-webhook"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name = "${local.function_prefix}-voice-webhook-logs"
  })
}

# =============================================================================
# Placeholder Archive
# =============================================================================
# Used when actual Lambda code is not yet deployed
# =============================================================================

data "archive_file" "placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder.zip"

  source {
    content  = <<-EOF
      exports.handler = async (event) => {
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Placeholder - deploy actual code' })
        };
      };
    EOF
    filename = "index.js"
  }
}

# =============================================================================
# IAM Roles and Policies
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
      # DynamoDB - Access all funnel tables using wildcard pattern
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
        Resource = [
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${var.project_name}-${var.environment}-*",
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${var.project_name}-${var.environment}-*/index/*",
        ]
      },
      # EventBridge - Put events
      {
        Sid      = "EventBridgePutEvents"
        Effect   = "Allow"
        Action   = ["events:PutEvents"]
        Resource = var.event_bus_arn
      },
      # Secrets Manager - Read IP hash salt
      {
        Sid    = "SecretsManagerRead"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
        ]
        Resource = var.ip_hash_salt_secret_arn
      },
      # SSM Parameter Store - Read parameters using wildcard
      {
        Sid    = "SSMParameterRead"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath",
        ]
        Resource = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/*"
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
      # DynamoDB - Access all funnel tables using wildcard pattern
      {
        Sid    = "DynamoDBFunnels"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
        ]
        Resource = [
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${var.project_name}-${var.environment}-*",
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${var.project_name}-${var.environment}-*/index/*",
        ]
      },
      # Secrets Manager - Read Twilio and ElevenLabs secrets
      {
        Sid    = "SecretsManagerRead"
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = [
          var.twilio_secret_arn,
          var.elevenlabs_secret_arn,
          var.webhook_secret_arn,
        ]
      },
      # SSM Parameter Store - Read feature flags using wildcard
      {
        Sid    = "SSMParameterRead"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
        ]
        Resource = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/*"
      },
      # EventBridge - Put voice events
      {
        Sid      = "EventBridgePutEvents"
        Effect   = "Allow"
        Action   = ["events:PutEvents"]
        Resource = var.event_bus_arn
      },
    ]
  })
}
