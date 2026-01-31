# =============================================================================
# Platform Worker Lambdas + EventBridge + SSM - Prod Environment
# =============================================================================
# Assignment worker, notification worker, pre-token generation triggers,
# platform EventBridge rules, and platform SSM parameters.
# Controlled by enable_platform feature flag.
# Production: Higher memory, reserved concurrency, longer retention.
# =============================================================================

# --- Assignment Worker ---
module "assignment_worker" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/lambda-worker"

  depends_on = [
    module.dynamodb_orgs,
    module.dynamodb_users,
    module.dynamodb_memberships,
    module.dynamodb_assignment_rules,
    module.dynamodb_leads,
    module.dynamodb_unassigned,
    module.assignment_queue,
    module.notification_queue,
  ]

  function_name        = "${local.prefix}-assignment-worker"
  description          = "Processes lead assignment based on rules"
  zip_path             = var.assignment_worker_zip_path
  memory_mb            = 512
  timeout_seconds      = 60
  reserved_concurrency = 50

  enable_sqs_trigger = true
  sqs_queue_arn      = local.platform_assignment_queue_arn
  sqs_batch_size     = 10

  dynamodb_table_arns = compact([
    local.platform_orgs_table_arn,
    local.platform_users_table_arn,
    local.platform_memberships_table_arn,
    local.platform_assignment_rules_table_arn,
    local.platform_leads_table_arn,
    local.platform_unassigned_table_arn,
  ])

  ssm_parameter_arns = concat(
    module.ssm.all_parameter_arns,
    local.platform_ssm_parameter_arns,
  )

  event_bus_arn = module.eventbridge.event_bus_arn

  environment_variables = {
    ENV                       = var.environment
    ENVIRONMENT               = var.environment
    PROJECT_NAME              = var.project_name
    LOG_LEVEL                 = "INFO"
    DDB_TABLE_NAME            = local.platform_leads_table_name
    PLATFORM_LEADS_TABLE_NAME = local.platform_leads_table_name
    ORGS_TABLE_NAME           = local.platform_orgs_table_name
    USERS_TABLE_NAME          = local.platform_users_table_name
    MEMBERSHIPS_TABLE_NAME    = local.platform_memberships_table_name
    ASSIGNMENT_RULES_TABLE    = local.platform_assignment_rules_table_name
    UNASSIGNED_TABLE_NAME     = local.platform_unassigned_table_name
    EVENT_BUS_NAME            = module.eventbridge.event_bus_name
    NOTIFICATION_QUEUE_URL    = local.platform_notification_queue_url
    FEATURE_FLAG_SSM_PATH     = local.platform_ssm_prefix != "" ? "${local.platform_ssm_prefix}/config/worker-feature-flags" : ""
    ASSIGNMENT_RULES_SSM_PATH = local.platform_ssm_prefix != "" ? "${local.platform_ssm_prefix}/config/assignment-rules" : ""
  }

  sqs_send_queue_arns = compact([local.platform_notification_queue_arn])

  enable_xray        = var.enable_xray
  log_retention_days = 30

  tags = merge(local.common_tags, { Type = "platform-assignment-worker" })
}

# --- Notification Worker ---
module "notification_worker" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/lambda-worker"

  depends_on = [
    module.dynamodb_users,
    module.dynamodb_memberships,
    module.dynamodb_notifications,
    module.dynamodb_leads,
    module.notification_queue,
  ]

  function_name        = "${local.prefix}-notification-worker"
  description          = "Sends email/SMS notifications for lead events"
  zip_path             = var.notification_worker_zip_path
  memory_mb            = 512
  timeout_seconds      = 60
  reserved_concurrency = 50

  enable_sqs_trigger = true
  sqs_queue_arn      = local.platform_notification_queue_arn
  sqs_batch_size     = 10

  dynamodb_table_arns = compact([
    local.platform_users_table_arn,
    local.platform_memberships_table_arn,
    local.platform_notifications_table_arn,
    local.platform_leads_table_arn,
  ])

  ssm_parameter_arns = concat(
    module.ssm.all_parameter_arns,
    local.platform_ssm_parameter_arns,
  )

  enable_ses   = var.enable_ses
  enable_sns   = var.enable_twilio # SMS via SNS
  secrets_arns = [module.secrets.twilio_secret_arn]

  environment_variables = {
    ENV                          = var.environment
    ENVIRONMENT                  = var.environment
    PROJECT_NAME                 = var.project_name
    LOG_LEVEL                    = "INFO"
    DDB_TABLE_NAME               = local.platform_leads_table_name
    PLATFORM_LEADS_TABLE_NAME    = local.platform_leads_table_name
    ORGS_TABLE_NAME              = local.platform_orgs_table_name
    USERS_TABLE_NAME             = local.platform_users_table_name
    MEMBERSHIPS_TABLE_NAME       = local.platform_memberships_table_name
    NOTIFICATIONS_TABLE          = local.platform_notifications_table_name
    FEATURE_FLAG_SSM_PATH        = local.platform_ssm_prefix != "" ? "${local.platform_ssm_prefix}/config/worker-feature-flags" : ""
    INTERNAL_RECIPIENTS_SSM_PATH = local.platform_ssm_prefix != "" ? "${local.platform_ssm_prefix}/config/internal-recipients" : ""
    TWILIO_SECRET_ARN            = module.secrets.twilio_secret_arn
  }

  enable_xray        = var.enable_xray
  log_retention_days = 30

  tags = merge(local.common_tags, { Type = "platform-notification-worker" })
}

# --- Pre-Token Generation (Admin) ---
# NOTE: Pre-token lambdas only receive core SSM params (module.ssm), NOT
# platform SSM params (module.platform_ssm). Adding platform_ssm_parameter_arns
# here would create a circular dependency:
#   pre_token_admin -> platform_ssm -> cognito_admin -> pre_token_admin
# These lambdas only need feature flags and basic config to enrich tokens.
module "pre_token_admin" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/lambda-worker"

  depends_on = [
    module.dynamodb_users,
    module.dynamodb_memberships,
  ]

  function_name   = "${local.prefix}-pre-token-admin"
  description     = "Pre-token generation trigger for admin Cognito pool"
  zip_path        = var.pre_token_admin_zip_path
  memory_mb       = 128
  timeout_seconds = 10

  dynamodb_table_arns = compact([
    local.platform_users_table_arn,
    local.platform_memberships_table_arn,
  ])

  ssm_parameter_arns = module.ssm.all_parameter_arns

  environment_variables = {
    ENVIRONMENT              = var.environment
    PROJECT_NAME             = var.project_name
    LOG_LEVEL                = "INFO"
    USERS_TABLE_NAME         = local.platform_users_table_name
    MEMBERSHIPS_TABLE_NAME   = local.platform_memberships_table_name
    ALLOWED_EMAILS_SSM_PATH  = "/${var.project_name}/${var.environment}/admin/allowed_emails"
  }

  enable_xray        = var.enable_xray
  log_retention_days = 30

  tags = merge(local.common_tags, { Type = "platform-pre-token-admin" })
}

# --- Pre-Token Generation (Portal) ---
# NOTE: Pre-token lambdas only receive core SSM params (module.ssm), NOT
# platform SSM params (module.platform_ssm). Adding platform_ssm_parameter_arns
# here would create a circular dependency:
#   pre_token_portal -> platform_ssm -> cognito_portal -> pre_token_portal
# These lambdas only need feature flags and basic config to enrich tokens.
module "pre_token_portal" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/lambda-worker"

  depends_on = [
    module.dynamodb_users,
    module.dynamodb_memberships,
    module.dynamodb_orgs,
  ]

  function_name   = "${local.prefix}-pre-token-portal"
  description     = "Pre-token generation trigger for portal Cognito pool"
  zip_path        = var.pre_token_portal_zip_path
  memory_mb       = 128
  timeout_seconds = 10

  dynamodb_table_arns = compact([
    local.platform_users_table_arn,
    local.platform_memberships_table_arn,
    local.platform_orgs_table_arn,
  ])

  ssm_parameter_arns = module.ssm.all_parameter_arns

  environment_variables = {
    ENVIRONMENT            = var.environment
    PROJECT_NAME           = var.project_name
    LOG_LEVEL              = "INFO"
    USERS_TABLE_NAME       = local.platform_users_table_name
    MEMBERSHIPS_TABLE_NAME = local.platform_memberships_table_name
    ORGS_TABLE_NAME        = local.platform_orgs_table_name
  }

  enable_xray        = var.enable_xray
  log_retention_days = 30

  tags = merge(local.common_tags, { Type = "platform-pre-token-portal" })
}

# =============================================================================
# Platform EventBridge Rules
# =============================================================================
module "platform_eventbridge" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/platform-eventbridge"

  depends_on = [
    module.assignment_queue,
    module.notification_queue,
  ]

  project_name = var.project_name
  environment  = var.environment

  event_bus_name = module.eventbridge.event_bus_name
  event_bus_arn  = module.eventbridge.event_bus_arn

  assignment_queue_arn = local.platform_assignment_queue_arn
  assignment_queue_url = local.platform_assignment_queue_url

  notification_queue_arn = local.platform_notification_queue_arn
  notification_queue_url = local.platform_notification_queue_url

  tags = local.common_tags
}

# =============================================================================
# Platform SSM Parameters
# =============================================================================
module "platform_ssm" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/platform-ssm"

  depends_on = [
    module.dynamodb_orgs,
    module.dynamodb_users,
    module.dynamodb_memberships,
    module.dynamodb_assignment_rules,
    module.dynamodb_leads,
    module.dynamodb_unassigned,
    module.dynamodb_notifications,
    module.assignment_queue,
    module.notification_queue,
    module.cognito_admin,
    module.cognito_portal,
  ]

  project_name = var.project_name
  environment  = var.environment

  # Feature flags (explicitly enabled)
  enable_assignment_engine   = true
  enable_portal              = true
  enable_multi_tenant        = true
  enable_auto_assignment     = true
  enable_lead_notifications  = true
  enable_org_management      = true
  enable_exports             = true
  enable_audit_logging       = true
  enable_email_notifications = true
  enable_sms_notifications   = false
  enable_twilio_sms          = false
  enable_sns_sms             = false

  assignment_rules_json    = "[]"
  internal_recipients_json = "[]"

  # CORS origins (production only, via locals)
  admin_cors_origins  = local.admin_cors_origins
  portal_cors_origins = local.portal_cors_origins

  # Table name references (safe access via locals)
  orgs_table_name             = local.platform_orgs_table_name
  users_table_name            = local.platform_users_table_name
  memberships_table_name      = local.platform_memberships_table_name
  assignment_rules_table_name = local.platform_assignment_rules_table_name
  unassigned_table_name       = local.platform_unassigned_table_name
  notifications_table_name    = local.platform_notifications_table_name

  # Queue references (safe access via locals)
  enable_queue_params    = true
  assignment_queue_url   = local.platform_assignment_queue_url
  notification_queue_url = local.platform_notification_queue_url

  # Cognito references (safe access via locals)
  enable_cognito_params    = true
  admin_cognito_pool_id    = local.platform_admin_cognito_pool_id
  admin_cognito_client_id  = local.platform_admin_cognito_client_id
  portal_cognito_pool_id   = local.platform_portal_cognito_pool_id
  portal_cognito_client_id = local.platform_portal_cognito_client_id

  tags = local.common_tags
}
