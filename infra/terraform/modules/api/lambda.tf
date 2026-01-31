# =============================================================================
# Lambda Function - Lead Capture
# =============================================================================
# This file creates:
# - Lambda function for lead capture
# - IAM role with least-privilege permissions
# - CloudWatch Log Group
# - X-Ray tracing (optional)
# =============================================================================

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Archive the placeholder handler
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_placeholder"
  output_path = "${path.module}/lambda_placeholder.zip"
}

# -----------------------------------------------------------------------------
# Lambda Function
# -----------------------------------------------------------------------------
# Lead capture Lambda function running Swift custom runtime.
# The Swift code is compiled and deployed from backend/lambda/lambda.zip.
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "lead_capture" {
  function_name = "${var.project_name}-${var.environment}-lead-capture"
  description   = "Lead capture handler for ${var.project_name}"

  # ZIP deployment
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  handler       = "bootstrap"
  runtime       = "provided.al2023"
  architectures = ["arm64"] # Graviton - cheaper and faster

  memory_size = var.lambda_memory_mb
  timeout     = 30 # Increased from 10s to handle multiple DynamoDB operations

  # Reserved concurrency (prevent runaway costs)
  reserved_concurrent_executions = var.lambda_reserved_concurrency

  role = aws_iam_role.lambda.arn

  # Lambda Web Adapter layer - enables running HTTP servers in Lambda
  # See: https://github.com/awslabs/aws-lambda-web-adapter
  layers = [
    "arn:aws:lambda:${data.aws_region.current.name}:753240598075:layer:LambdaAdapterLayerArm64:25"
  ]

  environment {
    variables = {
      # Lambda Web Adapter configuration
      AWS_LAMBDA_EXEC_WRAPPER = "/opt/bootstrap"
      PORT                     = "8080"

      # DynamoDB configuration
      DDB_TABLE_NAME = var.dynamodb_table_name

      # EventBridge configuration
      EVENT_BUS_NAME = var.event_bus_name

      # Environment
      ENV = var.environment

      # Rate limiting
      RATE_LIMIT_MAX        = tostring(var.rate_limit_max)
      RATE_LIMIT_WINDOW_MIN = tostring(var.rate_limit_window_min)

      # Idempotency TTL
      IDEMPOTENCY_TTL_HOURS = tostring(var.idempotency_ttl_hours)

      # IP hashing salt - passed as SSM parameter name for runtime retrieval
      # SECURITY: The raw salt value is marked sensitive in variables.tf.
      # For production, consider storing in Secrets Manager and passing the ARN instead.
      IP_HASH_SALT = var.ip_hash_salt
    }
  }

  # X-Ray tracing
  tracing_config {
    mode = var.enable_xray ? "Active" : "PassThrough"
  }

  # Ensure log group is created first
  depends_on = [
    aws_cloudwatch_log_group.lambda,
    aws_iam_role_policy_attachment.lambda_basic,
    aws_iam_role_policy.lambda_custom,
  ]

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-lead-capture"
  })
}

# -----------------------------------------------------------------------------
# CloudWatch Log Group
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-lead-capture"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-lambda-logs"
  })
}

# -----------------------------------------------------------------------------
# IAM Role
# -----------------------------------------------------------------------------
resource "aws_iam_role" "lambda" {
  name = "${var.project_name}-${var.environment}-lead-capture-role"

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

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-lead-capture-role"
  })
}

# Basic execution role (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# X-Ray policy (if enabled)
resource "aws_iam_role_policy_attachment" "lambda_xray" {
  count = var.enable_xray ? 1 : 0

  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# Custom policy for DynamoDB and EventBridge (least privilege)
resource "aws_iam_role_policy" "lambda_custom" {
  name = "${var.project_name}-${var.environment}-lead-capture-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # DynamoDB permissions - specific table only
      {
        Sid    = "DynamoDBWrite"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
        ]
        Resource = var.dynamodb_table_arn
      },
      {
        Sid    = "DynamoDBQuery"
        Effect = "Allow"
        Action = [
          "dynamodb:Query",
          "dynamodb:GetItem",
        ]
        Resource = [
          var.dynamodb_table_arn,
          "${var.dynamodb_table_arn}/index/*"
        ]
      },
      # EventBridge permissions - specific event bus only
      {
        Sid    = "EventBridgePutEvents"
        Effect = "Allow"
        Action = [
          "events:PutEvents"
        ]
        Resource = var.event_bus_arn
      },
      # CloudWatch Logs - scoped to specific log group
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.lambda.arn}:*"
      }
    ]
  })
}
