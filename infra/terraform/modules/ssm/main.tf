# =============================================================================
# SSM Parameter Store Module
# =============================================================================
# This module creates:
# - Feature flags for controlling system behavior
# - Funnels configuration JSON parameter
# - Runtime configuration parameters
# - Integration toggles (Twilio, ElevenLabs, WAF, PITR, etc.)
# =============================================================================

# -----------------------------------------------------------------------------
# Local Values
# -----------------------------------------------------------------------------
locals {
  parameter_prefix = "/${var.project_name}/${var.environment}"

  # Build funnels config JSON
  funnels_config = jsonencode({
    funnels = [for id in var.funnel_ids : {
      id         = id
      table_name = "${var.project_name}-${var.environment}-${id}"
      active     = try(var.funnel_metadata[id].active, true)
      category   = try(var.funnel_metadata[id].category, "default")
    }]
    rate_limits_table = "${var.project_name}-${var.environment}-rate-limits"
    idempotency_table = "${var.project_name}-${var.environment}-idempotency"
    updated_at        = timestamp()
  })
}

# =============================================================================
# Feature Flags
# =============================================================================

# -----------------------------------------------------------------------------
# Voice Agent Feature Flag
# -----------------------------------------------------------------------------
resource "aws_ssm_parameter" "enable_voice_agent" {
  name        = "${local.parameter_prefix}/feature-flags/enable-voice-agent"
  description = "Enable AI voice agent functionality"
  type        = "String"
  value       = var.enable_voice_agent ? "true" : "false"

  tags = merge(var.tags, {
    Name = "enable-voice-agent"
    Type = "feature-flag"
  })
}

# -----------------------------------------------------------------------------
# Twilio Integration Feature Flag
# -----------------------------------------------------------------------------
resource "aws_ssm_parameter" "enable_twilio" {
  name        = "${local.parameter_prefix}/feature-flags/enable-twilio"
  description = "Enable Twilio SMS/Voice integration"
  type        = "String"
  value       = var.enable_twilio ? "true" : "false"

  tags = merge(var.tags, {
    Name = "enable-twilio"
    Type = "feature-flag"
  })
}

# -----------------------------------------------------------------------------
# ElevenLabs Integration Feature Flag
# -----------------------------------------------------------------------------
resource "aws_ssm_parameter" "enable_elevenlabs" {
  name        = "${local.parameter_prefix}/feature-flags/enable-elevenlabs"
  description = "Enable ElevenLabs AI voice synthesis"
  type        = "String"
  value       = var.enable_elevenlabs ? "true" : "false"

  tags = merge(var.tags, {
    Name = "enable-elevenlabs"
    Type = "feature-flag"
  })
}

# -----------------------------------------------------------------------------
# WAF Feature Flag
# -----------------------------------------------------------------------------
resource "aws_ssm_parameter" "enable_waf" {
  name        = "${local.parameter_prefix}/feature-flags/enable-waf"
  description = "Enable WAF protection"
  type        = "String"
  value       = var.enable_waf ? "true" : "false"

  tags = merge(var.tags, {
    Name = "enable-waf"
    Type = "feature-flag"
  })
}

# -----------------------------------------------------------------------------
# PITR (Point-in-Time Recovery) Feature Flag
# -----------------------------------------------------------------------------
resource "aws_ssm_parameter" "enable_pitr" {
  name        = "${local.parameter_prefix}/feature-flags/enable-pitr"
  description = "Enable DynamoDB Point-in-Time Recovery"
  type        = "String"
  value       = var.enable_pitr ? "true" : "false"

  tags = merge(var.tags, {
    Name = "enable-pitr"
    Type = "feature-flag"
  })
}

# -----------------------------------------------------------------------------
# Email Notifications Feature Flag
# -----------------------------------------------------------------------------
resource "aws_ssm_parameter" "enable_email_notifications" {
  name        = "${local.parameter_prefix}/feature-flags/enable-email-notifications"
  description = "Enable email notifications for new leads"
  type        = "String"
  value       = var.enable_email_notifications ? "true" : "false"

  tags = merge(var.tags, {
    Name = "enable-email-notifications"
    Type = "feature-flag"
  })
}

# -----------------------------------------------------------------------------
# SMS Notifications Feature Flag
# -----------------------------------------------------------------------------
resource "aws_ssm_parameter" "enable_sms_notifications" {
  name        = "${local.parameter_prefix}/feature-flags/enable-sms-notifications"
  description = "Enable SMS notifications for new leads"
  type        = "String"
  value       = var.enable_sms_notifications ? "true" : "false"

  tags = merge(var.tags, {
    Name = "enable-sms-notifications"
    Type = "feature-flag"
  })
}

# -----------------------------------------------------------------------------
# Lead Deduplication Feature Flag
# -----------------------------------------------------------------------------
resource "aws_ssm_parameter" "enable_deduplication" {
  name        = "${local.parameter_prefix}/feature-flags/enable-deduplication"
  description = "Enable lead deduplication based on email/phone"
  type        = "String"
  value       = var.enable_deduplication ? "true" : "false"

  tags = merge(var.tags, {
    Name = "enable-deduplication"
    Type = "feature-flag"
  })
}

# -----------------------------------------------------------------------------
# Rate Limiting Feature Flag
# -----------------------------------------------------------------------------
resource "aws_ssm_parameter" "enable_rate_limiting" {
  name        = "${local.parameter_prefix}/feature-flags/enable-rate-limiting"
  description = "Enable rate limiting for lead submissions"
  type        = "String"
  value       = var.enable_rate_limiting ? "true" : "false"

  tags = merge(var.tags, {
    Name = "enable-rate-limiting"
    Type = "feature-flag"
  })
}

# -----------------------------------------------------------------------------
# Debug Mode Feature Flag
# -----------------------------------------------------------------------------
resource "aws_ssm_parameter" "enable_debug" {
  name        = "${local.parameter_prefix}/feature-flags/enable-debug"
  description = "Enable debug logging and verbose output"
  type        = "String"
  value       = var.enable_debug ? "true" : "false"

  tags = merge(var.tags, {
    Name = "enable-debug"
    Type = "feature-flag"
  })
}

# =============================================================================
# Funnels Configuration
# =============================================================================

# -----------------------------------------------------------------------------
# Funnels Config JSON
# -----------------------------------------------------------------------------
# Contains all 47 funnel configurations including table names and metadata
# -----------------------------------------------------------------------------
resource "aws_ssm_parameter" "funnels_config" {
  name        = "${local.parameter_prefix}/config/funnels"
  description = "Complete funnels configuration including all 47 funnels"
  type        = "String"
  value       = local.funnels_config
  tier        = "Advanced" # Required for values > 4KB

  tags = merge(var.tags, {
    Name = "funnels-config"
    Type = "config"
  })

  lifecycle {
    ignore_changes = [value] # Prevent timestamp from causing constant updates
  }
}

# -----------------------------------------------------------------------------
# Funnel IDs List
# -----------------------------------------------------------------------------
resource "aws_ssm_parameter" "funnel_ids" {
  name        = "${local.parameter_prefix}/config/funnel-ids"
  description = "Comma-separated list of all funnel IDs"
  type        = "StringList"
  value       = join(",", var.funnel_ids)

  tags = merge(var.tags, {
    Name = "funnel-ids"
    Type = "config"
  })
}

# =============================================================================
# Runtime Configuration
# =============================================================================

# -----------------------------------------------------------------------------
# Rate Limit Configuration
# -----------------------------------------------------------------------------
resource "aws_ssm_parameter" "rate_limit_max" {
  name        = "${local.parameter_prefix}/config/rate-limit-max"
  description = "Maximum requests per rate limit window"
  type        = "String"
  value       = tostring(var.rate_limit_max)

  tags = merge(var.tags, {
    Name = "rate-limit-max"
    Type = "config"
  })
}

resource "aws_ssm_parameter" "rate_limit_window" {
  name        = "${local.parameter_prefix}/config/rate-limit-window-minutes"
  description = "Rate limit window size in minutes"
  type        = "String"
  value       = tostring(var.rate_limit_window_minutes)

  tags = merge(var.tags, {
    Name = "rate-limit-window"
    Type = "config"
  })
}

# -----------------------------------------------------------------------------
# Idempotency TTL Configuration
# -----------------------------------------------------------------------------
resource "aws_ssm_parameter" "idempotency_ttl" {
  name        = "${local.parameter_prefix}/config/idempotency-ttl-hours"
  description = "Idempotency key TTL in hours"
  type        = "String"
  value       = tostring(var.idempotency_ttl_hours)

  tags = merge(var.tags, {
    Name = "idempotency-ttl"
    Type = "config"
  })
}

# -----------------------------------------------------------------------------
# Quality Scoring Configuration
# -----------------------------------------------------------------------------
resource "aws_ssm_parameter" "quality_quarantine_threshold" {
  name        = "${local.parameter_prefix}/quality/quarantine_threshold"
  description = "Lead quality score threshold for quarantine (0-100)"
  type        = "String"
  value       = tostring(var.quality_quarantine_threshold)

  tags = merge(var.tags, {
    Name = "quality-quarantine-threshold"
    Type = "config"
  })
}

# -----------------------------------------------------------------------------
# API Base URL
# -----------------------------------------------------------------------------
resource "aws_ssm_parameter" "api_base_url" {
  name        = "${local.parameter_prefix}/config/api-base-url"
  description = "API base URL for the environment"
  type        = "String"
  value       = var.api_base_url

  tags = merge(var.tags, {
    Name = "api-base-url"
    Type = "config"
  })
}

# -----------------------------------------------------------------------------
# Environment Name
# -----------------------------------------------------------------------------
resource "aws_ssm_parameter" "environment" {
  name        = "${local.parameter_prefix}/config/environment"
  description = "Current environment name"
  type        = "String"
  value       = var.environment

  tags = merge(var.tags, {
    Name = "environment"
    Type = "config"
  })
}
