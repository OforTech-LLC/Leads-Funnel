# =============================================================================
# Platform EventBridge Module - 3-Sided Platform Event Rules
# =============================================================================
# Extends the existing event bus with platform-specific rules:
# - lead.created -> assignment-queue (SQS target)
# - lead.assigned -> notification-queue (SQS target)
# - lead.unassigned -> notification-queue (SQS target)
#
# This module adds rules to an existing event bus created by the
# core eventbridge module. It does NOT create its own event bus.
# =============================================================================

# =============================================================================
# EventBridge Rules
# =============================================================================

# -----------------------------------------------------------------------------
# Rule: lead.created -> Assignment Queue
# -----------------------------------------------------------------------------
# When a new lead is created, route to the assignment queue
# so the AssignmentWorker can evaluate assignment rules.
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_rule" "lead_created_assignment" {
  name           = "${var.project_name}-${var.environment}-lead-created-assign"
  description    = "Route lead.created events to assignment queue"
  event_bus_name = var.event_bus_name

  event_pattern = jsonencode({
    source      = ["kanjona.leads"]
    detail-type = ["lead.created"]
  })

  tags = merge(var.tags, {
    Name     = "${var.project_name}-${var.environment}-lead-created-assign"
    RuleType = "assignment"
  })
}

resource "aws_cloudwatch_event_target" "lead_created_to_assignment" {
  rule           = aws_cloudwatch_event_rule.lead_created_assignment.name
  event_bus_name = var.event_bus_name
  target_id      = "sqs-assignment-queue"
  arn            = var.assignment_queue_arn
}

# -----------------------------------------------------------------------------
# Rule: lead.assigned -> Notification Queue
# -----------------------------------------------------------------------------
# When a lead is assigned to an org member, route to notification queue
# so the NotificationWorker can send email/SMS alerts.
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_rule" "lead_assigned" {
  name           = "${var.project_name}-${var.environment}-lead-assigned"
  description    = "Route lead.assigned events to notification queue"
  event_bus_name = var.event_bus_name

  event_pattern = jsonencode({
    source      = ["kanjona.leads"]
    detail-type = ["lead.assigned"]
  })

  tags = merge(var.tags, {
    Name     = "${var.project_name}-${var.environment}-lead-assigned"
    RuleType = "notification"
  })
}

resource "aws_cloudwatch_event_target" "lead_assigned_to_notification" {
  rule           = aws_cloudwatch_event_rule.lead_assigned.name
  event_bus_name = var.event_bus_name
  target_id      = "sqs-notification-queue"
  arn            = var.notification_queue_arn
}

# -----------------------------------------------------------------------------
# Rule: lead.unassigned -> Notification Queue
# -----------------------------------------------------------------------------
# When a lead cannot be assigned (no matching rules), route to
# notification queue so admins can be alerted about unassigned leads.
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_rule" "lead_unassigned" {
  name           = "${var.project_name}-${var.environment}-lead-unassigned"
  description    = "Route lead.unassigned events to notification queue"
  event_bus_name = var.event_bus_name

  event_pattern = jsonencode({
    source      = ["kanjona.leads"]
    detail-type = ["lead.unassigned"]
  })

  tags = merge(var.tags, {
    Name     = "${var.project_name}-${var.environment}-lead-unassigned"
    RuleType = "notification"
  })
}

resource "aws_cloudwatch_event_target" "lead_unassigned_to_notification" {
  rule           = aws_cloudwatch_event_rule.lead_unassigned.name
  event_bus_name = var.event_bus_name
  target_id      = "sqs-notification-queue"
  arn            = var.notification_queue_arn
}

# =============================================================================
# SQS Queue Policies - Allow EventBridge to send messages
# =============================================================================

# Policy for assignment queue
resource "aws_sqs_queue_policy" "assignment" {
  queue_url = var.assignment_queue_url

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEventBridgeLeadCreated"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = var.assignment_queue_arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_cloudwatch_event_rule.lead_created_assignment.arn
          }
        }
      }
    ]
  })
}

# Policy for notification queue
resource "aws_sqs_queue_policy" "notification" {
  queue_url = var.notification_queue_url

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEventBridgeLeadAssigned"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = var.notification_queue_arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = [
              aws_cloudwatch_event_rule.lead_assigned.arn,
              aws_cloudwatch_event_rule.lead_unassigned.arn,
            ]
          }
        }
      }
    ]
  })
}
