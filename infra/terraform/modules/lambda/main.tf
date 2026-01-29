# =============================================================================
# Lambda Module - Lead Capture & Voice Agent Functions
# =============================================================================
# This file contains:
# - Data sources and locals
# - KMS key for CloudWatch Log encryption
# - lead-handler: Main lead capture Lambda
# - health-handler: Health check endpoint
# - voice-start: Initiates voice agent calls (Twilio)
# - voice-webhook: Handles Twilio voice webhooks
# - Placeholder archive for initial deployment
#
# IAM roles and policies are defined in iam.tf
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
    ALLOWED_ORIGINS                     = join(",", var.allowed_origins)
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
# KMS Key for CloudWatch Log Encryption
# =============================================================================
# Creates a KMS key for encrypting Lambda CloudWatch log groups
# =============================================================================

resource "aws_kms_key" "lambda_logs" {
  description             = "KMS key for Lambda CloudWatch Logs - ${var.project_name}-${var.environment}"
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
            "kms:EncryptionContext:aws:logs:arn" = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.function_prefix}*"
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${local.function_prefix}-lambda-logs-kms"
  })
}

resource "aws_kms_alias" "lambda_logs" {
  name          = "alias/${var.project_name}-${var.environment}-lambda-logs"
  target_key_id = aws_kms_key.lambda_logs.key_id
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
        EVENT_BUS_NAME            = var.event_bus_name
        FUNNEL_IDS                = join(",", var.funnel_ids)
        IP_HASH_SALT_ARN          = var.ip_hash_salt_secret_arn
        DDB_TABLE_NAME            = var.platform_leads_table_name
        PLATFORM_LEADS_TABLE_NAME = var.platform_leads_table_name
        AVATARS_BUCKET            = var.avatars_bucket_name
        AVATAR_PUBLIC_BASE_URL    = var.avatar_public_base_url
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
  kms_key_id        = aws_kms_key.lambda_logs.arn

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
    variables = merge(local.common_env_vars, local.dynamodb_env_vars, {
      VERSION        = var.app_version
      DDB_TABLE_NAME = var.rate_limits_table_name # For health check connectivity test
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
  kms_key_id        = aws_kms_key.lambda_logs.arn

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
  kms_key_id        = aws_kms_key.lambda_logs.arn

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
  kms_key_id        = aws_kms_key.lambda_logs.arn

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
