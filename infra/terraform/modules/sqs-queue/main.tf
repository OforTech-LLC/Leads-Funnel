# =============================================================================
# SQS Queue Module - Main Queue + Dead Letter Queue
# =============================================================================
# Creates a reusable SQS queue pair:
# - Main processing queue with configurable settings
# - Dead Letter Queue for failed messages
# - CloudWatch alarm for DLQ messages
# - Queue policies for EventBridge integration
#
# Used for assignment-queue, notification-queue, etc.
# =============================================================================

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# Dead Letter Queue
# -----------------------------------------------------------------------------
resource "aws_sqs_queue" "dlq" {
  name = "${var.queue_name}-dlq"

  message_retention_seconds = var.dlq_retention_seconds
  sqs_managed_sse_enabled   = true

  tags = merge(var.tags, {
    Name = "${var.queue_name}-dlq"
    Type = "dead-letter-queue"
  })
}

# -----------------------------------------------------------------------------
# Main Queue
# -----------------------------------------------------------------------------
resource "aws_sqs_queue" "main" {
  name = var.queue_name

  visibility_timeout_seconds = var.visibility_timeout_seconds
  message_retention_seconds  = var.message_retention_seconds
  receive_wait_time_seconds  = var.receive_wait_time_seconds
  delay_seconds              = var.delay_seconds
  max_message_size           = var.max_message_size

  sqs_managed_sse_enabled = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  tags = merge(var.tags, {
    Name = var.queue_name
    Type = "processing-queue"
  })
}

# -----------------------------------------------------------------------------
# Queue Policy - Allow EventBridge to send messages
# -----------------------------------------------------------------------------
resource "aws_sqs_queue_policy" "main" {
  count = length(var.allowed_source_arns) > 0 ? 1 : 0

  queue_url = aws_sqs_queue.main.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEventBridgeSendMessage"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.main.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = var.allowed_source_arns
          }
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# CloudWatch Alarm - DLQ Messages
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  count = var.enable_dlq_alarm ? 1 : 0

  alarm_name          = "${var.queue_name}-dlq-messages"
  alarm_description   = "Alert when messages arrive in DLQ for ${var.queue_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = var.dlq_alarm_threshold
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.dlq.name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = merge(var.tags, {
    Name = "${var.queue_name}-dlq-alarm"
  })
}
