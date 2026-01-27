# =============================================================================
# DNS Module - Route 53 Hosted Zone and DNS Records
# =============================================================================
# This module creates:
# - Route 53 hosted zone for the root domain
# - DNS records for root, www, and api subdomains
# - ACM validation records (passed in from ACM module)
# - Health checks for API endpoint monitoring
# =============================================================================

# -----------------------------------------------------------------------------
# Hosted Zone
# -----------------------------------------------------------------------------
resource "aws_route53_zone" "main" {
  name    = var.root_domain
  comment = "${var.project_name} ${var.environment} hosted zone"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-zone"
  })
}

# -----------------------------------------------------------------------------
# Root Domain Record (CloudFront Alias) - Only for prod
# -----------------------------------------------------------------------------
resource "aws_route53_record" "root" {
  count   = var.create_root_records ? 1 : 0
  zone_id = aws_route53_zone.main.zone_id
  name    = var.root_domain
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# IPv6 record for root domain - Only for prod
resource "aws_route53_record" "root_aaaa" {
  count   = var.create_root_records ? 1 : 0
  zone_id = aws_route53_zone.main.zone_id
  name    = var.root_domain
  type    = "AAAA"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# -----------------------------------------------------------------------------
# WWW Subdomain Record (CloudFront Alias) - Only for prod
# -----------------------------------------------------------------------------
resource "aws_route53_record" "www" {
  count   = var.create_root_records ? 1 : 0
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.root_domain}"
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# IPv6 record for www - Only for prod
resource "aws_route53_record" "www_aaaa" {
  count   = var.create_root_records ? 1 : 0
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.root_domain}"
  type    = "AAAA"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# -----------------------------------------------------------------------------
# API Subdomain Record (API Gateway Custom Domain)
# -----------------------------------------------------------------------------
# Use environment-specific subdomain: api.kanjona.com for prod, api-dev.kanjona.com for dev
locals {
  api_subdomain = var.environment == "prod" ? "api.${var.root_domain}" : "api-${var.environment}.${var.root_domain}"
}

resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = local.api_subdomain
  type    = "A"

  alias {
    name                   = var.api_gateway_domain_name
    zone_id                = var.api_gateway_hosted_zone_id
    evaluate_target_health = false
  }
}

# IPv6 record for API
resource "aws_route53_record" "api_aaaa" {
  zone_id = aws_route53_zone.main.zone_id
  name    = local.api_subdomain
  type    = "AAAA"

  alias {
    name                   = var.api_gateway_domain_name
    zone_id                = var.api_gateway_hosted_zone_id
    evaluate_target_health = false
  }
}

# -----------------------------------------------------------------------------
# Additional Subdomain Records (e.g., dev.kanjona.com)
# -----------------------------------------------------------------------------
resource "aws_route53_record" "additional" {
  for_each = toset(var.additional_subdomains)

  zone_id = aws_route53_zone.main.zone_id
  name    = "${each.value}.${var.root_domain}"
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# IPv6 records for additional subdomains
resource "aws_route53_record" "additional_aaaa" {
  for_each = toset(var.additional_subdomains)

  zone_id = aws_route53_zone.main.zone_id
  name    = "${each.value}.${var.root_domain}"
  type    = "AAAA"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# -----------------------------------------------------------------------------
# ACM Certificate Validation Records
# -----------------------------------------------------------------------------
resource "aws_route53_record" "acm_validation" {
  for_each = var.acm_validation_records

  zone_id = aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 300
  records = [each.value.record]

  # Prevent recreation on every apply
  allow_overwrite = true
}

# =============================================================================
# Route 53 Health Checks
# =============================================================================
# Health checks monitor the API endpoint and can be used for:
# - CloudWatch alarms and notifications
# - DNS failover routing (if failover is configured)
# - Monitoring API availability from multiple global locations
# =============================================================================

# API Health Check - monitors the /health endpoint
resource "aws_route53_health_check" "api" {
  count = var.enable_health_check ? 1 : 0

  fqdn              = local.api_subdomain
  port              = 443
  type              = "HTTPS"
  resource_path     = var.health_check_path
  failure_threshold = var.health_check_failure_threshold
  request_interval  = var.health_check_interval

  # Regions to check from (multiple regions for accurate health status)
  regions = var.health_check_regions

  # Enable SNI for HTTPS checks
  enable_sni = true

  # Check for specific string in response (optional)
  search_string = var.health_check_search_string != "" ? var.health_check_search_string : null

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-api-health-check"
  })
}

# CloudWatch Alarm for Health Check
resource "aws_cloudwatch_metric_alarm" "api_health" {
  count = var.enable_health_check && var.enable_health_check_alarm ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-api-health"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "API health check failed - endpoint may be unavailable"
  treat_missing_data  = "breaching"

  dimensions = {
    HealthCheckId = aws_route53_health_check.api[0].id
  }

  # SNS topic for notifications (if provided)
  alarm_actions = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
  ok_actions    = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  tags = var.tags
}

# Website Health Check (optional - for static site)
resource "aws_route53_health_check" "website" {
  count = var.enable_website_health_check && var.create_root_records ? 1 : 0

  fqdn              = var.root_domain
  port              = 443
  type              = "HTTPS"
  resource_path     = "/"
  failure_threshold = var.health_check_failure_threshold
  request_interval  = var.health_check_interval

  regions = var.health_check_regions

  enable_sni = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-website-health-check"
  })
}

# CloudWatch Alarm for Website Health Check
resource "aws_cloudwatch_metric_alarm" "website_health" {
  count = var.enable_website_health_check && var.enable_health_check_alarm && var.create_root_records ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-website-health"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "Website health check failed - site may be unavailable"
  treat_missing_data  = "breaching"

  dimensions = {
    HealthCheckId = aws_route53_health_check.website[0].id
  }

  alarm_actions = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
  ok_actions    = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  tags = var.tags
}
