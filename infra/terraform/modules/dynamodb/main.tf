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
# - Lead Record: pk=LEAD#<uuid>, sk=META
# - Lead Event: pk=LEAD#<uuid>, sk=EVENT#<timestamp>#<type>
# - Rate Limit: pk=RATELIMIT#<ip_hash>, sk=WINDOW#<bucket>
# - Idempotency: pk=IDEMPOTENCY#<hash>, sk=META
# NOTE: All attribute names are lowercase to match Swift backend conventions
# =============================================================================

# -----------------------------------------------------------------------------
# DynamoDB Table
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "main" {
  name         = "${var.project_name}-${var.environment}-main"
  billing_mode = "PAY_PER_REQUEST" # On-demand capacity

  # Primary key (single-table design)
  # NOTE: Using lowercase to match Swift backend code conventions
  hash_key  = "pk"
  range_key = "sk"

  # Primary key attributes
  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  # GSI1 attributes (lowercase to match Swift backend)
  attribute {
    name = "gsi1pk"
    type = "S"
  }

  attribute {
    name = "gsi1sk"
    type = "S"
  }

  # Global Secondary Index for querying by email
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "gsi1pk"
    range_key       = "gsi1sk"
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
