# =============================================================================
# Eventing Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# EventBridge
# -----------------------------------------------------------------------------
output "event_bus_name" {
  description = "EventBridge event bus name"
  value       = aws_cloudwatch_event_bus.leads.name
}

output "event_bus_arn" {
  description = "EventBridge event bus ARN"
  value       = aws_cloudwatch_event_bus.leads.arn
}

output "event_rule_name" {
  description = "EventBridge rule name for lead.created events"
  value       = aws_cloudwatch_event_rule.lead_created.name
}

output "event_rule_arn" {
  description = "EventBridge rule ARN"
  value       = aws_cloudwatch_event_rule.lead_created.arn
}

# -----------------------------------------------------------------------------
# SQS (if enabled)
# -----------------------------------------------------------------------------
output "queue_url" {
  description = "SQS queue URL for lead processing"
  value       = var.enable_sqs ? aws_sqs_queue.processing[0].url : null
}

output "queue_arn" {
  description = "SQS queue ARN"
  value       = var.enable_sqs ? aws_sqs_queue.processing[0].arn : null
}

output "queue_name" {
  description = "SQS queue name"
  value       = var.enable_sqs ? aws_sqs_queue.processing[0].name : null
}

output "dlq_url" {
  description = "SQS dead-letter queue URL"
  value       = var.enable_sqs ? aws_sqs_queue.dlq[0].url : null
}

output "dlq_arn" {
  description = "SQS dead-letter queue ARN"
  value       = var.enable_sqs ? aws_sqs_queue.dlq[0].arn : null
}

output "dlq_name" {
  description = "SQS dead-letter queue name"
  value       = var.enable_sqs ? aws_sqs_queue.dlq[0].name : null
}
