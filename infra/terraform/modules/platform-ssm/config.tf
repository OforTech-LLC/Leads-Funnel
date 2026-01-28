# =============================================================================
# Platform SSM Module - Configuration Parameters
# =============================================================================
# This file contains:
# - CORS origins for admin and portal apps
# - DynamoDB table name references
# - SQS queue URL references
# - Cognito pool and client ID references
#
# Related files:
# - main.tf: Feature flags
# =============================================================================

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
