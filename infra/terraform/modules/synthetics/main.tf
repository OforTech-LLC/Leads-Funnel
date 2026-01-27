# =============================================================================
# CloudWatch Synthetics Module - Canary Monitoring
# =============================================================================
# This module creates:
# - API health check canary
# - Website availability canary
# - S3 bucket for canary artifacts
# - CloudWatch alarms for canary failures
# - IAM roles and policies for canaries
# =============================================================================

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# Local Values
# -----------------------------------------------------------------------------
locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# =============================================================================
# S3 Bucket for Canary Artifacts
# =============================================================================
resource "aws_s3_bucket" "canary_artifacts" {
  bucket = "${local.name_prefix}-canary-artifacts-${data.aws_caller_identity.current.account_id}"

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-canary-artifacts"
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "canary_artifacts" {
  bucket = aws_s3_bucket.canary_artifacts.id

  rule {
    id     = "cleanup-old-artifacts"
    status = "Enabled"

    expiration {
      days = var.artifact_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }
}

resource "aws_s3_bucket_versioning" "canary_artifacts" {
  bucket = aws_s3_bucket.canary_artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "canary_artifacts" {
  bucket = aws_s3_bucket.canary_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "canary_artifacts" {
  bucket = aws_s3_bucket.canary_artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# =============================================================================
# IAM Role for Canaries
# =============================================================================
resource "aws_iam_role" "canary" {
  name = "${local.name_prefix}-canary-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-canary-role"
  })
}

resource "aws_iam_role_policy" "canary" {
  name = "${local.name_prefix}-canary-policy"
  role = aws_iam_role.canary.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # S3 permissions for artifact storage
      {
        Sid    = "S3ArtifactAccess"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:GetBucketLocation"
        ]
        Resource = [
          aws_s3_bucket.canary_artifacts.arn,
          "${aws_s3_bucket.canary_artifacts.arn}/*"
        ]
      },
      # CloudWatch Logs permissions
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:CreateLogGroup"
        ]
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/cwsyn-*"
      },
      # CloudWatch metrics permissions
      {
        Sid    = "CloudWatchMetrics"
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "cloudwatch:namespace" = "CloudWatchSynthetics"
          }
        }
      },
      # X-Ray tracing (optional)
      {
        Sid    = "XRayTracing"
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments"
        ]
        Resource = "*"
      }
    ]
  })
}

# =============================================================================
# API Health Check Canary
# =============================================================================
resource "aws_synthetics_canary" "api_health" {
  count = var.enable_api_canary ? 1 : 0

  name                 = "${local.name_prefix}-api-health"
  artifact_s3_location = "s3://${aws_s3_bucket.canary_artifacts.id}/api-health/"
  execution_role_arn   = aws_iam_role.canary.arn
  handler              = "apiCanaryBlueprint.handler"
  runtime_version      = var.canary_runtime_version

  schedule {
    expression = var.api_canary_schedule
  }

  run_config {
    timeout_in_seconds = var.canary_timeout_seconds
    memory_in_mb       = 960
    active_tracing     = var.enable_xray_tracing
  }

  # Inline script for API health check
  zip_file = data.archive_file.api_health_canary[0].output_path

  start_canary = true

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-api-health"
    Type = "api-health-check"
  })

  depends_on = [aws_iam_role_policy.canary]
}

# API Health Check Canary Script
data "archive_file" "api_health_canary" {
  count = var.enable_api_canary ? 1 : 0

  type        = "zip"
  output_path = "${path.module}/api_health_canary.zip"

  source {
    content  = <<-EOF
      const { URL } = require('url');
      const synthetics = require('Synthetics');
      const log = require('SyntheticsLogger');

      const apiCanaryBlueprint = async function () {
        const apiUrl = '${var.api_health_endpoint}';

        log.info('Starting API health check for: ' + apiUrl);

        // Configure request
        const requestOptions = {
          hostname: new URL(apiUrl).hostname,
          method: 'GET',
          path: new URL(apiUrl).pathname,
          port: 443,
          protocol: 'https:',
          headers: {
            'User-Agent': 'CloudWatch-Synthetics-Canary'
          }
        };

        // Step 1: Check API health endpoint
        let stepConfig = {
          includeRequestHeaders: true,
          includeResponseHeaders: true,
          includeRequestBody: false,
          includeResponseBody: true,
          continueOnHttpStepFailure: false
        };

        await synthetics.executeHttpStep('verifyApiHealth', requestOptions, async function(response) {
          const statusCode = response.statusCode;

          log.info('Response status code: ' + statusCode);

          // Verify successful response
          if (statusCode !== 200) {
            throw new Error('Expected status code 200, got ' + statusCode);
          }

          // Parse response body
          let responseBody = '';
          response.on('data', (chunk) => {
            responseBody += chunk;
          });

          await new Promise((resolve) => response.on('end', resolve));

          log.info('Response body: ' + responseBody);

          // Verify response contains expected fields
          const data = JSON.parse(responseBody);
          if (!data.status || data.status !== 'healthy') {
            throw new Error('API health check failed: ' + JSON.stringify(data));
          }

          log.info('API health check passed');
        }, stepConfig);
      };

      exports.handler = async () => {
        return await apiCanaryBlueprint();
      };
    EOF
    filename = "nodejs/node_modules/apiCanaryBlueprint.js"
  }
}

# =============================================================================
# Website Availability Canary
# =============================================================================
resource "aws_synthetics_canary" "website" {
  count = var.enable_website_canary ? 1 : 0

  name                 = "${local.name_prefix}-website"
  artifact_s3_location = "s3://${aws_s3_bucket.canary_artifacts.id}/website/"
  execution_role_arn   = aws_iam_role.canary.arn
  handler              = "websiteCanaryBlueprint.handler"
  runtime_version      = var.canary_runtime_version

  schedule {
    expression = var.website_canary_schedule
  }

  run_config {
    timeout_in_seconds = var.canary_timeout_seconds
    memory_in_mb       = 1024
    active_tracing     = var.enable_xray_tracing
  }

  # Inline script for website availability check
  zip_file = data.archive_file.website_canary[0].output_path

  start_canary = true

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-website"
    Type = "website-availability"
  })

  depends_on = [aws_iam_role_policy.canary]
}

# Website Canary Script
data "archive_file" "website_canary" {
  count = var.enable_website_canary ? 1 : 0

  type        = "zip"
  output_path = "${path.module}/website_canary.zip"

  source {
    content  = <<-EOF
      const { URL } = require('url');
      const synthetics = require('Synthetics');
      const log = require('SyntheticsLogger');

      const websiteCanaryBlueprint = async function () {
        const websiteUrl = '${var.website_url}';

        log.info('Starting website availability check for: ' + websiteUrl);

        // Configure request
        const requestOptions = {
          hostname: new URL(websiteUrl).hostname,
          method: 'GET',
          path: new URL(websiteUrl).pathname || '/',
          port: 443,
          protocol: 'https:',
          headers: {
            'User-Agent': 'CloudWatch-Synthetics-Canary'
          }
        };

        // Step 1: Check website is accessible
        let stepConfig = {
          includeRequestHeaders: true,
          includeResponseHeaders: true,
          includeRequestBody: false,
          includeResponseBody: false, // Don't include full HTML
          continueOnHttpStepFailure: false
        };

        await synthetics.executeHttpStep('verifyWebsiteAvailable', requestOptions, async function(response) {
          const statusCode = response.statusCode;

          log.info('Response status code: ' + statusCode);

          // Verify successful response (200-399 range)
          if (statusCode < 200 || statusCode >= 400) {
            throw new Error('Expected successful status code, got ' + statusCode);
          }

          // Check for expected content-type
          const contentType = response.headers['content-type'];
          if (!contentType || !contentType.includes('text/html')) {
            log.warn('Unexpected content-type: ' + contentType);
          }

          log.info('Website availability check passed');
        }, stepConfig);
      };

      exports.handler = async () => {
        return await websiteCanaryBlueprint();
      };
    EOF
    filename = "nodejs/node_modules/websiteCanaryBlueprint.js"
  }
}

# =============================================================================
# CloudWatch Alarms for Canaries
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
