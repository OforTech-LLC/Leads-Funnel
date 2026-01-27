# =============================================================================
# Main Configuration - Prod Environment
# =============================================================================
# This file orchestrates all modules for the prod environment.
# Production has stricter security settings and PITR enabled.
#
# Project: kanjona
# 47-funnel lead generation platform + 3-sided marketplace
# =============================================================================

# -----------------------------------------------------------------------------
# Local Values
# -----------------------------------------------------------------------------
locals {
  # Common tags for all resources
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  # Load funnels from shared configuration
  funnel_ids      = var.funnel_ids
  funnel_metadata = var.funnel_metadata

  # Resource prefix
  prefix = "${var.project_name}-${var.environment}"

  # Subdomain prefixes (parameterized to avoid hardcoding)
  admin_subdomain  = var.admin_subdomain
  portal_subdomain = var.portal_subdomain
  api_subdomain    = var.api_subdomain

  # CORS origins - production only (no localhost)
  cors_origins = concat(
    [
      "https://${var.root_domain}",
      "https://www.${var.root_domain}",
    ],
    var.additional_cors_origins
  )

  # Platform CORS origins (no localhost in prod)
  admin_cors_origins = [
    "https://${local.admin_subdomain}.${var.root_domain}",
  ]
  portal_cors_origins = [
    "https://${local.portal_subdomain}.${var.root_domain}",
  ]

  # -------------------------------------------------------------------------
  # Safe access helpers for conditional platform module outputs
  # Using try() prevents crashes when count=0 modules are not created
  # -------------------------------------------------------------------------

  # DynamoDB table ARNs (safe access)
  platform_orgs_table_arn             = try(module.dynamodb_orgs[0].table_arn, null)
  platform_users_table_arn            = try(module.dynamodb_users[0].table_arn, null)
  platform_memberships_table_arn      = try(module.dynamodb_memberships[0].table_arn, null)
  platform_assignment_rules_table_arn = try(module.dynamodb_assignment_rules[0].table_arn, null)
  platform_unassigned_table_arn       = try(module.dynamodb_unassigned[0].table_arn, null)
  platform_notifications_table_arn    = try(module.dynamodb_notifications[0].table_arn, null)

  # DynamoDB table names (safe access)
  platform_orgs_table_name             = try(module.dynamodb_orgs[0].table_name, "")
  platform_users_table_name            = try(module.dynamodb_users[0].table_name, "")
  platform_memberships_table_name      = try(module.dynamodb_memberships[0].table_name, "")
  platform_assignment_rules_table_name = try(module.dynamodb_assignment_rules[0].table_name, "")
  platform_unassigned_table_name       = try(module.dynamodb_unassigned[0].table_name, "")
  platform_notifications_table_name    = try(module.dynamodb_notifications[0].table_name, "")

  # SQS queue outputs (safe access)
  platform_assignment_queue_arn = try(module.assignment_queue[0].queue_arn, null)
  platform_assignment_queue_url = try(module.assignment_queue[0].queue_url, "")
  platform_notification_queue_arn = try(module.notification_queue[0].queue_arn, null)
  platform_notification_queue_url = try(module.notification_queue[0].queue_url, "")

  # Cognito outputs (safe access)
  platform_admin_cognito_pool_id    = try(module.cognito_admin[0].pool_id, "")
  platform_admin_cognito_client_id  = try(module.cognito_admin[0].client_id, "")
  platform_portal_cognito_pool_id   = try(module.cognito_portal[0].pool_id, "")
  platform_portal_cognito_client_id = try(module.cognito_portal[0].client_id, "")

  # Pre-token Lambda outputs (safe access)
  pre_token_admin_function_arn  = try(module.pre_token_admin[0].function_arn, null)
  pre_token_admin_function_name = try(module.pre_token_admin[0].function_name, null)
  pre_token_portal_function_arn  = try(module.pre_token_portal[0].function_arn, null)
  pre_token_portal_function_name = try(module.pre_token_portal[0].function_name, null)

  # Platform SSM outputs (safe access)
  platform_ssm_parameter_arns = try(module.platform_ssm[0].all_parameter_arns, [])

  # WAF output (safe access)
  waf_web_acl_arn = try(module.waf[0].web_acl_arn, null)

  # Monitoring output (safe access)
  monitoring_sns_topic_arn = try(module.monitoring[0].sns_topic_arn, "")
}

# =============================================================================
# ACM Certificate (Must be in us-east-1 for CloudFront)
# =============================================================================
module "acm" {
  source = "../../modules/acm"

  providers = {
    aws = aws.us_east_1
  }

  project_name = var.project_name
  environment  = var.environment
  root_domain  = var.root_domain

  tags = local.common_tags
}

# =============================================================================
# DynamoDB Tables (47 funnel tables + rate-limits + idempotency)
# =============================================================================
module "dynamodb" {
  source = "../../modules/dynamodb"

  project_name = var.project_name
  environment  = var.environment
  funnel_ids   = local.funnel_ids

  # Production hardening
  enable_pitr                = var.enable_pitr # Prod: PITR enabled
  enable_rate_limits_pitr    = false           # Never need PITR for rate limits
  enable_deletion_protection = true            # Protect against accidental deletion

  tags = local.common_tags
}

# =============================================================================
# Platform DynamoDB Tables (3-sided marketplace)
# =============================================================================
# These tables support the multi-tenant, 3-sided platform features.
# Controlled by enable_platform feature flag.
# Production: PITR enabled, deletion protection enabled.
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

  enable_pitr                = true
  enable_deletion_protection = true

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

  enable_pitr                = true
  enable_deletion_protection = true

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

  enable_pitr                = true
  enable_deletion_protection = true

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

  enable_pitr                = true
  enable_deletion_protection = true

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

  enable_pitr                = false # Transient data, no PITR needed
  enable_deletion_protection = true

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

  enable_pitr                = false # Transient data, no PITR needed
  enable_deletion_protection = true

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

  enable_pitr                = true # Audit logs need PITR for compliance
  enable_deletion_protection = true

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

  enable_pitr                = false # Transient data, no PITR needed
  enable_deletion_protection = true

  tags = merge(local.common_tags, { Type = "platform-exports" })
}

# =============================================================================
# Platform SQS Queues (Assignment + Notification)
# =============================================================================

# --- Assignment Queue ---
module "assignment_queue" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/sqs-queue"

  queue_name                 = "${local.prefix}-assignment-queue"
  visibility_timeout_seconds = 60
  max_receive_count          = 3

  enable_dlq_alarm = var.enable_alarms
  alarm_actions    = var.enable_alarms ? [local.monitoring_sns_topic_arn] : []

  tags = merge(local.common_tags, { Type = "platform-assignment-queue" })
}

# --- Notification Queue ---
module "notification_queue" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/sqs-queue"

  queue_name                 = "${local.prefix}-notification-queue"
  visibility_timeout_seconds = 60
  max_receive_count          = 3

  enable_dlq_alarm = var.enable_alarms
  alarm_actions    = var.enable_alarms ? [local.monitoring_sns_topic_arn] : []

  tags = merge(local.common_tags, { Type = "platform-notification-queue" })
}

# =============================================================================
# Platform Cognito User Pools (Admin + Portal)
# =============================================================================

# --- Admin User Pool ---
module "cognito_admin" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/cognito-userpool"

  depends_on = [module.pre_token_admin]

  pool_name     = "${local.prefix}-admin-userpool"
  domain_prefix = var.platform_admin_cognito_domain

  mfa_configuration            = "ON" # Required in production
  advanced_security_mode       = "ENFORCED"
  allow_admin_create_user_only = true
  challenge_on_new_device      = true

  custom_attributes = [
    {
      name                = "role"
      attribute_data_type = "String"
      min_length          = 1
      max_length          = 50
    },
    {
      name                = "orgId"
      attribute_data_type = "String"
      min_length          = 1
      max_length          = 100
    },
  ]

  # Production callback URLs only - NO localhost
  callback_urls = [
    "https://${local.admin_subdomain}.${var.root_domain}/auth/callback",
  ]
  logout_urls = [
    "https://${local.admin_subdomain}.${var.root_domain}",
  ]

  read_attributes  = ["email", "email_verified", "custom:role", "custom:orgId"]
  # custom:role removed from write_attributes - role should only be set by admin API, not self-service
  write_attributes = ["email", "custom:orgId"]

  # Token validity (stricter for prod)
  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 7

  user_groups = [
    { name = "SuperAdmin", description = "Platform super administrator", precedence = 1 },
    { name = "OrgAdmin", description = "Organization administrator", precedence = 2 },
    { name = "OrgViewer", description = "Organization read-only viewer", precedence = 3 },
  ]

  # Pre-token generation trigger (safe access via locals)
  pre_token_generation_lambda_arn  = local.pre_token_admin_function_arn
  pre_token_generation_lambda_name = local.pre_token_admin_function_name

  invite_email_subject = "Kanjona Admin - Your Account"
  invite_email_message = "Your admin account has been created. Username: {username}, Temporary password: {####}. Please log in and change your password."

  tags = merge(local.common_tags, { Type = "platform-admin-cognito" })
}

# --- Portal User Pool ---
module "cognito_portal" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/cognito-userpool"

  depends_on = [module.pre_token_portal]

  pool_name     = "${local.prefix}-portal-userpool"
  domain_prefix = var.platform_portal_cognito_domain

  mfa_configuration            = "OPTIONAL" # Optional for portal users
  advanced_security_mode       = "ENFORCED"
  allow_admin_create_user_only = false # Allow self-registration for portal
  challenge_on_new_device      = true

  custom_attributes = [
    {
      name                = "orgId"
      attribute_data_type = "String"
      min_length          = 1
      max_length          = 100
    },
    {
      name                = "membershipRole"
      attribute_data_type = "String"
      min_length          = 1
      max_length          = 50
    },
  ]

  # Production callback URLs only - NO localhost
  callback_urls = [
    "https://${local.portal_subdomain}.${var.root_domain}/auth/callback",
  ]
  logout_urls = [
    "https://${local.portal_subdomain}.${var.root_domain}",
  ]

  read_attributes  = ["email", "email_verified", "custom:orgId", "custom:membershipRole"]
  write_attributes = ["email", "custom:orgId", "custom:membershipRole"]

  # Token validity (stricter for prod)
  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 7

  user_groups = [
    { name = "OrgOwner", description = "Organization owner", precedence = 1 },
    { name = "OrgMember", description = "Organization member", precedence = 2 },
  ]

  # Pre-token generation trigger (safe access via locals)
  pre_token_generation_lambda_arn  = local.pre_token_portal_function_arn
  pre_token_generation_lambda_name = local.pre_token_portal_function_name

  invite_email_subject = "Kanjona Portal - Your Account"
  invite_email_message = "Your portal account has been created. Username: {username}, Temporary password: {####}. Please log in and change your password."

  tags = merge(local.common_tags, { Type = "platform-portal-cognito" })
}

# =============================================================================
# Platform Worker Lambdas
# =============================================================================

# --- Assignment Worker ---
module "assignment_worker" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/lambda-worker"

  depends_on = [
    module.dynamodb_orgs,
    module.dynamodb_users,
    module.dynamodb_memberships,
    module.dynamodb_assignment_rules,
    module.dynamodb_unassigned,
    module.assignment_queue,
    module.notification_queue,
  ]

  function_name        = "${local.prefix}-assignment-worker"
  description          = "Processes lead assignment based on rules"
  memory_mb            = 512
  timeout_seconds      = 60
  reserved_concurrency = 50

  sqs_queue_arn  = local.platform_assignment_queue_arn
  sqs_batch_size = 10

  dynamodb_table_arns = compact([
    local.platform_orgs_table_arn,
    local.platform_users_table_arn,
    local.platform_memberships_table_arn,
    local.platform_assignment_rules_table_arn,
    local.platform_unassigned_table_arn,
  ])

  ssm_parameter_arns = concat(
    module.ssm.all_parameter_arns,
    local.platform_ssm_parameter_arns,
  )

  event_bus_arn = module.eventbridge.event_bus_arn

  environment_variables = {
    ENVIRONMENT            = var.environment
    PROJECT_NAME           = var.project_name
    LOG_LEVEL              = "INFO"
    ORGS_TABLE_NAME        = local.platform_orgs_table_name
    USERS_TABLE_NAME       = local.platform_users_table_name
    MEMBERSHIPS_TABLE_NAME = local.platform_memberships_table_name
    ASSIGNMENT_RULES_TABLE = local.platform_assignment_rules_table_name
    UNASSIGNED_TABLE_NAME  = local.platform_unassigned_table_name
    EVENT_BUS_NAME         = module.eventbridge.event_bus_name
    NOTIFICATION_QUEUE_URL = local.platform_notification_queue_url
  }

  sqs_send_queue_arns = compact([local.platform_notification_queue_arn])

  enable_xray        = var.enable_xray
  log_retention_days = 30

  tags = merge(local.common_tags, { Type = "platform-assignment-worker" })
}

# --- Notification Worker ---
module "notification_worker" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/lambda-worker"

  depends_on = [
    module.dynamodb_users,
    module.dynamodb_memberships,
    module.dynamodb_notifications,
    module.notification_queue,
  ]

  function_name        = "${local.prefix}-notification-worker"
  description          = "Sends email/SMS notifications for lead events"
  memory_mb            = 512
  timeout_seconds      = 60
  reserved_concurrency = 50

  sqs_queue_arn  = local.platform_notification_queue_arn
  sqs_batch_size = 10

  dynamodb_table_arns = compact([
    local.platform_users_table_arn,
    local.platform_memberships_table_arn,
    local.platform_notifications_table_arn,
  ])

  ssm_parameter_arns = concat(
    module.ssm.all_parameter_arns,
    local.platform_ssm_parameter_arns,
  )

  enable_ses = var.enable_ses
  enable_sns = var.enable_twilio # SMS via SNS

  environment_variables = {
    ENVIRONMENT            = var.environment
    PROJECT_NAME           = var.project_name
    LOG_LEVEL              = "INFO"
    USERS_TABLE_NAME       = local.platform_users_table_name
    MEMBERSHIPS_TABLE_NAME = local.platform_memberships_table_name
    NOTIFICATIONS_TABLE    = local.platform_notifications_table_name
  }

  enable_xray        = var.enable_xray
  log_retention_days = 30

  tags = merge(local.common_tags, { Type = "platform-notification-worker" })
}

# --- Pre-Token Generation (Admin) ---
module "pre_token_admin" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/lambda-worker"

  depends_on = [
    module.dynamodb_users,
    module.dynamodb_memberships,
  ]

  function_name   = "${local.prefix}-pre-token-admin"
  description     = "Pre-token generation trigger for admin Cognito pool"
  memory_mb       = 128
  timeout_seconds = 10

  dynamodb_table_arns = compact([
    local.platform_users_table_arn,
    local.platform_memberships_table_arn,
  ])

  ssm_parameter_arns = concat(
    module.ssm.all_parameter_arns,
    local.platform_ssm_parameter_arns,
  )

  environment_variables = {
    ENVIRONMENT            = var.environment
    PROJECT_NAME           = var.project_name
    LOG_LEVEL              = "INFO"
    USERS_TABLE_NAME       = local.platform_users_table_name
    MEMBERSHIPS_TABLE_NAME = local.platform_memberships_table_name
  }

  enable_xray        = var.enable_xray
  log_retention_days = 30

  tags = merge(local.common_tags, { Type = "platform-pre-token-admin" })
}

# --- Pre-Token Generation (Portal) ---
module "pre_token_portal" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/lambda-worker"

  depends_on = [
    module.dynamodb_users,
    module.dynamodb_memberships,
    module.dynamodb_orgs,
  ]

  function_name   = "${local.prefix}-pre-token-portal"
  description     = "Pre-token generation trigger for portal Cognito pool"
  memory_mb       = 128
  timeout_seconds = 10

  dynamodb_table_arns = compact([
    local.platform_users_table_arn,
    local.platform_memberships_table_arn,
    local.platform_orgs_table_arn,
  ])

  ssm_parameter_arns = concat(
    module.ssm.all_parameter_arns,
    local.platform_ssm_parameter_arns,
  )

  environment_variables = {
    ENVIRONMENT            = var.environment
    PROJECT_NAME           = var.project_name
    LOG_LEVEL              = "INFO"
    USERS_TABLE_NAME       = local.platform_users_table_name
    MEMBERSHIPS_TABLE_NAME = local.platform_memberships_table_name
    ORGS_TABLE_NAME        = local.platform_orgs_table_name
  }

  enable_xray        = var.enable_xray
  log_retention_days = 30

  tags = merge(local.common_tags, { Type = "platform-pre-token-portal" })
}

# =============================================================================
# Platform EventBridge Rules
# =============================================================================
module "platform_eventbridge" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/platform-eventbridge"

  depends_on = [
    module.assignment_queue,
    module.notification_queue,
  ]

  project_name = var.project_name
  environment  = var.environment

  event_bus_name = module.eventbridge.event_bus_name
  event_bus_arn  = module.eventbridge.event_bus_arn

  assignment_queue_arn = local.platform_assignment_queue_arn
  assignment_queue_url = local.platform_assignment_queue_url

  notification_queue_arn = local.platform_notification_queue_arn
  notification_queue_url = local.platform_notification_queue_url

  tags = local.common_tags
}

# =============================================================================
# Platform SSM Parameters
# =============================================================================
module "platform_ssm" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/platform-ssm"

  depends_on = [
    module.dynamodb_orgs,
    module.dynamodb_users,
    module.dynamodb_memberships,
    module.dynamodb_assignment_rules,
    module.dynamodb_unassigned,
    module.dynamodb_notifications,
    module.assignment_queue,
    module.notification_queue,
    module.cognito_admin,
    module.cognito_portal,
  ]

  project_name = var.project_name
  environment  = var.environment

  # Feature flags (selectively enabled in prod)
  enable_assignment_engine  = false # Enable when ready
  enable_portal             = false # Enable when ready
  enable_multi_tenant       = false # Enable when ready
  enable_auto_assignment    = false # Enable when ready
  enable_lead_notifications = false # Enable when ready
  enable_org_management     = false # Enable when ready
  enable_exports            = false # Enable when ready
  enable_audit_logging      = false # Enable when ready

  # CORS origins (production only, via locals)
  admin_cors_origins  = local.admin_cors_origins
  portal_cors_origins = local.portal_cors_origins

  # Table name references (safe access via locals)
  orgs_table_name             = local.platform_orgs_table_name
  users_table_name            = local.platform_users_table_name
  memberships_table_name      = local.platform_memberships_table_name
  assignment_rules_table_name = local.platform_assignment_rules_table_name
  unassigned_table_name       = local.platform_unassigned_table_name
  notifications_table_name    = local.platform_notifications_table_name

  # Queue references (safe access via locals)
  assignment_queue_url   = local.platform_assignment_queue_url
  notification_queue_url = local.platform_notification_queue_url

  # Cognito references (safe access via locals)
  admin_cognito_pool_id    = local.platform_admin_cognito_pool_id
  admin_cognito_client_id  = local.platform_admin_cognito_client_id
  portal_cognito_pool_id   = local.platform_portal_cognito_pool_id
  portal_cognito_client_id = local.platform_portal_cognito_client_id

  tags = local.common_tags
}

# =============================================================================
# Platform CloudFront Apps (Admin + Portal)
# =============================================================================

# --- Admin App ---
module "admin_app" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/cloudfront-app"

  app_name    = "${local.prefix}-admin-app"
  bucket_name = "${local.prefix}-admin-app-origin"

  domain_aliases      = ["${local.admin_subdomain}.${var.root_domain}"]
  acm_certificate_arn = module.acm.validated_certificate_arn
  route53_zone_id     = module.dns.zone_id
  waf_web_acl_arn     = local.waf_web_acl_arn

  price_class = "PriceClass_200"

  tags = merge(local.common_tags, { Type = "platform-admin-app" })
}

# --- Portal App ---
module "portal_app" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/cloudfront-app"

  app_name    = "${local.prefix}-portal-app"
  bucket_name = "${local.prefix}-portal-app-origin"

  domain_aliases      = ["${local.portal_subdomain}.${var.root_domain}"]
  acm_certificate_arn = module.acm.validated_certificate_arn
  route53_zone_id     = module.dns.zone_id
  waf_web_acl_arn     = local.waf_web_acl_arn

  price_class = "PriceClass_200"

  tags = merge(local.common_tags, { Type = "platform-portal-app" })
}

# =============================================================================
# Secrets Manager (Twilio, ElevenLabs, etc.)
# =============================================================================
module "secrets" {
  source = "../../modules/secrets"

  project_name = var.project_name
  environment  = var.environment

  tags = local.common_tags
}

# =============================================================================
# SSM Parameter Store (Feature flags, funnels config)
# =============================================================================
module "ssm" {
  source = "../../modules/ssm"

  project_name    = var.project_name
  environment     = var.environment
  funnel_ids      = local.funnel_ids
  funnel_metadata = local.funnel_metadata

  # Feature flags
  enable_voice_agent         = var.enable_voice_agent
  enable_twilio              = var.enable_twilio
  enable_elevenlabs          = var.enable_elevenlabs
  enable_waf                 = var.enable_waf
  enable_pitr                = var.enable_pitr
  enable_email_notifications = var.enable_ses
  enable_sms_notifications   = var.enable_twilio
  enable_deduplication       = true
  enable_rate_limiting       = true
  enable_debug               = false # Disable debug in prod

  # Runtime config - prod uses api subdomain
  api_base_url = "https://${local.api_subdomain}.${var.root_domain}"

  tags = local.common_tags
}

# =============================================================================
# EventBridge (Leads event bus, rules)
# =============================================================================
module "eventbridge" {
  source = "../../modules/eventbridge"

  project_name       = var.project_name
  environment        = var.environment
  enable_sqs         = var.enable_sqs
  enable_voice_agent = var.enable_voice_agent
  enable_logging     = var.enable_api_logging

  # Connect voice-start Lambda as EventBridge target if enabled
  voice_start_lambda_arn    = var.enable_voice_agent ? module.lambda.voice_start_function_arn : null
  voice_start_function_name = var.enable_voice_agent ? module.lambda.voice_start_function_name : null

  log_retention_days = 30 # Longer retention in prod

  tags = local.common_tags
}

# =============================================================================
# Lambda Functions (lead-handler, health-handler, voice-start, voice-webhook)
# =============================================================================
module "lambda" {
  source = "../../modules/lambda"

  project_name       = var.project_name
  environment        = var.environment
  root_domain        = var.root_domain
  funnel_ids         = local.funnel_ids
  enable_voice_agent = var.enable_voice_agent

  # DynamoDB integration
  all_funnel_table_arns  = module.dynamodb.all_funnel_table_arns
  all_funnel_gsi_arns    = module.dynamodb.all_funnel_gsi_arns
  rate_limits_table_name = module.dynamodb.rate_limits_table_name
  rate_limits_table_arn  = module.dynamodb.rate_limits_table_arn
  idempotency_table_name = module.dynamodb.idempotency_table_name
  idempotency_table_arn  = module.dynamodb.idempotency_table_arn

  # EventBridge integration
  event_bus_name = module.eventbridge.event_bus_name
  event_bus_arn  = module.eventbridge.event_bus_arn

  # Secrets integration
  twilio_secret_arn       = module.secrets.twilio_secret_arn
  elevenlabs_secret_arn   = module.secrets.elevenlabs_secret_arn
  ip_hash_salt_secret_arn = module.secrets.ip_hash_salt_secret_arn
  webhook_secret_arn      = module.secrets.webhook_secret_arn

  # SSM integration
  ssm_parameter_arns = module.ssm.all_parameter_arns

  # Lambda configuration (production optimized)
  lead_handler_memory_mb            = var.lambda_memory_mb
  lead_handler_reserved_concurrency = var.lambda_reserved_concurrency
  voice_functions_memory_mb         = 512
  voice_reserved_concurrency        = 50

  enable_xray        = var.enable_xray
  log_retention_days = 30

  tags = local.common_tags
}

# =============================================================================
# API Gateway (HTTP API with routes)
# =============================================================================
module "api_gateway" {
  source = "../../modules/api-gateway"

  project_name        = var.project_name
  environment         = var.environment
  root_domain         = var.root_domain
  acm_certificate_arn = module.acm.validated_certificate_arn

  # CORS configuration (production - strict)
  cors_allowed_origins = local.cors_origins

  # Lambda integrations
  lead_handler_function_name = module.lambda.lead_handler_function_name
  lead_handler_invoke_arn    = module.lambda.lead_handler_invoke_arn

  health_handler_function_name = module.lambda.health_handler_function_name
  health_handler_invoke_arn    = module.lambda.health_handler_invoke_arn

  # Voice agent (optional)
  enable_voice_agent          = var.enable_voice_agent
  voice_start_function_name   = module.lambda.voice_start_function_name
  voice_start_invoke_arn      = module.lambda.voice_start_invoke_arn
  voice_webhook_function_name = module.lambda.voice_webhook_function_name
  voice_webhook_invoke_arn    = module.lambda.voice_webhook_invoke_arn

  # Production throttling
  throttling_rate_limit  = 100
  throttling_burst_limit = 200

  # Logging
  enable_logging     = var.enable_api_logging
  log_retention_days = 30

  tags = local.common_tags
}

# =============================================================================
# WAF (Enabled by default in prod)
# =============================================================================
module "waf" {
  count  = var.enable_waf ? 1 : 0
  source = "../../modules/waf"

  providers = {
    aws = aws.us_east_1
  }

  project_name = var.project_name
  environment  = var.environment

  rate_limit_requests = 500
  enable_logging      = true
  log_retention_days  = 30

  tags = local.common_tags
}

# =============================================================================
# Static Site (CloudFront + S3)
# =============================================================================
module "static_site" {
  source = "../../modules/static_site"

  project_name = var.project_name
  environment  = var.environment

  domain_aliases = [
    var.root_domain,
    "www.${var.root_domain}",
  ]

  acm_certificate_arn = module.acm.validated_certificate_arn
  waf_web_acl_arn     = local.waf_web_acl_arn

  # Production settings
  price_class    = "PriceClass_200" # Includes Asia, Middle East, Africa
  enable_logging = var.enable_cloudfront_logging

  content_security_policy = var.content_security_policy

  # Basic authentication
  enable_basic_auth   = var.enable_basic_auth
  basic_auth_username = var.basic_auth_username
  basic_auth_password = var.basic_auth_password

  tags = local.common_tags
}

# =============================================================================
# DNS (Route 53)
# =============================================================================
module "dns" {
  source = "../../modules/dns"

  project_name = var.project_name
  environment  = var.environment
  root_domain  = var.root_domain

  cloudfront_domain_name    = module.static_site.domain_name
  cloudfront_hosted_zone_id = module.static_site.hosted_zone_id

  api_gateway_domain_name    = module.api_gateway.custom_domain_name
  api_gateway_hosted_zone_id = module.api_gateway.custom_domain_zone_id

  acm_validation_records = module.acm.validation_records

  tags = local.common_tags
}

# =============================================================================
# SES (Optional)
# =============================================================================
module "ses" {
  count  = var.enable_ses ? 1 : 0
  source = "../../modules/ses"

  project_name = var.project_name
  environment  = var.environment
  root_domain  = var.root_domain

  route53_zone_id    = module.dns.zone_id
  notification_email = var.notification_email
  enable_mail_from   = true

  tags = local.common_tags
}

# =============================================================================
# Monitoring (Enabled by default in prod)
# =============================================================================
module "monitoring" {
  count  = var.enable_alarms ? 1 : 0
  source = "../../modules/monitoring"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  alert_email = var.alert_email

  # Resource references
  lambda_function_name = module.lambda.lead_handler_function_name
  api_gateway_id       = module.api_gateway.api_id
  dynamodb_table_name  = module.dynamodb.funnel_table_names["real-estate"]
  sqs_queue_name       = var.enable_sqs ? module.eventbridge.queue_name : ""
  sqs_dlq_name         = var.enable_sqs ? module.eventbridge.dlq_name : ""

  # Alarm thresholds (strict for prod)
  lambda_error_rate_threshold = 1  # 1% error rate threshold
  lambda_duration_threshold   = 10 # 10 seconds
  api_error_rate_threshold    = 1  # 1% error rate threshold

  # Dashboard and advanced features
  create_dashboard        = true # Create dashboard in prod
  create_composite_alarms = true # Enable composite alarms in prod
  enable_sns_encryption   = true # Encrypt SNS in prod

  tags = local.common_tags
}

# =============================================================================
# Synthetic Monitoring (Enabled by default in prod)
# =============================================================================
module "synthetics" {
  count  = var.enable_synthetics ? 1 : 0
  source = "../../modules/synthetics"

  project_name = var.project_name
  environment  = var.environment

  # API Health Check Canary
  enable_api_canary   = true
  api_health_endpoint = "https://${local.api_subdomain}.${var.root_domain}/health"
  api_canary_schedule = "rate(5 minutes)" # More frequent in prod

  # Website Availability Canary
  enable_website_canary   = true
  website_url             = "https://${var.root_domain}"
  website_canary_schedule = "rate(5 minutes)" # More frequent in prod

  # Alerting (safe access via locals)
  sns_topic_arn = local.monitoring_sns_topic_arn

  # Canary configuration
  enable_xray_tracing     = var.enable_xray
  artifact_retention_days = 30 # Longer retention in prod

  tags = local.common_tags
}

# =============================================================================
# CloudTrail (Recommended for production - AWS API audit logging)
# =============================================================================
module "cloudtrail" {
  count  = var.enable_cloudtrail ? 1 : 0
  source = "../../modules/cloudtrail"

  project_name = var.project_name
  environment  = var.environment

  is_multi_region_trail     = true  # Multi-region for comprehensive coverage
  enable_cloudwatch_logs    = true  # Real-time monitoring
  enable_access_logging     = true  # S3 access logging for the trail bucket
  enable_s3_data_events     = false # Can be enabled for compliance (increases costs)
  enable_lambda_data_events = false # Can be enabled for compliance (increases costs)

  log_retention_days            = 365 # 1 year retention for compliance
  cloudwatch_log_retention_days = 90

  tags = local.common_tags
}

# =============================================================================
# Admin Console (Optional - DISABLED by default)
# =============================================================================
module "admin" {
  count  = var.enable_admin_console ? 1 : 0
  source = "../../modules/admin"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  # Feature flags
  enable_admin_console      = var.enable_admin_console
  enable_admin_ip_allowlist = var.enable_admin_ip_allowlist
  enable_cloudtrail         = false # Use standalone cloudtrail module instead

  # Admin access control (stricter in prod)
  admin_allowed_emails = var.admin_allowed_emails
  admin_allowed_cidrs  = var.admin_allowed_cidrs

  # Cognito configuration
  cognito_domain_prefix      = var.admin_cognito_domain_prefix
  mfa_configuration          = "ON"  # Always require MFA in production
  enable_localhost_callbacks = false # NO localhost in production

  # Production callback URLs only - NO localhost
  admin_console_callback_urls = [
    "https://${var.root_domain}/admin/callback",
    "https://www.${var.root_domain}/admin/callback",
  ]
  admin_console_logout_urls = [
    "https://${var.root_domain}/admin",
    "https://www.${var.root_domain}/admin",
  ]

  # Exports configuration (longer retention in prod)
  exports_bucket_name      = var.admin_exports_bucket_name
  exports_retention_days   = 30
  enable_bucket_versioning = true
  enable_access_logging    = true

  # Lambda configuration
  lambda_zip_path    = var.admin_lambda_zip_path
  lambda_zip_hash    = var.admin_lambda_zip_hash != "" ? var.admin_lambda_zip_hash : filebase64sha256(var.admin_lambda_zip_path)
  log_retention_days = 30
  xray_enabled       = var.enable_xray

  # API Gateway integration
  api_gateway_id            = module.api_gateway.api_id
  api_gateway_execution_arn = module.api_gateway.api_execution_arn

  # Production data protection
  audit_log_retention_days   = 365 # 1 year retention for compliance
  enable_audit_pitr          = true
  enable_deletion_protection = true

  tags = local.common_tags
}
