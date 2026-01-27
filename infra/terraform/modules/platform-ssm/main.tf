# =============================================================================
# Platform SSM Module - 3-Sided Platform Parameters
# =============================================================================
# Creates SSM parameters for the multi-tenant platform features:
# - Feature flags for assignment, notifications, portal, admin
# - CORS origins for admin and portal apps
# - Table name references
# - Queue URL references
# - Cognito pool references
#
# Extends the existing SSM module with platform-specific parameters.
# =============================================================================

locals {
  parameter_prefix = "/${var.project_name}/${var.environment}"
}

# =============================================================================
# Feature Flags - Platform
# =============================================================================

resource "aws_ssm_parameter" "enable_assignment_engine" {
  name        = "${local.parameter_prefix}/feature-flags/enable-assignment-engine"
  description = "Enable lead assignment engine"
  type        = "String"
  value       = var.enable_assignment_engine ? "true" : "false"

  tags = merge(var.tags, {
    Name = "enable-assignment-engine"
    Type = "feature-flag"
  })
}

resource "aws_ssm_parameter" "enable_portal" {
  name        = "${local.parameter_prefix}/feature-flags/enable-portal"
  description = "Enable service provider portal"
  type        = "String"
  value       = var.enable_portal ? "true" : "false"

  tags = merge(var.tags, {
    Name = "enable-portal"
    Type = "feature-flag"
  })
}

resource "aws_ssm_parameter" "enable_multi_tenant" {
  name        = "${local.parameter_prefix}/feature-flags/enable-multi-tenant"
  description = "Enable multi-tenant organization support"
  type        = "String"
  value       = var.enable_multi_tenant ? "true" : "false"

  tags = merge(var.tags, {
    Name = "enable-multi-tenant"
    Type = "feature-flag"
  })
}

resource "aws_ssm_parameter" "enable_auto_assignment" {
  name        = "${local.parameter_prefix}/feature-flags/enable-auto-assignment"
  description = "Enable automatic lead assignment based on rules"
  type        = "String"
  value       = var.enable_auto_assignment ? "true" : "false"

  tags = merge(var.tags, {
    Name = "enable-auto-assignment"
    Type = "feature-flag"
  })
}

resource "aws_ssm_parameter" "enable_lead_notifications" {
  name        = "${local.parameter_prefix}/feature-flags/enable-lead-notifications"
  description = "Enable lead assignment notifications (email/SMS)"
  type        = "String"
  value       = var.enable_lead_notifications ? "true" : "false"

  tags = merge(var.tags, {
    Name = "enable-lead-notifications"
    Type = "feature-flag"
  })
}

resource "aws_ssm_parameter" "enable_org_management" {
  name        = "${local.parameter_prefix}/feature-flags/enable-org-management"
  description = "Enable organization management features"
  type        = "String"
  value       = var.enable_org_management ? "true" : "false"

  tags = merge(var.tags, {
    Name = "enable-org-management"
    Type = "feature-flag"
  })
}

resource "aws_ssm_parameter" "enable_exports" {
  name        = "${local.parameter_prefix}/feature-flags/enable-exports"
  description = "Enable data export functionality"
  type        = "String"
  value       = var.enable_exports ? "true" : "false"

  tags = merge(var.tags, {
    Name = "enable-exports"
    Type = "feature-flag"
  })
}

resource "aws_ssm_parameter" "enable_audit_logging" {
  name        = "${local.parameter_prefix}/feature-flags/enable-audit-logging"
  description = "Enable admin audit logging"
  type        = "String"
  value       = var.enable_audit_logging ? "true" : "false"

  tags = merge(var.tags, {
    Name = "enable-audit-logging"
    Type = "feature-flag"
  })
}

# =============================================================================
# Config - CORS Origins
# =============================================================================

resource "aws_ssm_parameter" "admin_cors_origins" {
  name        = "${local.parameter_prefix}/config/admin-cors-origins"
  description = "Allowed CORS origins for admin app"
  type        = "StringList"
  value       = join(",", var.admin_cors_origins)

  tags = merge(var.tags, {
    Name = "admin-cors-origins"
    Type = "config"
  })
}

resource "aws_ssm_parameter" "portal_cors_origins" {
  name        = "${local.parameter_prefix}/config/portal-cors-origins"
  description = "Allowed CORS origins for portal app"
  type        = "StringList"
  value       = join(",", var.portal_cors_origins)

  tags = merge(var.tags, {
    Name = "portal-cors-origins"
    Type = "config"
  })
}

# =============================================================================
# Config - Table References
# =============================================================================

resource "aws_ssm_parameter" "orgs_table_name" {
  name        = "${local.parameter_prefix}/config/tables/orgs"
  description = "DynamoDB table name for organizations"
  type        = "String"
  value       = var.orgs_table_name

  tags = merge(var.tags, {
    Name = "orgs-table"
    Type = "config"
  })
}

resource "aws_ssm_parameter" "users_table_name" {
  name        = "${local.parameter_prefix}/config/tables/users"
  description = "DynamoDB table name for users"
  type        = "String"
  value       = var.users_table_name

  tags = merge(var.tags, {
    Name = "users-table"
    Type = "config"
  })
}

resource "aws_ssm_parameter" "memberships_table_name" {
  name        = "${local.parameter_prefix}/config/tables/memberships"
  description = "DynamoDB table name for memberships"
  type        = "String"
  value       = var.memberships_table_name

  tags = merge(var.tags, {
    Name = "memberships-table"
    Type = "config"
  })
}

resource "aws_ssm_parameter" "assignment_rules_table_name" {
  name        = "${local.parameter_prefix}/config/tables/assignment-rules"
  description = "DynamoDB table name for assignment rules"
  type        = "String"
  value       = var.assignment_rules_table_name

  tags = merge(var.tags, {
    Name = "assignment-rules-table"
    Type = "config"
  })
}

resource "aws_ssm_parameter" "unassigned_table_name" {
  name        = "${local.parameter_prefix}/config/tables/unassigned"
  description = "DynamoDB table name for unassigned leads"
  type        = "String"
  value       = var.unassigned_table_name

  tags = merge(var.tags, {
    Name = "unassigned-table"
    Type = "config"
  })
}

resource "aws_ssm_parameter" "notifications_table_name" {
  name        = "${local.parameter_prefix}/config/tables/notifications"
  description = "DynamoDB table name for notifications"
  type        = "String"
  value       = var.notifications_table_name

  tags = merge(var.tags, {
    Name = "notifications-table"
    Type = "config"
  })
}

# =============================================================================
# Config - Queue References
# =============================================================================

resource "aws_ssm_parameter" "assignment_queue_url" {
  count = var.assignment_queue_url != "" ? 1 : 0

  name        = "${local.parameter_prefix}/config/queues/assignment-queue-url"
  description = "SQS queue URL for lead assignment"
  type        = "String"
  value       = var.assignment_queue_url

  tags = merge(var.tags, {
    Name = "assignment-queue-url"
    Type = "config"
  })
}

resource "aws_ssm_parameter" "notification_queue_url" {
  count = var.notification_queue_url != "" ? 1 : 0

  name        = "${local.parameter_prefix}/config/queues/notification-queue-url"
  description = "SQS queue URL for notifications"
  type        = "String"
  value       = var.notification_queue_url

  tags = merge(var.tags, {
    Name = "notification-queue-url"
    Type = "config"
  })
}

# =============================================================================
# Config - Cognito References
# =============================================================================

resource "aws_ssm_parameter" "admin_cognito_pool_id" {
  count = var.admin_cognito_pool_id != "" ? 1 : 0

  name        = "${local.parameter_prefix}/config/cognito/admin-pool-id"
  description = "Cognito User Pool ID for admin authentication"
  type        = "String"
  value       = var.admin_cognito_pool_id

  tags = merge(var.tags, {
    Name = "admin-cognito-pool-id"
    Type = "config"
  })
}

resource "aws_ssm_parameter" "admin_cognito_client_id" {
  count = var.admin_cognito_client_id != "" ? 1 : 0

  name        = "${local.parameter_prefix}/config/cognito/admin-client-id"
  description = "Cognito App Client ID for admin authentication"
  type        = "String"
  value       = var.admin_cognito_client_id

  tags = merge(var.tags, {
    Name = "admin-cognito-client-id"
    Type = "config"
  })
}

resource "aws_ssm_parameter" "portal_cognito_pool_id" {
  count = var.portal_cognito_pool_id != "" ? 1 : 0

  name        = "${local.parameter_prefix}/config/cognito/portal-pool-id"
  description = "Cognito User Pool ID for portal authentication"
  type        = "String"
  value       = var.portal_cognito_pool_id

  tags = merge(var.tags, {
    Name = "portal-cognito-pool-id"
    Type = "config"
  })
}

resource "aws_ssm_parameter" "portal_cognito_client_id" {
  count = var.portal_cognito_client_id != "" ? 1 : 0

  name        = "${local.parameter_prefix}/config/cognito/portal-client-id"
  description = "Cognito App Client ID for portal authentication"
  type        = "String"
  value       = var.portal_cognito_client_id

  tags = merge(var.tags, {
    Name = "portal-cognito-client-id"
    Type = "config"
  })
}
