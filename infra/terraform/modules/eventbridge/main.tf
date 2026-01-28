# =============================================================================
# EventBridge Module - Event Bus & Rules
# =============================================================================
# This file contains:
# - Custom EventBridge event bus for leads
# - lead.created rule for new lead events
# - lead.qualified rule for qualified leads
# - voice.call.initiated rule (optional)
# - voice.call.completed rule (optional)
#
# Related files:
# - targets.tf: SQS queues, queue policies, EventBridge targets, logging
# =============================================================================

# -----------------------------------------------------------------------------
# EventBridge Event Bus
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_bus" "leads" {
  name = "${var.project_name}-${var.environment}-leads"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-leads"
  })
}

# =============================================================================
# EventBridge Rules
# =============================================================================

# -----------------------------------------------------------------------------
# Rule: lead.created
# -----------------------------------------------------------------------------
# Captures all new lead creation events
# Pattern: source=kanjona.leads, detail-type=lead.created
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_rule" "lead_created" {
  name           = "${var.project_name}-${var.environment}-lead-created"
  description    = "Capture lead.created events for all funnels"
  event_bus_name = aws_cloudwatch_event_bus.leads.name

  event_pattern = jsonencode({
    source      = ["kanjona.leads"]
    detail-type = ["lead.created"]
  })

  tags = merge(var.tags, {
    Name     = "${var.project_name}-${var.environment}-lead-created"
    RuleType = "lead-created"
  })
}

# -----------------------------------------------------------------------------
# Rule: lead.qualified
# -----------------------------------------------------------------------------
# Captures leads that pass qualification criteria
# Pattern: source=kanjona.leads, detail-type=lead.qualified
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_rule" "lead_qualified" {
  name           = "${var.project_name}-${var.environment}-lead-qualified"
  description    = "Capture lead.qualified events for follow-up"
  event_bus_name = aws_cloudwatch_event_bus.leads.name

  event_pattern = jsonencode({
    source      = ["kanjona.leads"]
    detail-type = ["lead.qualified"]
  })

  tags = merge(var.tags, {
    Name     = "${var.project_name}-${var.environment}-lead-qualified"
    RuleType = "lead-qualified"
  })
}

# -----------------------------------------------------------------------------
# Rule: voice.call.initiated (Optional)
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_rule" "voice_call_initiated" {
  count = var.enable_voice_agent ? 1 : 0

  name           = "${var.project_name}-${var.environment}-voice-call-initiated"
  description    = "Capture voice.call.initiated events"
  event_bus_name = aws_cloudwatch_event_bus.leads.name

  event_pattern = jsonencode({
    source      = ["kanjona.voice"]
    detail-type = ["voice.call.initiated"]
  })

  tags = merge(var.tags, {
    Name     = "${var.project_name}-${var.environment}-voice-call-initiated"
    RuleType = "voice-call"
  })
}

# -----------------------------------------------------------------------------
# Rule: voice.call.completed (Optional)
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_event_rule" "voice_call_completed" {
  count = var.enable_voice_agent ? 1 : 0

  name           = "${var.project_name}-${var.environment}-voice-call-completed"
  description    = "Capture voice.call.completed events"
  event_bus_name = aws_cloudwatch_event_bus.leads.name

  event_pattern = jsonencode({
    source      = ["kanjona.voice"]
    detail-type = ["voice.call.completed"]
  })

  tags = merge(var.tags, {
    Name     = "${var.project_name}-${var.environment}-voice-call-completed"
    RuleType = "voice-call"
  })
}
