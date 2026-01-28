# =============================================================================
# Platform SSM Module - Feature Flags
# =============================================================================
# This file contains:
# - Feature flags for assignment, notifications, portal, admin, multi-tenant
# - Feature flags for exports, audit logging, org management
#
# Related files:
# - config.tf: CORS origins, table references, queue URLs, Cognito refs
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
