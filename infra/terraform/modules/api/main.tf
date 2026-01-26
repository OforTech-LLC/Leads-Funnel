# =============================================================================
# API Module - API Gateway HTTP API + Custom Domain
# =============================================================================
# This module creates:
# - API Gateway HTTP API (v2)
# - Lambda integration for lead capture
# - Custom domain for api.<root_domain>
# - CORS configuration
# - Access logging (optional)
# =============================================================================

# -----------------------------------------------------------------------------
# API Gateway HTTP API
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-${var.environment}-api"
  protocol_type = "HTTP"
  description   = "Lead capture API for ${var.project_name} ${var.environment}"

  # CORS configuration
  cors_configuration {
    allow_origins     = var.cors_allowed_origins
    allow_methods     = ["POST", "OPTIONS"]
    allow_headers     = ["Content-Type", "X-Requested-With", "X-Idempotency-Key"]
    expose_headers    = ["X-Request-Id"]
    max_age           = 7200 # 2 hours
    allow_credentials = false
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-api"
  })
}

# -----------------------------------------------------------------------------
# API Gateway Stage
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  # Throttling
  default_route_settings {
    throttling_burst_limit = var.throttling_burst_limit
    throttling_rate_limit  = var.throttling_rate_limit
  }

  # Access logging (optional)
  dynamic "access_log_settings" {
    for_each = var.enable_logging ? [1] : []
    content {
      destination_arn = aws_cloudwatch_log_group.api[0].arn
      format = jsonencode({
        requestId        = "$context.requestId"
        ip               = "$context.identity.sourceIp"
        requestTime      = "$context.requestTime"
        httpMethod       = "$context.httpMethod"
        routeKey         = "$context.routeKey"
        status           = "$context.status"
        protocol         = "$context.protocol"
        responseLength   = "$context.responseLength"
        latency          = "$context.responseLatency"
        errorMessage     = "$context.error.message"
        integrationError = "$context.integrationErrorMessage"
      })
    }
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-api-stage"
  })
}

# -----------------------------------------------------------------------------
# CloudWatch Log Group for API Gateway
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "api" {
  count = var.enable_logging ? 1 : 0

  name              = "/aws/apigateway/${var.project_name}-${var.environment}-api"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-api-logs"
  })
}

# -----------------------------------------------------------------------------
# Lambda Integration
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_integration" "lambda" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"

  integration_uri        = aws_lambda_function.lead_capture.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 10000 # 10 seconds
}

# -----------------------------------------------------------------------------
# Routes
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_route" "post_lead" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /lead"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# -----------------------------------------------------------------------------
# Custom Domain
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = "api.${var.root_domain}"

  domain_name_configuration {
    certificate_arn = var.acm_certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-api-domain"
  })
}

# API mapping
resource "aws_apigatewayv2_api_mapping" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  domain_name = aws_apigatewayv2_domain_name.api.id
  stage       = aws_apigatewayv2_stage.default.id
}

# -----------------------------------------------------------------------------
# Lambda Permission for API Gateway
# -----------------------------------------------------------------------------
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lead_capture.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
