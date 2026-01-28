# =============================================================================
# CloudWatch Synthetics Canaries - API Health + Website Availability
# =============================================================================
# This file contains the actual canary resources and their inline scripts.
# S3 + IAM are in main.tf, alarms are in alarms.tf.
# =============================================================================

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
