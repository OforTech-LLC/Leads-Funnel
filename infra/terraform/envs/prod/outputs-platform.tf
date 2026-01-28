# =============================================================================
# Outputs - Prod Environment (Platform / 3-Sided Marketplace)
# =============================================================================
# All platform outputs use safe access via try() since resources are
# conditionally created with count = var.enable_platform ? 1 : 0
#
# Related files:
# - outputs.tf: Core outputs (URLs, CloudFront, DynamoDB, Lambda, etc.)
# =============================================================================

# -----------------------------------------------------------------------------
# Platform DynamoDB Tables
# -----------------------------------------------------------------------------
output "platform_orgs_table" {
  description = "Organizations DynamoDB table name"
  value       = try(module.dynamodb_orgs[0].table_name, null)
}

output "platform_users_table" {
  description = "Users DynamoDB table name"
  value       = try(module.dynamodb_users[0].table_name, null)
}

output "platform_memberships_table" {
  description = "Memberships DynamoDB table name"
  value       = try(module.dynamodb_memberships[0].table_name, null)
}

output "platform_assignment_rules_table" {
  description = "Assignment rules DynamoDB table name"
  value       = try(module.dynamodb_assignment_rules[0].table_name, null)
}

output "platform_unassigned_table" {
  description = "Unassigned leads DynamoDB table name"
  value       = try(module.dynamodb_unassigned[0].table_name, null)
}

output "platform_notifications_table" {
  description = "Notifications DynamoDB table name"
  value       = try(module.dynamodb_notifications[0].table_name, null)
}

output "platform_admin_audit_table" {
  description = "Admin audit DynamoDB table name"
  value       = try(module.dynamodb_admin_audit[0].table_name, null)
}

output "platform_exports_table" {
  description = "Exports DynamoDB table name"
  value       = try(module.dynamodb_exports[0].table_name, null)
}

# -----------------------------------------------------------------------------
# Platform SQS Queues
# -----------------------------------------------------------------------------
output "platform_assignment_queue_url" {
  description = "Assignment SQS queue URL"
  value       = try(module.assignment_queue[0].queue_url, null)
}

output "platform_notification_queue_url" {
  description = "Notification SQS queue URL"
  value       = try(module.notification_queue[0].queue_url, null)
}

# -----------------------------------------------------------------------------
# Platform Cognito
# -----------------------------------------------------------------------------
output "platform_admin_cognito_pool_id" {
  description = "Admin Cognito User Pool ID"
  value       = try(module.cognito_admin[0].pool_id, null)
}

output "platform_admin_cognito_client_id" {
  description = "Admin Cognito App Client ID"
  value       = try(module.cognito_admin[0].client_id, null)
}

output "platform_admin_cognito_domain" {
  description = "Admin Cognito hosted UI domain URL"
  value       = try(module.cognito_admin[0].domain_url, null)
}

output "platform_portal_cognito_pool_id" {
  description = "Portal Cognito User Pool ID"
  value       = try(module.cognito_portal[0].pool_id, null)
}

output "platform_portal_cognito_client_id" {
  description = "Portal Cognito App Client ID"
  value       = try(module.cognito_portal[0].client_id, null)
}

output "platform_portal_cognito_domain" {
  description = "Portal Cognito hosted UI domain URL"
  value       = try(module.cognito_portal[0].domain_url, null)
}

# -----------------------------------------------------------------------------
# Platform Worker Lambdas
# -----------------------------------------------------------------------------
output "platform_assignment_worker" {
  description = "Assignment worker Lambda function name"
  value       = try(module.assignment_worker[0].function_name, null)
}

output "platform_notification_worker" {
  description = "Notification worker Lambda function name"
  value       = try(module.notification_worker[0].function_name, null)
}

# -----------------------------------------------------------------------------
# Platform CloudFront Apps
# -----------------------------------------------------------------------------
output "platform_admin_app_distribution_id" {
  description = "Admin app CloudFront distribution ID"
  value       = try(module.admin_app[0].distribution_id, null)
}

output "platform_admin_app_bucket" {
  description = "Admin app S3 bucket name"
  value       = try(module.admin_app[0].bucket_name, null)
}

output "platform_portal_app_distribution_id" {
  description = "Portal app CloudFront distribution ID"
  value       = try(module.portal_app[0].distribution_id, null)
}

output "platform_portal_app_bucket" {
  description = "Portal app S3 bucket name"
  value       = try(module.portal_app[0].bucket_name, null)
}
