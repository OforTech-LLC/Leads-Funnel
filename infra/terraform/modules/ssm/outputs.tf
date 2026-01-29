# =============================================================================
# SSM Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# Feature Flag ARNs
# -----------------------------------------------------------------------------
output "feature_flag_arns" {
  description = "Map of feature flag names to their ARNs"
  value = {
    enable_voice_agent         = aws_ssm_parameter.enable_voice_agent.arn
    enable_twilio              = aws_ssm_parameter.enable_twilio.arn
    enable_elevenlabs          = aws_ssm_parameter.enable_elevenlabs.arn
    enable_waf                 = aws_ssm_parameter.enable_waf.arn
    enable_pitr                = aws_ssm_parameter.enable_pitr.arn
    enable_email_notifications = aws_ssm_parameter.enable_email_notifications.arn
    enable_sms_notifications   = aws_ssm_parameter.enable_sms_notifications.arn
    enable_deduplication       = aws_ssm_parameter.enable_deduplication.arn
    enable_rate_limiting       = aws_ssm_parameter.enable_rate_limiting.arn
    enable_debug               = aws_ssm_parameter.enable_debug.arn
  }
}

# -----------------------------------------------------------------------------
# Feature Flag Names
# -----------------------------------------------------------------------------
output "feature_flag_names" {
  description = "Map of feature flag names to their SSM parameter names"
  value = {
    enable_voice_agent         = aws_ssm_parameter.enable_voice_agent.name
    enable_twilio              = aws_ssm_parameter.enable_twilio.name
    enable_elevenlabs          = aws_ssm_parameter.enable_elevenlabs.name
    enable_waf                 = aws_ssm_parameter.enable_waf.name
    enable_pitr                = aws_ssm_parameter.enable_pitr.name
    enable_email_notifications = aws_ssm_parameter.enable_email_notifications.name
    enable_sms_notifications   = aws_ssm_parameter.enable_sms_notifications.name
    enable_deduplication       = aws_ssm_parameter.enable_deduplication.name
    enable_rate_limiting       = aws_ssm_parameter.enable_rate_limiting.name
    enable_debug               = aws_ssm_parameter.enable_debug.name
  }
}

# -----------------------------------------------------------------------------
# Configuration Parameter ARNs
# -----------------------------------------------------------------------------
output "config_arns" {
  description = "Map of configuration parameter names to their ARNs"
  value = {
    funnels_config               = aws_ssm_parameter.funnels_config.arn
    funnel_ids                   = aws_ssm_parameter.funnel_ids.arn
    rate_limit_max               = aws_ssm_parameter.rate_limit_max.arn
    rate_limit_window            = aws_ssm_parameter.rate_limit_window.arn
    idempotency_ttl              = aws_ssm_parameter.idempotency_ttl.arn
    quality_quarantine_threshold = aws_ssm_parameter.quality_quarantine_threshold.arn
    api_base_url                 = aws_ssm_parameter.api_base_url.arn
    environment                  = aws_ssm_parameter.environment.arn
  }
}

# -----------------------------------------------------------------------------
# Configuration Parameter Names
# -----------------------------------------------------------------------------
output "config_names" {
  description = "Map of configuration parameter names to their SSM parameter names"
  value = {
    funnels_config               = aws_ssm_parameter.funnels_config.name
    funnel_ids                   = aws_ssm_parameter.funnel_ids.name
    rate_limit_max               = aws_ssm_parameter.rate_limit_max.name
    rate_limit_window            = aws_ssm_parameter.rate_limit_window.name
    idempotency_ttl              = aws_ssm_parameter.idempotency_ttl.name
    quality_quarantine_threshold = aws_ssm_parameter.quality_quarantine_threshold.name
    api_base_url                 = aws_ssm_parameter.api_base_url.name
    environment                  = aws_ssm_parameter.environment.name
  }
}

# -----------------------------------------------------------------------------
# Parameter Prefix
# -----------------------------------------------------------------------------
output "parameter_prefix" {
  description = "SSM parameter prefix for this environment"
  value       = "/${var.project_name}/${var.environment}"
}

# -----------------------------------------------------------------------------
# All Parameter ARNs (for IAM policies)
# -----------------------------------------------------------------------------
output "all_parameter_arns" {
  description = "List of all SSM parameter ARNs for IAM policies"
  value = [
    aws_ssm_parameter.enable_voice_agent.arn,
    aws_ssm_parameter.enable_twilio.arn,
    aws_ssm_parameter.enable_elevenlabs.arn,
    aws_ssm_parameter.enable_waf.arn,
    aws_ssm_parameter.enable_pitr.arn,
    aws_ssm_parameter.enable_email_notifications.arn,
    aws_ssm_parameter.enable_sms_notifications.arn,
    aws_ssm_parameter.enable_deduplication.arn,
    aws_ssm_parameter.enable_rate_limiting.arn,
    aws_ssm_parameter.enable_debug.arn,
    aws_ssm_parameter.funnels_config.arn,
    aws_ssm_parameter.funnel_ids.arn,
    aws_ssm_parameter.rate_limit_max.arn,
    aws_ssm_parameter.rate_limit_window.arn,
    aws_ssm_parameter.idempotency_ttl.arn,
    aws_ssm_parameter.quality_quarantine_threshold.arn,
    aws_ssm_parameter.api_base_url.arn,
    aws_ssm_parameter.environment.arn,
  ]
}

# -----------------------------------------------------------------------------
# Parameter Path Pattern (for IAM wildcard policies)
# -----------------------------------------------------------------------------
output "parameter_path_pattern" {
  description = "SSM parameter path pattern for IAM wildcard policies"
  value       = "arn:aws:ssm:*:*:parameter/${var.project_name}/${var.environment}/*"
}
