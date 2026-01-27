# =============================================================================
# Lambda Worker Module - SQS-Triggered Lambda Functions
# =============================================================================
# Creates a Lambda function configured for background processing:
# - SQS event source mapping
# - IAM role with DynamoDB, SSM, SQS, EventBridge permissions
# - CloudWatch log group
# - Reserved concurrency
# - X-Ray tracing (optional)
#
# Used for AssignmentWorker, NotificationWorker, PreTokenGeneration, etc.
# =============================================================================

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# Placeholder Archive (used when real code is not yet deployed)
# -----------------------------------------------------------------------------
data "archive_file" "placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder-${var.function_name}.zip"

  source {
    content  = <<-EOF
      exports.handler = async (event) => {
        console.log('Placeholder handler invoked', JSON.stringify(event));
        return { statusCode: 200, body: JSON.stringify({ message: 'Placeholder - deploy actual code' }) };
      };
    EOF
    filename = "index.js"
  }
}

# -----------------------------------------------------------------------------
# CloudWatch Log Group
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "worker" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn

  tags = merge(var.tags, {
    Name     = "${var.function_name}-logs"
    Function = var.function_name
  })
}

# -----------------------------------------------------------------------------
# Lambda Function
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "worker" {
  function_name = var.function_name
  description   = var.description

  filename         = var.zip_path != "" ? var.zip_path : data.archive_file.placeholder.output_path
  source_code_hash = var.zip_path != "" ? (var.zip_hash != "" ? var.zip_hash : filebase64sha256(var.zip_path)) : data.archive_file.placeholder.output_base64sha256

  handler       = var.handler
  runtime       = var.runtime
  architectures = [var.architecture]

  memory_size = var.memory_mb
  timeout     = var.timeout_seconds

  reserved_concurrent_executions = var.reserved_concurrency

  role = aws_iam_role.worker.arn

  environment {
    variables = var.environment_variables
  }

  tracing_config {
    mode = var.enable_xray ? "Active" : "PassThrough"
  }

  depends_on = [
    aws_cloudwatch_log_group.worker,
    aws_iam_role_policy_attachment.basic_execution,
    aws_iam_role_policy.worker,
  ]

  tags = merge(var.tags, {
    Name     = var.function_name
    Function = var.function_name
  })
}

# -----------------------------------------------------------------------------
# SQS Event Source Mapping (optional - not used for Cognito triggers)
# -----------------------------------------------------------------------------
resource "aws_lambda_event_source_mapping" "sqs" {
  count = var.sqs_queue_arn != null ? 1 : 0

  event_source_arn                   = var.sqs_queue_arn
  function_name                      = aws_lambda_function.worker.arn
  batch_size                         = var.sqs_batch_size
  maximum_batching_window_in_seconds = var.sqs_batching_window_seconds
  enabled                            = true

  function_response_types = ["ReportBatchItemFailures"]
}

# =============================================================================
# IAM Role and Policies
# =============================================================================

# -----------------------------------------------------------------------------
# IAM Role
# -----------------------------------------------------------------------------
resource "aws_iam_role" "worker" {
  name = "${var.function_name}-role"

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
    Name = "${var.function_name}-role"
  })
}

# Basic Lambda execution policy (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.worker.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# X-Ray tracing policy
resource "aws_iam_role_policy_attachment" "xray" {
  count = var.enable_xray ? 1 : 0

  role       = aws_iam_role.worker.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# -----------------------------------------------------------------------------
# Worker Policy - DynamoDB, SSM, SQS, EventBridge, KMS
# -----------------------------------------------------------------------------
resource "aws_iam_role_policy" "worker" {
  name = "${var.function_name}-policy"
  role = aws_iam_role.worker.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      # DynamoDB access
      length(var.dynamodb_table_arns) > 0 ? [{
        Sid    = "DynamoDBAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:BatchWriteItem",
          "dynamodb:BatchGetItem",
        ]
        Resource = concat(
          var.dynamodb_table_arns,
          [for arn in var.dynamodb_table_arns : "${arn}/index/*"]
        )
      }] : [],

      # SSM Parameter Store access
      length(var.ssm_parameter_arns) > 0 ? [{
        Sid    = "SSMParameterRead"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath",
        ]
        Resource = var.ssm_parameter_arns
      }] : [],

      # SQS access (for receiving from queue)
      var.sqs_queue_arn != null ? [{
        Sid    = "SQSReceive"
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility",
        ]
        Resource = var.sqs_queue_arn
      }] : [],

      # SQS send access (for sending to other queues)
      length(var.sqs_send_queue_arns) > 0 ? [{
        Sid    = "SQSSend"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
        ]
        Resource = var.sqs_send_queue_arns
      }] : [],

      # EventBridge access
      var.event_bus_arn != null ? [{
        Sid      = "EventBridgePutEvents"
        Effect   = "Allow"
        Action   = ["events:PutEvents"]
        Resource = var.event_bus_arn
      }] : [],

      # Secrets Manager access
      length(var.secrets_arns) > 0 ? [{
        Sid      = "SecretsManagerRead"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = var.secrets_arns
      }] : [],

      # SES access (for sending emails) - scoped to specific identities
      var.enable_ses ? [{
        Sid    = "SESSendEmail"
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
        ]
        Resource = var.ses_identity_arns
      }] : [],

      # SNS access (for sending SMS) - scoped to specific topics
      var.enable_sns ? [{
        Sid    = "SNSPublish"
        Effect = "Allow"
        Action = [
          "sns:Publish",
        ]
        Resource = var.sns_topic_arns
      }] : [],

      # KMS access for CloudWatch Logs encryption
      var.kms_key_arn != null ? [{
        Sid    = "KMSDecryptLogs"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
        ]
        Resource = var.kms_key_arn
      }] : [],

      # Additional custom policy statements
      var.additional_policy_statements,
    )
  })
}
