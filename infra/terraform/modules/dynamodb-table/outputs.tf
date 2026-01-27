# =============================================================================
# DynamoDB Table Module Outputs
# =============================================================================

output "table_arn" {
  description = "ARN of the DynamoDB table"
  value       = aws_dynamodb_table.this.arn
}

output "table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.this.name
}

output "table_id" {
  description = "ID of the DynamoDB table"
  value       = aws_dynamodb_table.this.id
}

output "table_stream_arn" {
  description = "ARN of the DynamoDB table stream (null if streams disabled)"
  value       = aws_dynamodb_table.this.stream_arn
}

output "table_stream_label" {
  description = "Timestamp of the DynamoDB table stream (null if streams disabled)"
  value       = aws_dynamodb_table.this.stream_label
}

output "gsi_arns" {
  description = "List of all GSI ARNs for IAM policies"
  value       = [for gsi in var.global_secondary_indexes : "${aws_dynamodb_table.this.arn}/index/${gsi.name}"]
}
