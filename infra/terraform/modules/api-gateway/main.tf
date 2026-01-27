# =============================================================================
# API Gateway Module - HTTP API with Routes
# =============================================================================
# This module creates:
# - API Gateway HTTP API (v2)
# - Routes for lead capture, health check, and voice webhooks
# - Lambda integrations
# - Custom domain configuration
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

  cors_configuration {
    allow_origins     = var.cors_allowed_origins
    allow_methods     = ["GET", "POST", "OPTIONS"]
    allow_headers     = ["Content-Type", "X-Requested-With", "X-Idempotency-Key", "X-Funnel-Id"]
    expose_headers    = ["X-Request-Id", "X-Lead-Id"]
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

  default_route_settings {
    throttling_burst_limit = var.throttling_burst_limit
    throttling_rate_limit  = var.throttling_rate_limit
  }

  dynamic "access_log_settings" {
    for_each = var.enable_logging ? [1] : []
    content {
      destination_arn = aws_cloudwatch_log_group.api[0].arn
      format = jsonencode({
        requestId          = "$context.requestId"
        ip                 = "$context.identity.sourceIp"
        requestTime        = "$context.requestTime"
        httpMethod         = "$context.httpMethod"
        routeKey           = "$context.routeKey"
        status             = "$context.status"
        protocol           = "$context.protocol"
        responseLength     = "$context.responseLength"
        latency            = "$context.responseLatency"
        errorMessage       = "$context.error.message"
        integrationError   = "$context.integrationErrorMessage"
        integrationLatency = "$context.integrationLatency"
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
  kms_key_id        = var.kms_key_arn

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-api-logs"
  })
}

# =============================================================================
# Lambda Integrations
# =============================================================================

# -----------------------------------------------------------------------------
# Lead Handler Integration
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_integration" "lead_handler" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"

  integration_uri        = var.lead_handler_invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000 # 30 seconds
}

# -----------------------------------------------------------------------------
# Health Handler Integration
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_integration" "health_handler" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"

  integration_uri        = var.health_handler_invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 10000 # 10 seconds
}

# -----------------------------------------------------------------------------
# Voice Start Integration (Optional)
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_integration" "voice_start" {
  count = var.enable_voice_agent && var.voice_start_invoke_arn != null ? 1 : 0

  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"

  integration_uri        = var.voice_start_invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

# -----------------------------------------------------------------------------
# Voice Webhook Integration (Optional)
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_integration" "voice_webhook" {
  count = var.enable_voice_agent && var.voice_webhook_invoke_arn != null ? 1 : 0

  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"

  integration_uri        = var.voice_webhook_invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

# =============================================================================
# Routes
# =============================================================================

# -----------------------------------------------------------------------------
# POST /lead - Lead Capture
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_route" "post_lead" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /lead"
  target    = "integrations/${aws_apigatewayv2_integration.lead_handler.id}"
}

# -----------------------------------------------------------------------------
# POST /lead/{funnelId} - Lead Capture with Funnel ID in Path
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_route" "post_lead_funnel" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /lead/{funnelId}"
  target    = "integrations/${aws_apigatewayv2_integration.lead_handler.id}"
}

# -----------------------------------------------------------------------------
# GET /health - Health Check
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_route" "get_health" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /health"
  target    = "integrations/${aws_apigatewayv2_integration.health_handler.id}"
}

# -----------------------------------------------------------------------------
# POST /voice/start - Initiate Voice Call (Optional)
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_route" "post_voice_start" {
  count = var.enable_voice_agent && var.voice_start_invoke_arn != null ? 1 : 0

  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /voice/start"
  target    = "integrations/${aws_apigatewayv2_integration.voice_start[0].id}"
}

# -----------------------------------------------------------------------------
# POST /voice/webhook - Twilio Voice Webhook (Optional)
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_route" "post_voice_webhook" {
  count = var.enable_voice_agent && var.voice_webhook_invoke_arn != null ? 1 : 0

  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /voice/webhook"
  target    = "integrations/${aws_apigatewayv2_integration.voice_webhook[0].id}"
}

# -----------------------------------------------------------------------------
# POST /voice/status - Twilio Status Callback (Optional)
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_route" "post_voice_status" {
  count = var.enable_voice_agent && var.voice_webhook_invoke_arn != null ? 1 : 0

  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /voice/status"
  target    = "integrations/${aws_apigatewayv2_integration.voice_webhook[0].id}"
}

# =============================================================================
# Lambda Permissions
# =============================================================================

resource "aws_lambda_permission" "lead_handler" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lead_handler_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "health_handler" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.health_handler_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "voice_start" {
  count = var.enable_voice_agent && var.voice_start_function_name != null ? 1 : 0

  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.voice_start_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "voice_webhook" {
  count = var.enable_voice_agent && var.voice_webhook_function_name != null ? 1 : 0

  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.voice_webhook_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# =============================================================================
# Custom Domain
# =============================================================================

resource "aws_apigatewayv2_domain_name" "api" {
  # Use environment-specific subdomain: api.kanjona.com for prod, api-dev.kanjona.com for dev
  domain_name = var.environment == "prod" ? "api.${var.root_domain}" : "api-${var.environment}.${var.root_domain}"

  domain_name_configuration {
    certificate_arn = var.acm_certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-api-domain"
  })
}

resource "aws_apigatewayv2_api_mapping" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  domain_name = aws_apigatewayv2_domain_name.api.id
  stage       = aws_apigatewayv2_stage.default.id
}
