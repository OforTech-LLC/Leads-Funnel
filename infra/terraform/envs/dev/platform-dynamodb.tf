# =============================================================================
# Platform DynamoDB Tables - Dev Environment (3-sided marketplace)
# =============================================================================
# These tables support the multi-tenant, 3-sided platform features.
# Controlled by enable_platform feature flag.
# =============================================================================

# --- Organizations Table ---
module "dynamodb_orgs" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/dynamodb-table"

  table_name = "${local.prefix}-orgs"
  hash_key   = "orgId"
  range_key  = "sk"

  attributes = [
    { name = "orgId", type = "S" },
    { name = "sk", type = "S" },
    { name = "gsi1pk", type = "S" },
    { name = "gsi1sk", type = "S" },
    { name = "gsi2pk", type = "S" },
    { name = "gsi2sk", type = "S" },
  ]

  global_secondary_indexes = [
    {
      name      = "GSI1"
      hash_key  = "gsi1pk"
      range_key = "gsi1sk"
    },
    {
      name      = "GSI2"
      hash_key  = "gsi2pk"
      range_key = "gsi2sk"
    },
  ]

  enable_pitr                = false
  enable_deletion_protection = false

  tags = merge(local.common_tags, { Type = "platform-orgs" })
}

# --- Users Table ---
module "dynamodb_users" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/dynamodb-table"

  table_name = "${local.prefix}-users"
  hash_key   = "pk"
  range_key  = "sk"

  attributes = [
    { name = "pk", type = "S" },
    { name = "sk", type = "S" },
    { name = "gsi1pk", type = "S" },
    { name = "gsi1sk", type = "S" },
    { name = "gsi2pk", type = "S" },
    { name = "gsi2sk", type = "S" },
  ]

  global_secondary_indexes = [
    {
      name      = "GSI1"
      hash_key  = "gsi1pk"
      range_key = "gsi1sk"
    },
    {
      name      = "GSI2"
      hash_key  = "gsi2pk"
      range_key = "gsi2sk"
    },
  ]

  enable_pitr                = false
  enable_deletion_protection = false

  tags = merge(local.common_tags, { Type = "platform-users" })
}

# --- Memberships Table ---
module "dynamodb_memberships" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/dynamodb-table"

  table_name = "${local.prefix}-memberships"
  hash_key   = "pk"
  range_key  = "sk"

  attributes = [
    { name = "pk", type = "S" },
    { name = "sk", type = "S" },
    { name = "gsi1pk", type = "S" },
    { name = "gsi1sk", type = "S" },
    { name = "gsi2pk", type = "S" },
    { name = "gsi2sk", type = "S" },
    { name = "gsi3pk", type = "S" },
    { name = "gsi3sk", type = "S" },
  ]

  global_secondary_indexes = [
    {
      name      = "GSI1"
      hash_key  = "gsi1pk"
      range_key = "gsi1sk"
    },
    {
      name      = "GSI2"
      hash_key  = "gsi2pk"
      range_key = "gsi2sk"
    },
    {
      name      = "GSI3"
      hash_key  = "gsi3pk"
      range_key = "gsi3sk"
    },
  ]

  enable_pitr                = false
  enable_deletion_protection = false

  tags = merge(local.common_tags, { Type = "platform-memberships" })
}

# --- Assignment Rules Table ---
module "dynamodb_assignment_rules" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/dynamodb-table"

  table_name = "${local.prefix}-assignment-rules"
  hash_key   = "pk"
  range_key  = "sk"

  attributes = [
    { name = "pk", type = "S" },
    { name = "sk", type = "S" },
    { name = "gsi1pk", type = "S" },
    { name = "gsi1sk", type = "S" },
    { name = "gsi2pk", type = "S" },
    { name = "gsi2sk", type = "S" },
  ]

  global_secondary_indexes = [
    {
      name      = "GSI1"
      hash_key  = "gsi1pk"
      range_key = "gsi1sk"
    },
    {
      name      = "GSI2"
      hash_key  = "gsi2pk"
      range_key = "gsi2sk"
    },
  ]

  enable_pitr                = false
  enable_deletion_protection = false

  tags = merge(local.common_tags, { Type = "platform-assignment-rules" })
}

# --- Unassigned Leads Table (with TTL) ---
module "dynamodb_unassigned" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/dynamodb-table"

  table_name    = "${local.prefix}-unassigned"
  hash_key      = "pk"
  range_key     = "sk"
  ttl_attribute = "ttl"

  attributes = [
    { name = "pk", type = "S" },
    { name = "sk", type = "S" },
  ]

  enable_pitr                = false
  enable_deletion_protection = false

  tags = merge(local.common_tags, { Type = "platform-unassigned" })
}

# --- Notifications Table (with TTL) ---
module "dynamodb_notifications" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/dynamodb-table"

  table_name    = "${local.prefix}-notifications"
  hash_key      = "pk"
  range_key     = "sk"
  ttl_attribute = "ttl"

  attributes = [
    { name = "pk", type = "S" },
    { name = "sk", type = "S" },
  ]

  enable_pitr                = false
  enable_deletion_protection = false

  tags = merge(local.common_tags, { Type = "platform-notifications" })
}

# --- Admin Audit Table (with TTL) ---
module "dynamodb_admin_audit" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/dynamodb-table"

  table_name    = "${local.prefix}-admin-audit"
  hash_key      = "pk"
  range_key     = "sk"
  ttl_attribute = "ttl"

  attributes = [
    { name = "pk", type = "S" },
    { name = "sk", type = "S" },
  ]

  enable_pitr                = false
  enable_deletion_protection = false

  tags = merge(local.common_tags, { Type = "platform-admin-audit" })
}

# --- Exports Table (with TTL) ---
module "dynamodb_exports" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/dynamodb-table"

  table_name    = "${local.prefix}-exports"
  hash_key      = "pk"
  range_key     = "sk"
  ttl_attribute = "ttl"

  attributes = [
    { name = "pk", type = "S" },
    { name = "sk", type = "S" },
  ]

  enable_pitr                = false
  enable_deletion_protection = false

  tags = merge(local.common_tags, { Type = "platform-exports" })
}
