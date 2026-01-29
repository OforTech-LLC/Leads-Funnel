# =============================================================================
# Admin API Gateway Routes - JWT Authorizer + Integration + Routes
# =============================================================================
# All admin routes are protected by a JWT authorizer backed by Cognito.
# =============================================================================

# =====================================================
# API Gateway JWT Authorizer (Admin Routes)
# =====================================================

resource "aws_apigatewayv2_authorizer" "admin_jwt" {
  api_id           = var.api_gateway_id
  authorizer_type  = "JWT"
  name             = "${var.project_name}-${var.environment}-admin-jwt"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    audience = [var.admin_cognito_client_id != "" ? var.admin_cognito_client_id : var.cognito_client_id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${var.admin_cognito_pool_id != "" ? var.admin_cognito_pool_id : var.cognito_user_pool_id}"
  }
}

# =====================================================
# API Gateway Integration
# =====================================================

resource "aws_apigatewayv2_integration" "admin" {
  api_id                 = var.api_gateway_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.admin.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# =====================================================
# Admin Routes - all protected by JWT authorizer
# =====================================================

resource "aws_apigatewayv2_route" "admin_any" {
  api_id             = var.api_gateway_id
  route_key          = "ANY /admin"
  target             = "integrations/${aws_apigatewayv2_integration.admin.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.admin_jwt.id
}

resource "aws_apigatewayv2_route" "admin_any_proxy" {
  api_id             = var.api_gateway_id
  route_key          = "ANY /admin/{proxy+}"
  target             = "integrations/${aws_apigatewayv2_integration.admin.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.admin_jwt.id
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "admin_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.admin.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*"
}
