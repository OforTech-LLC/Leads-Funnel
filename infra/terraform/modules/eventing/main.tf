# =============================================================================
# Eventing Module - EventBridge + SQS
# =============================================================================
# This module creates:
# - Custom EventBridge event bus
# - EventBridge rule for lead.created events
# - SQS queue for async processing (optional)
# - SQS dead-letter queue (optional)
# - EventBridge target to SQS
# =============================================================================

# -----------------------------------------------------------------------------
# EventBridge Event Bus
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_bus" "leads" {
  name = "${var.project_name}-${var.environment}-leads"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-leads"
  })
}

# -----------------------------------------------------------------------------
# EventBridge Rule - Lead Created
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_rule" "lead_created" {
  name           = "${var.project_name}-${var.environment}-lead-created"
  description    = "Capture lead.created events"
  event_bus_name = aws_cloudwatch_event_bus.leads.name

  event_pattern = jsonencode({
    source      = ["kanjona.leads"]
    detail-type = ["lead.created"]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-lead-created"
  })
}

# -----------------------------------------------------------------------------
# SQS Queue - Lead Processing (Optional)
# -----------------------------------------------------------------------------
resource "aws_sqs_queue" "processing" {
  count = var.enable_sqs ? 1 : 0

  name = "${var.project_name}-${var.environment}-lead-processing"

  visibility_timeout_seconds = 60       # Must be >= Lambda timeout
  message_retention_seconds  = 345600   # 4 days
  receive_wait_time_seconds  = 20       # Long polling

  # Server-side encryption
  sqs_managed_sse_enabled = true

  # Dead-letter queue
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[0].arn
    maxReceiveCount     = 3
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-lead-processing"
  })
}

# -----------------------------------------------------------------------------
# SQS Dead-Letter Queue (Optional)
# -----------------------------------------------------------------------------
resource "aws_sqs_queue" "dlq" {
  count = var.enable_sqs ? 1 : 0

  name = "${var.project_name}-${var.environment}-lead-processing-dlq"

  message_retention_seconds = 1209600 # 14 days

  # Server-side encryption
  sqs_managed_sse_enabled = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-lead-processing-dlq"
  })
}

# -----------------------------------------------------------------------------
# SQS Queue Policy - Allow EventBridge
# -----------------------------------------------------------------------------
resource "aws_sqs_queue_policy" "processing" {
  count = var.enable_sqs ? 1 : 0

  queue_url = aws_sqs_queue.processing[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEventBridge"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.processing[0].arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_cloudwatch_event_rule.lead_created.arn
          }
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# EventBridge Target - SQS (Optional)
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_target" "sqs" {
  count = var.enable_sqs ? 1 : 0

  rule           = aws_cloudwatch_event_rule.lead_created.name
  event_bus_name = aws_cloudwatch_event_bus.leads.name
  target_id      = "sqs-processing"
  arn            = aws_sqs_queue.processing[0].arn

  # Pass through the full event
  input_transformer {
    input_template = <<EOF
{
  "eventId": <id>,
  "source": <source>,
  "detailType": <detail-type>,
  "time": <time>,
  "detail": <detail>
}
EOF
    input_paths = {
      id          = "$.id"
      source      = "$.source"
      detail-type = "$.detail-type"
      time        = "$.time"
      detail      = "$.detail"
    }
  }
}
