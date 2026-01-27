# =============================================================================
# DynamoDB Module - Per-Funnel Tables + Rate Limits
# =============================================================================
# This module creates:
# - DynamoDB table PER funnel using for_each (47 tables)
# - Single rate-limits table shared across all funnels
# - Global Secondary Index (GSI1) for email lookups
# - TTL configuration for automatic record expiration
# - Point-in-Time Recovery (optional, configurable)
# - Server-side encryption (AWS owned key)
#
# Entity Schemas (for reference):
# - Lead Record: pk=LEAD#<uuid>, sk=META
# - Lead Event: pk=LEAD#<uuid>, sk=EVENT#<timestamp>#<type>
# - Idempotency: pk=IDEMPOTENCY#<hash>, sk=META
#
# Rate Limits Table Schema:
# - Rate Limit: pk=RATELIMIT#<ip_hash>, sk=WINDOW#<bucket>
#
# NOTE: All attribute names are lowercase to match Swift backend conventions
# =============================================================================

# -----------------------------------------------------------------------------
# Per-Funnel DynamoDB Tables
# -----------------------------------------------------------------------------
# Each funnel gets its own table for data isolation, independent scaling,
# and easier per-funnel analytics and cost tracking.
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "funnel" {
  for_each = toset(var.funnel_ids)

  name         = "${var.project_name}-${var.environment}-${each.key}"
  billing_mode = "PAY_PER_REQUEST" # On-demand capacity for cost efficiency

  # Primary key (single-table design within each funnel)
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

  # GSI2 attributes for admin queries (by status)
  attribute {
    name = "gsi2pk"
    type = "S"
  }

  attribute {
    name = "gsi2sk"
    type = "S"
  }

  # Global Secondary Index for querying by email
  # Pattern: gsi1pk=EMAIL#<email>, gsi1sk=CREATED#<timestamp>
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "gsi1pk"
    range_key       = "gsi1sk"
    projection_type = "ALL"
  }

  # Global Secondary Index for admin queries by status
  # Pattern: gsi2pk=STATUS#<status>, gsi2sk=CREATED#<timestamp>
  global_secondary_index {
    name            = "GSI2"
    hash_key        = "gsi2pk"
    range_key       = "gsi2sk"
    projection_type = "ALL"
  }

  # TTL for automatic record expiration
  # Used for idempotency keys and temporary records
  ttl {
    enabled        = true
    attribute_name = "ttl"
  }

  # Point-in-Time Recovery (configurable per environment)
  point_in_time_recovery {
    enabled = var.enable_pitr
  }

  # Deletion protection (prod only to prevent accidental deletion)
  deletion_protection_enabled = var.enable_deletion_protection

  # Server-side encryption (AWS owned key - no additional cost)
  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    Name     = "${var.project_name}-${var.environment}-${each.key}"
    FunnelId = each.key
    Type     = "funnel-leads"
  })
}

# -----------------------------------------------------------------------------
# Rate Limits DynamoDB Table
# -----------------------------------------------------------------------------
# Single table for rate limiting across all funnels.
# Separated from funnel tables to allow independent scaling and simpler
# access patterns for rate limit checks.
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "rate_limits" {
  name         = "${var.project_name}-${var.environment}-rate-limits"
  billing_mode = "PAY_PER_REQUEST" # On-demand capacity

  # Primary key for rate limit records
  # Pattern: pk=RATELIMIT#<funnel_id>#<ip_hash>, sk=WINDOW#<bucket>
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

  # TTL for automatic window expiration
  # Rate limit windows automatically expire after their time period
  ttl {
    enabled        = true
    attribute_name = "ttl"
  }

  # Point-in-Time Recovery (typically disabled for rate limits)
  point_in_time_recovery {
    enabled = var.enable_rate_limits_pitr
  }

  # No deletion protection for rate limits (transient data)
  deletion_protection_enabled = false

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-rate-limits"
    Type = "rate-limits"
  })
}

# -----------------------------------------------------------------------------
# Idempotency Table (Optional - can be per-funnel or shared)
# -----------------------------------------------------------------------------
# Shared table for idempotency key tracking across all funnels.
# Prevents duplicate lead submissions within the TTL window.
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "idempotency" {
  name         = "${var.project_name}-${var.environment}-idempotency"
  billing_mode = "PAY_PER_REQUEST"

  # Primary key for idempotency records
  # Pattern: pk=IDEMPOTENCY#<request_hash>, sk=META
  hash_key  = "pk"
  range_key = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  # TTL for automatic key expiration (typically 24-48 hours)
  ttl {
    enabled        = true
    attribute_name = "ttl"
  }

  # No PITR needed for idempotency (transient data)
  point_in_time_recovery {
    enabled = false
  }

  # No deletion protection (transient data)
  deletion_protection_enabled = false

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-idempotency"
    Type = "idempotency"
  })
}
