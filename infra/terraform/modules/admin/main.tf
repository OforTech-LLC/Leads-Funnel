/**
 * Admin Module
 *
 * Orchestrates all admin sub-modules for the Lead Funnel Admin Console.
 * This module creates:
 * - Cognito User Pool for admin authentication
 * - S3 bucket for exports
 * - DynamoDB tables for audit logs and export jobs
 * - SSM parameters for feature flags and configuration
 * - Lambda function and API Gateway routes for admin operations
 * - CloudTrail for API audit logging (optional)
 *
 * IMPORTANT: Admin console is disabled by default (feature flag).
 */

# =====================================================
# Cognito Authentication
# =====================================================

locals {
  use_existing_cognito = var.use_existing_cognito

  cognito_user_pool_id  = var.use_existing_cognito ? var.existing_cognito_user_pool_id : try(module.cognito[0].user_pool_id, "")
  cognito_user_pool_arn = var.use_existing_cognito ? var.existing_cognito_user_pool_arn : try(module.cognito[0].user_pool_arn, "")
  cognito_client_id     = var.use_existing_cognito ? var.existing_cognito_client_id : try(module.cognito[0].web_client_id, "")
  cognito_domain        = var.use_existing_cognito ? var.existing_cognito_domain : try(module.cognito[0].user_pool_domain_url, "")

  cognito_issuer = local.cognito_user_pool_id != "" ? "https://cognito-idp.${var.aws_region}.amazonaws.com/${local.cognito_user_pool_id}" : ""

  cognito_admin_group_name  = var.use_existing_cognito ? var.existing_cognito_admin_group_name : try(module.cognito[0].admin_group_name, "")
  cognito_viewer_group_name = var.use_existing_cognito ? var.existing_cognito_viewer_group_name : try(module.cognito[0].viewer_group_name, "")
}

module "cognito" {
  count  = var.use_existing_cognito ? 0 : 1
  source = "../admin-cognito"

  project_name = var.project_name
  environment  = var.environment

  admin_callback_urls        = var.admin_console_callback_urls
  admin_logout_urls          = var.admin_console_logout_urls
  mfa_configuration          = var.mfa_configuration
  enable_localhost_callbacks = var.enable_localhost_callbacks

  tags = var.tags
}

# =====================================================
# Exports Infrastructure
# =====================================================

module "exports" {
  source = "../admin-exports"

  project_name = var.project_name
  environment  = var.environment

  export_retention_days = var.exports_retention_days
  enable_access_logging = var.enable_access_logging

  tags = var.tags
}

# =====================================================
# SSM Parameters (Feature Flags & Configuration)
# =====================================================

module "ssm" {
  source = "../admin-ssm"

  project_name = var.project_name
  environment  = var.environment

  enable_admin_console      = var.enable_admin_console
  enable_admin_ip_allowlist = var.enable_admin_ip_allowlist
  admin_allowed_emails      = var.admin_allowed_emails
  admin_allowed_cidrs       = var.admin_allowed_cidrs

  cognito_user_pool_id = local.cognito_user_pool_id
  cognito_client_id    = local.cognito_client_id
  cognito_domain       = local.cognito_domain

  tags = var.tags
}

# =====================================================
# Admin API (Lambda + API Gateway Routes)
# =====================================================

module "api" {
  source = "../admin-api"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  lambda_zip_path = var.lambda_zip_path
  lambda_zip_hash = var.lambda_zip_hash

  cognito_user_pool_id = local.cognito_user_pool_id
  cognito_client_id    = local.cognito_client_id
  cognito_issuer       = local.cognito_issuer

  exports_bucket_name = module.exports.bucket_name
  exports_bucket_arn  = module.exports.bucket_arn

  audit_table_name = module.exports.audit_table_name
  audit_table_arn  = module.exports.audit_table_arn

  export_jobs_table_name = module.exports.export_jobs_table_name
  export_jobs_table_arn  = module.exports.export_jobs_table_arn

  platform_orgs_table_name             = var.platform_orgs_table_name
  platform_users_table_name            = var.platform_users_table_name
  platform_memberships_table_name      = var.platform_memberships_table_name
  platform_assignment_rules_table_name = var.platform_assignment_rules_table_name
  platform_leads_table_name            = var.platform_leads_table_name
  platform_notifications_table_name    = var.platform_notifications_table_name
  platform_unassigned_table_name       = var.platform_unassigned_table_name

  api_gateway_id            = var.api_gateway_id
  api_gateway_execution_arn = var.api_gateway_execution_arn

  log_retention_days = var.log_retention_days
  xray_enabled       = var.xray_enabled

  tags = var.tags
}

# =====================================================
# CloudTrail (Optional - for AWS API audit logging)
# =====================================================

module "cloudtrail" {
  count  = var.enable_cloudtrail ? 1 : 0
  source = "../cloudtrail"

  project_name = var.project_name
  environment  = var.environment

  is_multi_region_trail     = var.cloudtrail_multi_region
  enable_cloudwatch_logs    = var.cloudtrail_enable_cloudwatch
  enable_access_logging     = var.enable_access_logging
  enable_s3_data_events     = var.cloudtrail_s3_data_events
  enable_lambda_data_events = var.cloudtrail_lambda_data_events

  log_retention_days            = var.cloudtrail_log_retention_days
  cloudwatch_log_retention_days = var.log_retention_days

  tags = var.tags
}
