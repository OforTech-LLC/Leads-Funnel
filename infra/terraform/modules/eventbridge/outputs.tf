# =============================================================================
# EventBridge Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# Event Bus
# -----------------------------------------------------------------------------
output "event_bus_name" {
  description = "EventBridge event bus name"
  value       = aws_cloudwatch_event_bus.leads.name
}

output "event_bus_arn" {
  description = "EventBridge event bus ARN"
  value       = aws_cloudwatch_event_bus.leads.arn
}

# -----------------------------------------------------------------------------
# Event Rules
# -----------------------------------------------------------------------------
output "lead_created_rule_name" {
  description = "EventBridge rule name for lead.created events"
  value       = aws_cloudwatch_event_rule.lead_created.name
}

output "lead_created_rule_arn" {
  description = "EventBridge rule ARN for lead.created events"
  value       = aws_cloudwatch_event_rule.lead_created.arn
}

output "lead_qualified_rule_name" {
  description = "EventBridge rule name for lead.qualified events"
  value       = aws_cloudwatch_event_rule.lead_qualified.name
}

output "lead_qualified_rule_arn" {
  description = "EventBridge rule ARN for lead.qualified events"
  value       = aws_cloudwatch_event_rule.lead_qualified.arn
}

output "voice_call_initiated_rule_arn" {
  description = "EventBridge rule ARN for voice.call.initiated events"
  value       = var.enable_voice_agent ? aws_cloudwatch_event_rule.voice_call_initiated[0].arn : null
}

output "voice_call_completed_rule_arn" {
  description = "EventBridge rule ARN for voice.call.completed events"
  value       = var.enable_voice_agent ? aws_cloudwatch_event_rule.voice_call_completed[0].arn : null
}

# -----------------------------------------------------------------------------
# SQS Queues
# -----------------------------------------------------------------------------
output "queue_url" {
  description = "SQS queue URL for lead processing"
  value       = var.enable_sqs ? aws_sqs_queue.lead_processing[0].url : null
}

output "queue_arn" {
  description = "SQS queue ARN"
  value       = var.enable_sqs ? aws_sqs_queue.lead_processing[0].arn : null
}

output "queue_name" {
  description = "SQS queue name"
  value       = var.enable_sqs ? aws_sqs_queue.lead_processing[0].name : null
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

# -----------------------------------------------------------------------------
# CloudWatch Logs
# -----------------------------------------------------------------------------
output "log_group_name" {
  description = "EventBridge CloudWatch log group name"
  value       = var.enable_logging ? aws_cloudwatch_log_group.events[0].name : null
}

output "log_group_arn" {
  description = "EventBridge CloudWatch log group ARN"
  value       = var.enable_logging ? aws_cloudwatch_log_group.events[0].arn : null
}
