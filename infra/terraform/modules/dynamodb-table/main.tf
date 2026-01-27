# =============================================================================
# DynamoDB Table Module - Generic Reusable Table
# =============================================================================
# Creates a single DynamoDB table with configurable:
# - Hash key and optional range key
# - Global Secondary Indexes (GSIs)
# - TTL
# - Point-in-Time Recovery
# - DynamoDB Streams
# - Billing mode (PAY_PER_REQUEST or PROVISIONED)
# - Deletion protection
# - Server-side encryption
#
# This module is designed to be called multiple times for each table
# the platform needs (orgs, users, memberships, etc.)
# =============================================================================

# -----------------------------------------------------------------------------
# DynamoDB Table
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "this" {
  name         = var.table_name
  billing_mode = var.billing_mode
  hash_key     = var.hash_key
  range_key    = var.range_key

  # Primary key attributes + GSI attributes are declared dynamically
  dynamic "attribute" {
    for_each = var.attributes
    content {
      name = attribute.value.name
      type = attribute.value.type
    }
  }

  # Global Secondary Indexes
  dynamic "global_secondary_index" {
    for_each = var.global_secondary_indexes
    content {
      name            = global_secondary_index.value.name
      hash_key        = global_secondary_index.value.hash_key
      range_key       = lookup(global_secondary_index.value, "range_key", null)
      projection_type = lookup(global_secondary_index.value, "projection_type", "ALL")

      # Only set non-key attributes when projection type is INCLUDE
      non_key_attributes = lookup(global_secondary_index.value, "projection_type", "ALL") == "INCLUDE" ? lookup(global_secondary_index.value, "non_key_attributes", null) : null

      # Provisioned capacity for GSIs (only when billing mode is PROVISIONED)
      read_capacity  = var.billing_mode == "PROVISIONED" ? lookup(global_secondary_index.value, "read_capacity", var.read_capacity) : null
      write_capacity = var.billing_mode == "PROVISIONED" ? lookup(global_secondary_index.value, "write_capacity", var.write_capacity) : null
    }
  }

  # TTL configuration
  dynamic "ttl" {
    for_each = var.ttl_attribute != null ? [var.ttl_attribute] : []
    content {
      enabled        = true
      attribute_name = ttl.value
    }
  }

  # Point-in-Time Recovery
  point_in_time_recovery {
    enabled = var.enable_pitr
  }

  # DynamoDB Streams
  stream_enabled   = var.stream_view_type != null
  stream_view_type = var.stream_view_type

  # Deletion protection
  deletion_protection_enabled = var.enable_deletion_protection

  # Server-side encryption (AWS owned key - no additional cost)
  server_side_encryption {
    enabled = true
  }

  # Provisioned capacity (only when billing mode is PROVISIONED)
  read_capacity  = var.billing_mode == "PROVISIONED" ? var.read_capacity : null
  write_capacity = var.billing_mode == "PROVISIONED" ? var.write_capacity : null

  tags = merge(var.tags, {
    Name = var.table_name
  })

  lifecycle {
    ignore_changes = [
      # Ignore read/write capacity changes managed by auto-scaling
      read_capacity,
      write_capacity,
    ]
  }
}
