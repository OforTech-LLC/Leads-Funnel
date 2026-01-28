# =============================================================================
# Admin Exports - DynamoDB Tables
# =============================================================================
# This file contains:
# - Admin audit log table (pk/sk with GSI for actor lookup, optional TTL)
# - Export jobs table (pk/sk with TTL for automatic cleanup)
#
# Related files:
# - main.tf: KMS key and S3 exports bucket
# =============================================================================

# =====================================================
# Admin Audit Log Table
# =====================================================

resource "aws_dynamodb_table" "audit" {
  name         = "${var.project_name}-${var.environment}-admin-audit"
  billing_mode = "PAY_PER_REQUEST"

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

  # GSI for actor lookup
  attribute {
    name = "actorEmailHash"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "actorEmailHash"
    range_key       = "sk"
    projection_type = "ALL"
  }

  # TTL for automatic cleanup (optional)
  ttl {
    attribute_name = "ttl"
    enabled        = var.audit_ttl_enabled
  }

  point_in_time_recovery {
    enabled = var.environment == "prod"
  }

  deletion_protection_enabled = var.environment == "prod"

  tags = var.tags
}

# =====================================================
# Export Jobs Table (track export status)
# =====================================================

resource "aws_dynamodb_table" "export_jobs" {
  name         = "${var.project_name}-${var.environment}-admin-export-jobs"
  billing_mode = "PAY_PER_REQUEST"

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

  # TTL for automatic cleanup
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = var.environment == "prod"
  }

  deletion_protection_enabled = var.environment == "prod"

  tags = var.tags
}
