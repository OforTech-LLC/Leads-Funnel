# =============================================================================
# DynamoDB Module - Single-Table Design
# =============================================================================
# This module creates:
# - DynamoDB table with single-table design
# - Global Secondary Index (GSI1)
# - TTL configuration
# - Point-in-Time Recovery (optional)
# - Deletion protection (prod only)
#
# Entity Schemas (for reference):
# - Lead Record: PK=LEAD#<uuid>, SK=META
# - Lead Event: PK=LEAD#<uuid>, SK=EVENT#<timestamp>#<type>
# - Rate Limit: PK=RATELIMIT#<ip_hash>, SK=WINDOW#<bucket>
# - Idempotency: PK=IDEMPOTENCY#<hash>, SK=META
# =============================================================================

# -----------------------------------------------------------------------------
# DynamoDB Table
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "main" {
  name         = "${var.project_name}-${var.environment}-main"
  billing_mode = "PAY_PER_REQUEST" # On-demand capacity

  # Primary key (single-table design)
  hash_key  = "PK"
  range_key = "SK"

  # Primary key attributes
  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # GSI1 attributes
  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  # Global Secondary Index for querying by email
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  # TTL for automatic record expiration
  ttl {
    enabled        = true
    attribute_name = "ttl"
  }

  # Point-in-Time Recovery (prod only)
  point_in_time_recovery {
    enabled = var.enable_pitr
  }

  # Deletion protection (prod only)
  deletion_protection_enabled = var.enable_deletion_protection

  # Server-side encryption (AWS owned key)
  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-main"
  })
}
