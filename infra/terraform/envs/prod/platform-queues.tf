# =============================================================================
# Platform SQS Queues - Prod Environment (Assignment + Notification)
# =============================================================================
# Controlled by enable_platform feature flag.
# Production: Alarms enabled and connected to SNS.
# =============================================================================

# --- Assignment Queue ---
module "assignment_queue" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/sqs-queue"

  queue_name                 = "${local.prefix}-assignment-queue"
  visibility_timeout_seconds = 60
  max_receive_count          = 3

  enable_dlq_alarm = var.enable_alarms
  alarm_actions    = var.enable_alarms ? [local.monitoring_sns_topic_arn] : []

  tags = merge(local.common_tags, { Type = "platform-assignment-queue" })
}

# --- Notification Queue ---
module "notification_queue" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/sqs-queue"

  queue_name                 = "${local.prefix}-notification-queue"
  visibility_timeout_seconds = 60
  max_receive_count          = 3

  enable_dlq_alarm = var.enable_alarms
  alarm_actions    = var.enable_alarms ? [local.monitoring_sns_topic_arn] : []

  tags = merge(local.common_tags, { Type = "platform-notification-queue" })
}
