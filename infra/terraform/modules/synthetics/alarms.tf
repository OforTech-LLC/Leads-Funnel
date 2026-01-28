# =============================================================================
# CloudWatch Alarms for Synthetics Canaries
# =============================================================================
# Success rate and duration alarms for API health and website canaries.
# =============================================================================

# API Health Check Canary Alarm
resource "aws_cloudwatch_metric_alarm" "api_canary_failed" {
  count = var.enable_api_canary ? 1 : 0

  alarm_name          = "${local.name_prefix}-api-canary-failed"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "SuccessPercent"
  namespace           = "CloudWatchSynthetics"
  period              = 300
  statistic           = "Average"
  threshold           = 100
  alarm_description   = "API health check canary is failing"
  treat_missing_data  = "breaching"

  dimensions = {
    CanaryName = aws_synthetics_canary.api_health[0].name
  }

  alarm_actions = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []
  ok_actions    = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []

  tags = var.tags
}

# API Canary Duration Alarm
resource "aws_cloudwatch_metric_alarm" "api_canary_duration" {
  count = var.enable_api_canary ? 1 : 0

  alarm_name          = "${local.name_prefix}-api-canary-slow"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Duration"
  namespace           = "CloudWatchSynthetics"
  period              = 300
  statistic           = "Average"
  threshold           = var.api_canary_duration_threshold
  alarm_description   = "API health check canary is slow"
  treat_missing_data  = "notBreaching"

  dimensions = {
    CanaryName = aws_synthetics_canary.api_health[0].name
  }

  alarm_actions = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []

  tags = var.tags
}

# Website Canary Alarm
resource "aws_cloudwatch_metric_alarm" "website_canary_failed" {
  count = var.enable_website_canary ? 1 : 0

  alarm_name          = "${local.name_prefix}-website-canary-failed"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "SuccessPercent"
  namespace           = "CloudWatchSynthetics"
  period              = 300
  statistic           = "Average"
  threshold           = 100
  alarm_description   = "Website availability canary is failing"
  treat_missing_data  = "breaching"

  dimensions = {
    CanaryName = aws_synthetics_canary.website[0].name
  }

  alarm_actions = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []
  ok_actions    = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []

  tags = var.tags
}

# Website Canary Duration Alarm
resource "aws_cloudwatch_metric_alarm" "website_canary_duration" {
  count = var.enable_website_canary ? 1 : 0

  alarm_name          = "${local.name_prefix}-website-canary-slow"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Duration"
  namespace           = "CloudWatchSynthetics"
  period              = 300
  statistic           = "Average"
  threshold           = var.website_canary_duration_threshold
  alarm_description   = "Website availability canary is slow"
  treat_missing_data  = "notBreaching"

  dimensions = {
    CanaryName = aws_synthetics_canary.website[0].name
  }

  alarm_actions = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []

  tags = var.tags
}
