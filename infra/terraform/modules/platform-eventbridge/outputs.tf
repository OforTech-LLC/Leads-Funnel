# =============================================================================
# Platform EventBridge Module Outputs
# =============================================================================

output "lead_created_assignment_rule_arn" {
  description = "ARN of the lead.created -> assignment rule"
  value       = aws_cloudwatch_event_rule.lead_created_assignment.arn
}

output "lead_assigned_rule_arn" {
  description = "ARN of the lead.assigned rule"
  value       = aws_cloudwatch_event_rule.lead_assigned.arn
}

output "lead_unassigned_rule_arn" {
  description = "ARN of the lead.unassigned rule"
  value       = aws_cloudwatch_event_rule.lead_unassigned.arn
}
