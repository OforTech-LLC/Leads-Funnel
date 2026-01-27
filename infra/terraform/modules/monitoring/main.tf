# =============================================================================
# Monitoring Module - CloudWatch Alarms, Dashboard, and SNS
# =============================================================================
# This module creates:
# - SNS topic for alerts with email subscriptions
# - CloudWatch alarms for Lambda, API Gateway, DynamoDB, SQS
# - CloudWatch dashboard with comprehensive metrics
# - Error rate based alarms (percentage-based)
# - X-Ray tracing integration support
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
  name_prefix = "${var.project_name}-${var.environment}"

  # Default alarm thresholds (can be overridden via variables)
  default_thresholds = {
    api_error_rate_percent    = 1    # 1% error rate
    lambda_error_rate_percent = 1    # 1% error rate
    lambda_duration_seconds   = 10   # 10 seconds
    api_latency_p99_ms        = 3000 # 3 seconds
  }
}

# =============================================================================
# SNS Topic for Alerts
# =============================================================================
resource "aws_sns_topic" "alerts" {
  name = "${local.name_prefix}-alerts"

  # Enable server-side encryption
  kms_master_key_id = var.enable_sns_encryption ? aws_kms_key.sns[0].id : null

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-alerts"
  })
}

# KMS key for SNS encryption (optional)
resource "aws_kms_key" "sns" {
  count = var.enable_sns_encryption ? 1 : 0

  description             = "KMS key for SNS topic encryption - ${local.name_prefix}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccountPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowCloudWatchAlarms"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey*"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowSNSService"
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-sns-kms"
  })
}

resource "aws_kms_alias" "sns" {
  count = var.enable_sns_encryption ? 1 : 0

  name          = "alias/${local.name_prefix}-sns"
  target_key_id = aws_kms_key.sns[0].key_id
}

# Email subscription (if provided)
resource "aws_sns_topic_subscription" "email" {
  count = var.alert_email != "" ? 1 : 0

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Additional email subscriptions (for escalation)
resource "aws_sns_topic_subscription" "additional_emails" {
  for_each = toset(var.additional_alert_emails)

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = each.value
}

# SNS Topic Policy (allows CloudWatch to publish)
resource "aws_sns_topic_policy" "alerts" {
  arn = aws_sns_topic.alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudWatchAlarms"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.alerts.arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:aws:cloudwatch:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:alarm:*"
          }
        }
      }
    ]
  })
}

# =============================================================================
# Lambda Alarms
# =============================================================================

# Lambda Errors (absolute count)
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${local.name_prefix}-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300 # 5 minutes
  statistic           = "Sum"
  threshold           = var.lambda_error_threshold
  alarm_description   = "Lambda function errors exceed threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = var.lambda_function_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

# Lambda Error Rate (percentage-based) - More sophisticated
resource "aws_cloudwatch_metric_alarm" "lambda_error_rate" {
  alarm_name          = "${local.name_prefix}-lambda-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = var.lambda_error_rate_threshold

  alarm_description  = "Lambda error rate exceeds ${var.lambda_error_rate_threshold}%"
  treat_missing_data = "notBreaching"

  metric_query {
    id          = "error_rate"
    expression  = "IF(invocations > 0, (errors / invocations) * 100, 0)"
    label       = "Error Rate %"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "Errors"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = var.lambda_function_name
      }
    }
  }

  metric_query {
    id = "invocations"
    metric {
      metric_name = "Invocations"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = var.lambda_function_name
      }
    }
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

# Lambda Throttles
resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  alarm_name          = "${local.name_prefix}-lambda-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Lambda function is being throttled"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = var.lambda_function_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

# Lambda Duration P99
resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  alarm_name          = "${local.name_prefix}-lambda-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  extended_statistic  = "p99"
  threshold           = var.lambda_duration_threshold * 1000 # Convert seconds to ms
  alarm_description   = "Lambda P99 duration exceeds ${var.lambda_duration_threshold} seconds"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = var.lambda_function_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

# Lambda Concurrent Executions (capacity planning)
resource "aws_cloudwatch_metric_alarm" "lambda_concurrent" {
  count = var.lambda_concurrent_threshold > 0 ? 1 : 0

  alarm_name          = "${local.name_prefix}-lambda-concurrent"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ConcurrentExecutions"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Maximum"
  threshold           = var.lambda_concurrent_threshold
  alarm_description   = "Lambda concurrent executions high - capacity planning alert"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = var.lambda_function_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

# =============================================================================
# API Gateway Alarms
# =============================================================================

# API Gateway 5xx Errors (absolute)
resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  alarm_name          = "${local.name_prefix}-api-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5xx"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = var.api_5xx_threshold
  alarm_description   = "API Gateway 5xx errors exceed threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = var.api_gateway_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

# API Gateway Error Rate (percentage-based)
resource "aws_cloudwatch_metric_alarm" "api_error_rate" {
  alarm_name          = "${local.name_prefix}-api-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = var.api_error_rate_threshold

  alarm_description  = "API error rate exceeds ${var.api_error_rate_threshold}%"
  treat_missing_data = "notBreaching"

  metric_query {
    id          = "error_rate"
    expression  = "IF(requests > 0, ((errors_4xx + errors_5xx) / requests) * 100, 0)"
    label       = "Error Rate %"
    return_data = true
  }

  metric_query {
    id = "errors_4xx"
    metric {
      metric_name = "4xx"
      namespace   = "AWS/ApiGateway"
      period      = 300
      stat        = "Sum"
      dimensions = {
        ApiId = var.api_gateway_id
      }
    }
  }

  metric_query {
    id = "errors_5xx"
    metric {
      metric_name = "5xx"
      namespace   = "AWS/ApiGateway"
      period      = 300
      stat        = "Sum"
      dimensions = {
        ApiId = var.api_gateway_id
      }
    }
  }

  metric_query {
    id = "requests"
    metric {
      metric_name = "Count"
      namespace   = "AWS/ApiGateway"
      period      = 300
      stat        = "Sum"
      dimensions = {
        ApiId = var.api_gateway_id
      }
    }
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

# API Gateway 4xx Errors (high threshold - may indicate attack)
resource "aws_cloudwatch_metric_alarm" "api_4xx" {
  alarm_name          = "${local.name_prefix}-api-4xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "4xx"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = var.api_4xx_threshold
  alarm_description   = "API Gateway 4xx errors exceed threshold (possible attack)"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = var.api_gateway_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

# API Gateway Latency P99
resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "${local.name_prefix}-api-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = 300
  extended_statistic  = "p99"
  threshold           = var.api_latency_p99_threshold
  alarm_description   = "API Gateway P99 latency exceeds ${var.api_latency_p99_threshold}ms"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = var.api_gateway_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

# API Gateway Integration Latency (backend performance)
resource "aws_cloudwatch_metric_alarm" "api_integration_latency" {
  alarm_name          = "${local.name_prefix}-api-integration-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "IntegrationLatency"
  namespace           = "AWS/ApiGateway"
  period              = 300
  extended_statistic  = "p99"
  threshold           = var.api_integration_latency_threshold
  alarm_description   = "API Gateway integration latency high - Lambda performance issue"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = var.api_gateway_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

# =============================================================================
# DynamoDB Alarms
# =============================================================================

# DynamoDB Throttled Requests
resource "aws_cloudwatch_metric_alarm" "dynamodb_throttles" {
  alarm_name          = "${local.name_prefix}-dynamodb-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ThrottledRequests"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "DynamoDB requests are being throttled - review capacity"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = var.dynamodb_table_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

# DynamoDB System Errors
resource "aws_cloudwatch_metric_alarm" "dynamodb_errors" {
  alarm_name          = "${local.name_prefix}-dynamodb-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "SystemErrors"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "DynamoDB system errors detected"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = var.dynamodb_table_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

# DynamoDB Read Capacity Utilization
resource "aws_cloudwatch_metric_alarm" "dynamodb_read_capacity" {
  count = var.enable_capacity_alarms ? 1 : 0

  alarm_name          = "${local.name_prefix}-dynamodb-read-capacity"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ConsumedReadCapacityUnits"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = var.dynamodb_read_capacity_threshold
  alarm_description   = "DynamoDB read capacity high - consider scaling"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = var.dynamodb_table_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

# DynamoDB Write Capacity Utilization
resource "aws_cloudwatch_metric_alarm" "dynamodb_write_capacity" {
  count = var.enable_capacity_alarms ? 1 : 0

  alarm_name          = "${local.name_prefix}-dynamodb-write-capacity"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ConsumedWriteCapacityUnits"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = var.dynamodb_write_capacity_threshold
  alarm_description   = "DynamoDB write capacity high - consider scaling"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = var.dynamodb_table_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

# =============================================================================
# SQS Alarms (Conditional)
# =============================================================================

# SQS DLQ Messages
resource "aws_cloudwatch_metric_alarm" "sqs_dlq" {
  count = var.sqs_dlq_name != "" ? 1 : 0

  alarm_name          = "${local.name_prefix}-sqs-dlq"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Messages in dead-letter queue - requires investigation"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = var.sqs_dlq_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

# SQS Queue Age
resource "aws_cloudwatch_metric_alarm" "sqs_age" {
  count = var.sqs_queue_name != "" ? 1 : 0

  alarm_name          = "${local.name_prefix}-sqs-age"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateAgeOfOldestMessage"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Maximum"
  threshold           = var.sqs_message_age_threshold
  alarm_description   = "SQS message age exceeds threshold - processing backlog"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = var.sqs_queue_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

# SQS Queue Depth
resource "aws_cloudwatch_metric_alarm" "sqs_depth" {
  count = var.sqs_queue_name != "" && var.sqs_queue_depth_threshold > 0 ? 1 : 0

  alarm_name          = "${local.name_prefix}-sqs-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = var.sqs_queue_depth_threshold
  alarm_description   = "SQS queue depth high - messages backing up"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = var.sqs_queue_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

# =============================================================================
# Composite Alarms (for critical scenarios)
# =============================================================================

# Critical: Both Lambda errors AND API 5xx errors
resource "aws_cloudwatch_composite_alarm" "critical_errors" {
  count = var.create_composite_alarms ? 1 : 0

  alarm_name        = "${local.name_prefix}-critical-errors"
  alarm_description = "CRITICAL: Both Lambda and API errors detected simultaneously"

  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.lambda_errors.alarm_name}) AND ALARM(${aws_cloudwatch_metric_alarm.api_5xx.alarm_name})"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = var.tags
}
