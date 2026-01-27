# =============================================================================
# Monitoring Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# SNS Topic
# -----------------------------------------------------------------------------
output "sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "sns_topic_name" {
  description = "SNS topic name for alerts"
  value       = aws_sns_topic.alerts.name
}

# -----------------------------------------------------------------------------
# Dashboard
# -----------------------------------------------------------------------------
output "dashboard_name" {
  description = "CloudWatch dashboard name"
  value       = var.create_dashboard ? aws_cloudwatch_dashboard.main[0].dashboard_name : null
}

output "dashboard_arn" {
  description = "CloudWatch dashboard ARN"
  value       = var.create_dashboard ? aws_cloudwatch_dashboard.main[0].dashboard_arn : null
}

# -----------------------------------------------------------------------------
# Alarm Names
# -----------------------------------------------------------------------------
output "alarm_names" {
  description = "List of CloudWatch alarm names"
  value = concat(
    [
      aws_cloudwatch_metric_alarm.lambda_errors.alarm_name,
      aws_cloudwatch_metric_alarm.lambda_error_rate.alarm_name,
      aws_cloudwatch_metric_alarm.lambda_throttles.alarm_name,
      aws_cloudwatch_metric_alarm.lambda_duration.alarm_name,
      aws_cloudwatch_metric_alarm.api_5xx.alarm_name,
      aws_cloudwatch_metric_alarm.api_error_rate.alarm_name,
      aws_cloudwatch_metric_alarm.api_4xx.alarm_name,
      aws_cloudwatch_metric_alarm.api_latency.alarm_name,
      aws_cloudwatch_metric_alarm.api_integration_latency.alarm_name,
      aws_cloudwatch_metric_alarm.dynamodb_throttles.alarm_name,
      aws_cloudwatch_metric_alarm.dynamodb_errors.alarm_name,
    ],
    var.lambda_concurrent_threshold > 0 ? [aws_cloudwatch_metric_alarm.lambda_concurrent[0].alarm_name] : [],
    var.enable_capacity_alarms ? [
      aws_cloudwatch_metric_alarm.dynamodb_read_capacity[0].alarm_name,
      aws_cloudwatch_metric_alarm.dynamodb_write_capacity[0].alarm_name,
    ] : [],
    var.sqs_dlq_name != "" ? [aws_cloudwatch_metric_alarm.sqs_dlq[0].alarm_name] : [],
    var.sqs_queue_name != "" ? [aws_cloudwatch_metric_alarm.sqs_age[0].alarm_name] : [],
    var.sqs_queue_name != "" && var.sqs_queue_depth_threshold > 0 ? [aws_cloudwatch_metric_alarm.sqs_depth[0].alarm_name] : [],
    var.create_composite_alarms ? [aws_cloudwatch_composite_alarm.critical_errors[0].alarm_name] : [],
  )
}

# -----------------------------------------------------------------------------
# Alarm ARNs
# -----------------------------------------------------------------------------
output "alarm_arns" {
  description = "Map of alarm names to ARNs"
  value = {
    lambda_errors             = aws_cloudwatch_metric_alarm.lambda_errors.arn
    lambda_error_rate         = aws_cloudwatch_metric_alarm.lambda_error_rate.arn
    lambda_throttles          = aws_cloudwatch_metric_alarm.lambda_throttles.arn
    lambda_duration           = aws_cloudwatch_metric_alarm.lambda_duration.arn
    api_5xx                   = aws_cloudwatch_metric_alarm.api_5xx.arn
    api_error_rate            = aws_cloudwatch_metric_alarm.api_error_rate.arn
    api_4xx                   = aws_cloudwatch_metric_alarm.api_4xx.arn
    api_latency               = aws_cloudwatch_metric_alarm.api_latency.arn
    api_integration_latency   = aws_cloudwatch_metric_alarm.api_integration_latency.arn
    dynamodb_throttles        = aws_cloudwatch_metric_alarm.dynamodb_throttles.arn
    dynamodb_errors           = aws_cloudwatch_metric_alarm.dynamodb_errors.arn
    lambda_concurrent         = var.lambda_concurrent_threshold > 0 ? aws_cloudwatch_metric_alarm.lambda_concurrent[0].arn : null
    dynamodb_read_capacity    = var.enable_capacity_alarms ? aws_cloudwatch_metric_alarm.dynamodb_read_capacity[0].arn : null
    dynamodb_write_capacity   = var.enable_capacity_alarms ? aws_cloudwatch_metric_alarm.dynamodb_write_capacity[0].arn : null
    sqs_dlq                   = var.sqs_dlq_name != "" ? aws_cloudwatch_metric_alarm.sqs_dlq[0].arn : null
    sqs_age                   = var.sqs_queue_name != "" ? aws_cloudwatch_metric_alarm.sqs_age[0].arn : null
    sqs_depth                 = var.sqs_queue_name != "" && var.sqs_queue_depth_threshold > 0 ? aws_cloudwatch_metric_alarm.sqs_depth[0].arn : null
    critical_errors_composite = var.create_composite_alarms ? aws_cloudwatch_composite_alarm.critical_errors[0].arn : null
  }
}

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
output "total_alarms_count" {
  description = "Total number of CloudWatch alarms created"
  value       = length([for name in local.all_alarm_names : name if name != null])
}

locals {
  all_alarm_names = concat(
    [
      aws_cloudwatch_metric_alarm.lambda_errors.alarm_name,
      aws_cloudwatch_metric_alarm.lambda_error_rate.alarm_name,
      aws_cloudwatch_metric_alarm.lambda_throttles.alarm_name,
      aws_cloudwatch_metric_alarm.lambda_duration.alarm_name,
      aws_cloudwatch_metric_alarm.api_5xx.alarm_name,
      aws_cloudwatch_metric_alarm.api_error_rate.alarm_name,
      aws_cloudwatch_metric_alarm.api_4xx.alarm_name,
      aws_cloudwatch_metric_alarm.api_latency.alarm_name,
      aws_cloudwatch_metric_alarm.api_integration_latency.alarm_name,
      aws_cloudwatch_metric_alarm.dynamodb_throttles.alarm_name,
      aws_cloudwatch_metric_alarm.dynamodb_errors.alarm_name,
    ],
    var.lambda_concurrent_threshold > 0 ? [aws_cloudwatch_metric_alarm.lambda_concurrent[0].alarm_name] : [],
    var.enable_capacity_alarms ? [
      aws_cloudwatch_metric_alarm.dynamodb_read_capacity[0].alarm_name,
      aws_cloudwatch_metric_alarm.dynamodb_write_capacity[0].alarm_name,
    ] : [],
    var.sqs_dlq_name != "" ? [aws_cloudwatch_metric_alarm.sqs_dlq[0].alarm_name] : [],
    var.sqs_queue_name != "" ? [aws_cloudwatch_metric_alarm.sqs_age[0].alarm_name] : [],
    var.sqs_queue_name != "" && var.sqs_queue_depth_threshold > 0 ? [aws_cloudwatch_metric_alarm.sqs_depth[0].alarm_name] : [],
    var.create_composite_alarms ? [aws_cloudwatch_composite_alarm.critical_errors[0].alarm_name] : [],
  )
}
