# =============================================================================
# DynamoDB Module Outputs
# =============================================================================

output "table_name" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.main.name
}

output "table_arn" {
  description = "DynamoDB table ARN"
  value       = aws_dynamodb_table.main.arn
}

output "table_id" {
  description = "DynamoDB table ID"
  value       = aws_dynamodb_table.main.id
}

output "gsi1_name" {
  description = "GSI1 index name"
  value       = "GSI1"
}

output "gsi1_arn" {
  description = "GSI1 index ARN"
  value       = "${aws_dynamodb_table.main.arn}/index/GSI1"
}
