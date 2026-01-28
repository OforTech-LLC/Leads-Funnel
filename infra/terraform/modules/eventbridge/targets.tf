# =============================================================================
# EventBridge Targets - SQS Queues, Lambda Targets, and Logging
# =============================================================================
# This file contains:
# - SQS lead processing queue and DLQ (optional)
# - SQS queue policy for EventBridge
# - EventBridge targets: lead.created -> SQS, Voice Lambda
# - EventBridge targets: lead.qualified -> SQS
# - CloudWatch logging for EventBridge events (optional)
#
# Related files:
# - main.tf: Event bus and rules
# =============================================================================

# =============================================================================
# SQS Queues (Optional)
# =============================================================================

# -----------------------------------------------------------------------------
# Lead Processing Queue
# -----------------------------------------------------------------------------
resource "aws_sqs_queue" "lead_processing" {
  count = var.enable_sqs ? 1 : 0

  name = "${var.project_name}-${var.environment}-lead-processing"

  visibility_timeout_seconds = 60
  message_retention_seconds  = 345600 # 4 days
  receive_wait_time_seconds  = 20     # Long polling
  delay_seconds              = 0

  sqs_managed_sse_enabled = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[0].arn
    maxReceiveCount     = 3
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-lead-processing"
    Type = "processing-queue"
  })
}

# -----------------------------------------------------------------------------
# Dead Letter Queue
# -----------------------------------------------------------------------------
resource "aws_sqs_queue" "dlq" {
  count = var.enable_sqs ? 1 : 0

  name = "${var.project_name}-${var.environment}-lead-processing-dlq"

  message_retention_seconds = 1209600 # 14 days
  sqs_managed_sse_enabled   = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-lead-processing-dlq"
    Type = "dead-letter-queue"
  })
}

# -----------------------------------------------------------------------------
# SQS Queue Policy - Allow EventBridge
# -----------------------------------------------------------------------------
resource "aws_sqs_queue_policy" "lead_processing" {
  count = var.enable_sqs ? 1 : 0

  queue_url = aws_sqs_queue.lead_processing[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEventBridgeLeadCreated"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.lead_processing[0].arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_cloudwatch_event_rule.lead_created.arn
          }
        }
      },
      {
        Sid    = "AllowEventBridgeLeadQualified"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.lead_processing[0].arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_cloudwatch_event_rule.lead_qualified.arn
          }
        }
      }
    ]
  })
}

# =============================================================================
# EventBridge Targets
# =============================================================================

# -----------------------------------------------------------------------------
# Target: lead.created -> SQS
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_target" "lead_created_sqs" {
  count = var.enable_sqs ? 1 : 0

  rule           = aws_cloudwatch_event_rule.lead_created.name
  event_bus_name = aws_cloudwatch_event_bus.leads.name
  target_id      = "sqs-lead-processing"
  arn            = aws_sqs_queue.lead_processing[0].arn

  input_transformer {
    input_template = <<-EOF
      {
        "eventId": <id>,
        "source": <source>,
        "detailType": <detail-type>,
        "time": <time>,
        "account": <account>,
        "region": <region>,
        "detail": <detail>
      }
    EOF
    input_paths = {
      id          = "$.id"
      source      = "$.source"
      detail-type = "$.detail-type"
      time        = "$.time"
      account     = "$.account"
      region      = "$.region"
      detail      = "$.detail"
    }
  }
}

# -----------------------------------------------------------------------------
# Target: lead.created -> Voice Start Lambda (Optional)
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_target" "lead_created_voice" {
  count = var.enable_voice_agent && var.voice_start_lambda_arn != null ? 1 : 0

  rule           = aws_cloudwatch_event_rule.lead_created.name
  event_bus_name = aws_cloudwatch_event_bus.leads.name
  target_id      = "lambda-voice-start"
  arn            = var.voice_start_lambda_arn
}

# Lambda permission for EventBridge to invoke voice-start
resource "aws_lambda_permission" "eventbridge_voice_start" {
  count = var.enable_voice_agent && var.voice_start_lambda_arn != null ? 1 : 0

  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.voice_start_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.lead_created.arn
}

# -----------------------------------------------------------------------------
# Target: lead.qualified -> SQS
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_target" "lead_qualified_sqs" {
  count = var.enable_sqs ? 1 : 0

  rule           = aws_cloudwatch_event_rule.lead_qualified.name
  event_bus_name = aws_cloudwatch_event_bus.leads.name
  target_id      = "sqs-qualified-processing"
  arn            = aws_sqs_queue.lead_processing[0].arn

  input_transformer {
    input_template = <<-EOF
      {
        "eventId": <id>,
        "source": <source>,
        "detailType": <detail-type>,
        "time": <time>,
        "account": <account>,
        "region": <region>,
        "detail": <detail>
      }
    EOF
    input_paths = {
      id          = "$.id"
      source      = "$.source"
      detail-type = "$.detail-type"
      time        = "$.time"
      account     = "$.account"
      region      = "$.region"
      detail      = "$.detail"
    }
  }
}

# =============================================================================
# CloudWatch Log Group for EventBridge (Optional)
# =============================================================================
resource "aws_cloudwatch_log_group" "events" {
  count = var.enable_logging ? 1 : 0

  name              = "/aws/events/${var.project_name}-${var.environment}-leads"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-events-logs"
  })
}

# EventBridge target to CloudWatch Logs
resource "aws_cloudwatch_event_target" "lead_created_logs" {
  count = var.enable_logging ? 1 : 0

  rule           = aws_cloudwatch_event_rule.lead_created.name
  event_bus_name = aws_cloudwatch_event_bus.leads.name
  target_id      = "cloudwatch-logs"
  arn            = aws_cloudwatch_log_group.events[0].arn
}

# CloudWatch Logs resource policy for EventBridge
resource "aws_cloudwatch_log_resource_policy" "events" {
  count = var.enable_logging ? 1 : 0

  policy_name = "${var.project_name}-${var.environment}-events-log-policy"

  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "EventBridgeLogPolicy"
      Effect = "Allow"
      Principal = {
        Service = "events.amazonaws.com"
      }
      Action = [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Resource = "${aws_cloudwatch_log_group.events[0].arn}:*"
    }]
  })
}
