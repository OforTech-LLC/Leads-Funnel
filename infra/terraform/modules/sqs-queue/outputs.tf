# =============================================================================
# SQS Queue Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# Main Queue
# -----------------------------------------------------------------------------
output "queue_url" {
  description = "URL of the main SQS queue"
  value       = aws_sqs_queue.main.url
}

output "queue_arn" {
  description = "ARN of the main SQS queue"
  value       = aws_sqs_queue.main.arn
}

output "queue_name" {
  description = "Name of the main SQS queue"
  value       = aws_sqs_queue.main.name
}

output "queue_id" {
  description = "ID (URL) of the main SQS queue"
  value       = aws_sqs_queue.main.id
}

# -----------------------------------------------------------------------------
# Dead Letter Queue
# -----------------------------------------------------------------------------
output "dlq_url" {
  description = "URL of the dead letter queue"
  value       = aws_sqs_queue.dlq.url
}

output "dlq_arn" {
  description = "ARN of the dead letter queue"
  value       = aws_sqs_queue.dlq.arn
}

output "dlq_name" {
  description = "Name of the dead letter queue"
  value       = aws_sqs_queue.dlq.name
}

output "dlq_id" {
  description = "ID (URL) of the dead letter queue"
  value       = aws_sqs_queue.dlq.id
}
