# =============================================================================
# Cognito User Pool Module Outputs
# =============================================================================

output "pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.this.id
}

output "pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.this.arn
}

output "pool_endpoint" {
  description = "Cognito User Pool endpoint"
  value       = aws_cognito_user_pool.this.endpoint
}

output "client_id" {
  description = "Cognito App Client ID"
  value       = aws_cognito_user_pool_client.web.id
}

output "domain" {
  description = "Cognito hosted UI domain prefix"
  value       = aws_cognito_user_pool_domain.this.domain
}

output "domain_url" {
  description = "Full Cognito Hosted UI URL"
  value       = "https://${aws_cognito_user_pool_domain.this.domain}.auth.${data.aws_region.current.name}.amazoncognito.com"
}

output "issuer_url" {
  description = "Cognito token issuer URL (for JWT validation)"
  value       = "https://cognito-idp.${data.aws_region.current.name}.amazonaws.com/${aws_cognito_user_pool.this.id}"
}

output "user_group_names" {
  description = "Map of user group names"
  value       = { for k, v in aws_cognito_user_group.groups : k => v.name }
}
