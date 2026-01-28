/**
 * Admin Cognito Module Outputs
 */

output "user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.admin.id
}

output "user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.admin.arn
}

output "user_pool_endpoint" {
  description = "Cognito User Pool endpoint"
  value       = aws_cognito_user_pool.admin.endpoint
}

output "user_pool_domain" {
  description = "Cognito User Pool domain"
  value       = aws_cognito_user_pool_domain.admin.domain
}

output "user_pool_domain_url" {
  description = "Full Cognito Hosted UI URL"
  value       = "https://${aws_cognito_user_pool_domain.admin.domain}.auth.${data.aws_region.current.name}.amazoncognito.com"
}

output "web_client_id" {
  description = "Cognito Web App Client ID"
  value       = aws_cognito_user_pool_client.admin_web.id
}

output "admin_group_name" {
  description = "Admin group name"
  value       = aws_cognito_user_group.admin.name
}

output "viewer_group_name" {
  description = "Viewer group name"
  value       = aws_cognito_user_group.viewer.name
}
