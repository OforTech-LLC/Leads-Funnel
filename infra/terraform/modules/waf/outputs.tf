# =============================================================================
# WAF Module Outputs
# =============================================================================

output "web_acl_id" {
  description = "WAF Web ACL ID"
  value       = aws_wafv2_web_acl.main.id
}

output "web_acl_arn" {
  description = "WAF Web ACL ARN (use this for CloudFront association)"
  value       = aws_wafv2_web_acl.main.arn
}

output "web_acl_capacity" {
  description = "WAF Web ACL capacity units used"
  value       = aws_wafv2_web_acl.main.capacity
}

output "log_group_arn" {
  description = "CloudWatch Log Group ARN for WAF logs"
  value       = var.enable_logging ? aws_cloudwatch_log_group.waf[0].arn : null
}

output "log_group_name" {
  description = "CloudWatch Log Group name for WAF logs"
  value       = var.enable_logging ? aws_cloudwatch_log_group.waf[0].name : null
}
