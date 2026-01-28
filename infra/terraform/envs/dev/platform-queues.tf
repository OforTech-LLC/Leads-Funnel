# =============================================================================
# Platform SQS Queues - Dev Environment (Assignment + Notification)
# =============================================================================
# Controlled by enable_platform feature flag.
# =============================================================================

# --- Assignment Queue ---
module "assignment_queue" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/sqs-queue"

  queue_name                 = "${local.prefix}-assignment-queue"
  visibility_timeout_seconds = 60
  max_receive_count          = 3

  enable_dlq_alarm = false # Disable alarm in dev

  tags = merge(local.common_tags, { Type = "platform-assignment-queue" })
}

# --- Notification Queue ---
module "notification_queue" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/sqs-queue"

  queue_name                 = "${local.prefix}-notification-queue"
  visibility_timeout_seconds = 60
  max_receive_count          = 3

  enable_dlq_alarm = false # Disable alarm in dev

  tags = merge(local.common_tags, { Type = "platform-notification-queue" })
}
