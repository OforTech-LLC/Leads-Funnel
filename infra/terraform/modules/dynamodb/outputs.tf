# =============================================================================
# DynamoDB Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# Per-Funnel Table Outputs
# -----------------------------------------------------------------------------
output "funnel_table_names" {
  description = "Map of funnel ID to DynamoDB table name"
  value       = { for id, table in aws_dynamodb_table.funnel : id => table.name }
}

output "funnel_table_arns" {
  description = "Map of funnel ID to DynamoDB table ARN"
  value       = { for id, table in aws_dynamodb_table.funnel : id => table.arn }
}

output "funnel_table_ids" {
  description = "Map of funnel ID to DynamoDB table ID"
  value       = { for id, table in aws_dynamodb_table.funnel : id => table.id }
}

# List format for IAM policies
output "all_funnel_table_arns" {
  description = "List of all funnel table ARNs for IAM policies"
  value       = [for table in aws_dynamodb_table.funnel : table.arn]
}

output "all_funnel_gsi_arns" {
  description = "List of all funnel table GSI ARNs for IAM policies"
  value       = [for table in aws_dynamodb_table.funnel : "${table.arn}/index/*"]
}

# -----------------------------------------------------------------------------
# Rate Limits Table Outputs
# -----------------------------------------------------------------------------
output "rate_limits_table_name" {
  description = "Rate limits DynamoDB table name"
  value       = aws_dynamodb_table.rate_limits.name
}

output "rate_limits_table_arn" {
  description = "Rate limits DynamoDB table ARN"
  value       = aws_dynamodb_table.rate_limits.arn
}

output "rate_limits_table_id" {
  description = "Rate limits DynamoDB table ID"
  value       = aws_dynamodb_table.rate_limits.id
}

# -----------------------------------------------------------------------------
# Idempotency Table Outputs
# -----------------------------------------------------------------------------
output "idempotency_table_name" {
  description = "Idempotency DynamoDB table name"
  value       = aws_dynamodb_table.idempotency.name
}

output "idempotency_table_arn" {
  description = "Idempotency DynamoDB table ARN"
  value       = aws_dynamodb_table.idempotency.arn
}

output "idempotency_table_id" {
  description = "Idempotency DynamoDB table ID"
  value       = aws_dynamodb_table.idempotency.id
}

# -----------------------------------------------------------------------------
# GSI Outputs
# -----------------------------------------------------------------------------
output "gsi1_name" {
  description = "GSI1 index name (same for all tables)"
  value       = "GSI1"
}

output "gsi2_name" {
  description = "GSI2 index name for admin queries (same for all tables)"
  value       = "GSI2"
}

# -----------------------------------------------------------------------------
# Summary Outputs
# -----------------------------------------------------------------------------
output "table_count" {
  description = "Total number of DynamoDB tables created"
  value       = length(aws_dynamodb_table.funnel) + 2 # +2 for rate_limits and idempotency
}

output "funnel_count" {
  description = "Number of funnel tables created"
  value       = length(aws_dynamodb_table.funnel)
}
