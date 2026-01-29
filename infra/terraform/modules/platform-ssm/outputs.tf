# =============================================================================
# Platform SSM Module Outputs
# =============================================================================

output "parameter_prefix" {
  description = "SSM parameter prefix for this environment"
  value       = local.parameter_prefix
}

output "feature_flag_arns" {
  description = "Map of platform feature flag names to their ARNs"
  value = {
    enable_assignment_engine  = aws_ssm_parameter.enable_assignment_engine.arn
    enable_portal             = aws_ssm_parameter.enable_portal.arn
    enable_multi_tenant       = aws_ssm_parameter.enable_multi_tenant.arn
    enable_auto_assignment    = aws_ssm_parameter.enable_auto_assignment.arn
    enable_lead_notifications = aws_ssm_parameter.enable_lead_notifications.arn
    enable_org_management     = aws_ssm_parameter.enable_org_management.arn
    enable_exports            = aws_ssm_parameter.enable_exports.arn
    enable_audit_logging      = aws_ssm_parameter.enable_audit_logging.arn
  }
}

output "all_parameter_arns" {
  description = "List of all platform SSM parameter ARNs for IAM policies"
  value = concat(
    [
      aws_ssm_parameter.enable_assignment_engine.arn,
      aws_ssm_parameter.enable_portal.arn,
      aws_ssm_parameter.enable_multi_tenant.arn,
      aws_ssm_parameter.enable_auto_assignment.arn,
      aws_ssm_parameter.enable_lead_notifications.arn,
      aws_ssm_parameter.enable_org_management.arn,
      aws_ssm_parameter.enable_exports.arn,
      aws_ssm_parameter.enable_audit_logging.arn,
      aws_ssm_parameter.worker_feature_flags.arn,
      aws_ssm_parameter.assignment_rules.arn,
      aws_ssm_parameter.internal_recipients.arn,
      aws_ssm_parameter.admin_cors_origins.arn,
      aws_ssm_parameter.portal_cors_origins.arn,
      aws_ssm_parameter.orgs_table_name.arn,
      aws_ssm_parameter.users_table_name.arn,
      aws_ssm_parameter.memberships_table_name.arn,
      aws_ssm_parameter.assignment_rules_table_name.arn,
      aws_ssm_parameter.unassigned_table_name.arn,
      aws_ssm_parameter.notifications_table_name.arn,
    ],
    var.assignment_queue_url != "" ? [aws_ssm_parameter.assignment_queue_url[0].arn] : [],
    var.notification_queue_url != "" ? [aws_ssm_parameter.notification_queue_url[0].arn] : [],
    var.admin_cognito_pool_id != "" ? [aws_ssm_parameter.admin_cognito_pool_id[0].arn] : [],
    var.admin_cognito_client_id != "" ? [aws_ssm_parameter.admin_cognito_client_id[0].arn] : [],
    var.portal_cognito_pool_id != "" ? [aws_ssm_parameter.portal_cognito_pool_id[0].arn] : [],
    var.portal_cognito_client_id != "" ? [aws_ssm_parameter.portal_cognito_client_id[0].arn] : [],
  )
}
