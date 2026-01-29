# =============================================================================
# Main Configuration - Dev Environment
# =============================================================================
# This file contains locals, ACM, core DynamoDB, and foundational modules.
# Platform-specific resources are split into separate files:
#   - platform-dynamodb.tf   Platform DynamoDB tables
#   - platform-queues.tf     Platform SQS queues
#   - platform-cognito.tf    Platform Cognito user pools
#   - platform-workers.tf    Platform Lambda workers + EventBridge + SSM
#   - platform-apps.tf       Platform CloudFront apps
#   - core-services.tf       Secrets, SSM, EventBridge, Lambda, API Gateway,
#                             WAF, Static Site, DNS, SES, Monitoring,
#                             Synthetics, CloudTrail, Admin Console
#
# Project: kanjona
# 47-funnel lead generation platform + 3-sided marketplace
# =============================================================================

# -----------------------------------------------------------------------------
# Shared Funnel Configuration
# -----------------------------------------------------------------------------
module "funnels" {
  source = "../../shared"
}

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
  funnel_ids      = module.funnels.funnel_ids
  funnel_metadata = module.funnels.funnel_metadata

  # Resource prefix
  prefix = "${var.project_name}-${var.environment}"

  # Subdomain prefixes (parameterized to avoid hardcoding)
  env_subdomain    = var.env_subdomain
  admin_subdomain  = var.admin_subdomain
  portal_subdomain = var.portal_subdomain
  api_subdomain    = var.api_subdomain

  # Platform CORS origins
  admin_cors_origins = var.enable_platform ? concat(
    ["https://${local.admin_subdomain}.${var.root_domain}"],
    ["http://localhost:3001"]
  ) : []
  portal_cors_origins = var.enable_platform ? concat(
    ["https://${local.portal_subdomain}.${var.root_domain}"],
    ["http://localhost:3002"]
  ) : []

  # CORS origins - dev includes platform apps when enabled
  cors_origins = concat(
    [
      "https://${local.env_subdomain}.${var.root_domain}",
    ],
    var.additional_cors_origins,
    local.admin_cors_origins,
    local.portal_cors_origins
  )

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
  platform_leads_table_arn            = try(module.dynamodb_leads[0].table_arn, null)
  platform_leads_gsi_arns             = try(module.dynamodb_leads[0].gsi_arns, [])

  # DynamoDB table names (safe access)
  platform_orgs_table_name             = try(module.dynamodb_orgs[0].table_name, "")
  platform_users_table_name            = try(module.dynamodb_users[0].table_name, "")
  platform_memberships_table_name      = try(module.dynamodb_memberships[0].table_name, "")
  platform_assignment_rules_table_name = try(module.dynamodb_assignment_rules[0].table_name, "")
  platform_unassigned_table_name       = try(module.dynamodb_unassigned[0].table_name, "")
  platform_notifications_table_name    = try(module.dynamodb_notifications[0].table_name, "")
  platform_leads_table_name            = try(module.dynamodb_leads[0].table_name, "")

  # SQS queue outputs (safe access)
  platform_assignment_queue_arn   = try(module.assignment_queue[0].queue_arn, null)
  platform_assignment_queue_url   = try(module.assignment_queue[0].queue_url, "")
  platform_notification_queue_arn = try(module.notification_queue[0].queue_arn, null)
  platform_notification_queue_url = try(module.notification_queue[0].queue_url, "")

  # Cognito outputs (safe access)
  platform_admin_cognito_pool_id    = try(module.cognito_admin[0].pool_id, "")
  platform_admin_cognito_client_id  = try(module.cognito_admin[0].client_id, "")
  platform_portal_cognito_pool_id   = try(module.cognito_portal[0].pool_id, "")
  platform_portal_cognito_client_id = try(module.cognito_portal[0].client_id, "")

  # Pre-token Lambda outputs (safe access)
  pre_token_admin_function_arn   = try(module.pre_token_admin[0].function_arn, null)
  pre_token_admin_function_name  = try(module.pre_token_admin[0].function_name, null)
  pre_token_portal_function_arn  = try(module.pre_token_portal[0].function_arn, null)
  pre_token_portal_function_name = try(module.pre_token_portal[0].function_name, null)

  # Platform SSM outputs (safe access)
  platform_ssm_parameter_arns = try(module.platform_ssm[0].all_parameter_arns, [])
  platform_ssm_prefix         = try(module.platform_ssm[0].parameter_prefix, "")

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

  # Include admin and portal subdomains for platform apps
  additional_sans = var.enable_platform ? [
    "${var.admin_subdomain}.${var.root_domain}",
    "${var.portal_subdomain}.${var.root_domain}",
  ] : []

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

  enable_pitr                = var.enable_pitr
  enable_rate_limits_pitr    = false # Never need PITR for rate limits
  enable_deletion_protection = false # Allow deletion in dev

  tags = local.common_tags
}
