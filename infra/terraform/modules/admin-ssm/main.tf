/**
 * Admin SSM Parameters
 *
 * Feature flags and configuration for admin console.
 */

# =====================================================
# Feature Flags
# =====================================================

resource "aws_ssm_parameter" "enable_admin_console" {
  name        = "/${var.project_name}/${var.environment}/features/enable_admin_console"
  description = "Enable admin console (true/false)"
  type        = "String"
  value       = var.enable_admin_console ? "true" : "false"

  tags = var.tags
}

resource "aws_ssm_parameter" "enable_admin_ip_allowlist" {
  name        = "/${var.project_name}/${var.environment}/features/enable_admin_ip_allowlist"
  description = "Enable IP allowlist for admin console (true/false)"
  type        = "String"
  value       = var.enable_admin_ip_allowlist ? "true" : "false"

  tags = var.tags
}

# =====================================================
# Admin Configuration
# =====================================================

resource "aws_ssm_parameter" "admin_allowed_emails" {
  name        = "/${var.project_name}/${var.environment}/admin/allowed_emails"
  description = "Comma-separated list of allowed admin email addresses"
  type        = "SecureString"
  value       = var.admin_allowed_emails

  tags = var.tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "admin_allowed_cidrs" {
  name        = "/${var.project_name}/${var.environment}/admin/allowed_cidrs"
  description = "Comma-separated list of allowed CIDR blocks for admin access"
  type        = "SecureString"
  value       = var.admin_allowed_cidrs

  tags = var.tags

  lifecycle {
    ignore_changes = [value]
  }
}

# =====================================================
# Cognito Configuration (for frontend reference)
# =====================================================

resource "aws_ssm_parameter" "cognito_user_pool_id" {
  name        = "/${var.project_name}/${var.environment}/admin/cognito_user_pool_id"
  description = "Cognito User Pool ID for admin authentication"
  type        = "String"
  value       = var.cognito_user_pool_id

  tags = var.tags
}

resource "aws_ssm_parameter" "cognito_client_id" {
  name        = "/${var.project_name}/${var.environment}/admin/cognito_client_id"
  description = "Cognito App Client ID for admin authentication"
  type        = "String"
  value       = var.cognito_client_id

  tags = var.tags
}

resource "aws_ssm_parameter" "cognito_domain" {
  name        = "/${var.project_name}/${var.environment}/admin/cognito_domain"
  description = "Cognito Hosted UI domain for admin authentication"
  type        = "String"
  value       = var.cognito_domain

  tags = var.tags
}
