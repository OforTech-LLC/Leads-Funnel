# =============================================================================
# WAF Module - Web Application Firewall
# =============================================================================
# This module creates:
# - WAF Web ACL for CloudFront (must be in us-east-1)
# - AWS Managed Rules (Common, Known Bad Inputs)
# - Custom rate limiting rule
# - CloudWatch logging (optional)
#
# IMPORTANT: WAF for CloudFront MUST be created in us-east-1
# =============================================================================

# -----------------------------------------------------------------------------
# WAF Web ACL
# -----------------------------------------------------------------------------
resource "aws_wafv2_web_acl" "main" {
  name        = "${var.project_name}-${var.environment}-waf"
  description = "WAF Web ACL for ${var.project_name} ${var.environment}"
  scope       = "CLOUDFRONT" # Must be CLOUDFRONT for CloudFront distributions

  default_action {
    allow {}
  }

  # ---------------------------------------------------------------------------
  # Rule 0: Rate Limiting (Evaluated First)
  # ---------------------------------------------------------------------------
  rule {
    name     = "RateLimitRule"
    priority = 0

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_requests
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-${var.environment}-rate-limit"
      sampled_requests_enabled   = true
    }

    action {
      block {}
    }
  }

  # ---------------------------------------------------------------------------
  # Rule 1: AWS Managed Rules - Common Rule Set
  # ---------------------------------------------------------------------------
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # Exclude rules that might cause false positives for APIs
        dynamic "rule_action_override" {
          for_each = var.common_rules_excluded
          content {
            name = rule_action_override.value
            action_to_use {
              count {}
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-${var.environment}-common-rules"
      sampled_requests_enabled   = true
    }
  }

  # ---------------------------------------------------------------------------
  # Rule 2: AWS Managed Rules - Known Bad Inputs
  # ---------------------------------------------------------------------------
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-${var.environment}-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  # Global visibility config
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-${var.environment}-waf"
    sampled_requests_enabled   = true
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-waf"
  })
}

# -----------------------------------------------------------------------------
# CloudWatch Log Group for WAF (Optional)
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "waf" {
  count = var.enable_logging ? 1 : 0

  # WAF logging requires the log group name to start with aws-waf-logs-
  name              = "aws-waf-logs-${var.project_name}-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name = "aws-waf-logs-${var.project_name}-${var.environment}"
  })
}

# -----------------------------------------------------------------------------
# WAF Logging Configuration
# -----------------------------------------------------------------------------
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  count = var.enable_logging ? 1 : 0

  log_destination_configs = [aws_cloudwatch_log_group.waf[0].arn]
  resource_arn            = aws_wafv2_web_acl.main.arn

  # Optionally redact sensitive fields
  dynamic "redacted_fields" {
    for_each = var.redacted_fields
    content {
      single_header {
        name = redacted_fields.value
      }
    }
  }
}
