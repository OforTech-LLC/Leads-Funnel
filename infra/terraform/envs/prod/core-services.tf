# =============================================================================
# Core Services - Prod Environment
# =============================================================================
# Secrets Manager, SSM, EventBridge, Lambda, API Gateway, WAF, Static Site,
# DNS, SES, Monitoring, Synthetics, CloudTrail, and Admin Console modules.
# Production: Stricter thresholds, longer retention, dashboards enabled.
# =============================================================================

# =============================================================================
# Secrets Manager (Twilio, ElevenLabs, etc.)
# =============================================================================
module "secrets" {
  source = "../../modules/secrets"

  project_name = var.project_name
  environment  = var.environment

  tags = local.common_tags
}

# =============================================================================
# SSM Parameter Store (Feature flags, funnels config)
# =============================================================================
module "ssm" {
  source = "../../modules/ssm"

  project_name    = var.project_name
  environment     = var.environment
  funnel_ids      = local.funnel_ids
  funnel_metadata = local.funnel_metadata

  # Feature flags
  enable_voice_agent         = var.enable_voice_agent
  enable_twilio              = var.enable_twilio
  enable_elevenlabs          = var.enable_elevenlabs
  enable_waf                 = var.enable_waf
  enable_pitr                = var.enable_pitr
  enable_email_notifications = var.enable_ses
  enable_sms_notifications   = var.enable_twilio
  enable_deduplication       = true
  enable_rate_limiting       = true
  enable_debug               = false # Disable debug in prod

  # Runtime config - prod uses api subdomain
  api_base_url                 = "https://${local.api_subdomain}.${var.root_domain}"
  quality_quarantine_threshold = var.quality_quarantine_threshold

  tags = local.common_tags
}

# =============================================================================
# Avatars Bucket (Portal Profile Images)
# =============================================================================
module "avatars" {
  source = "../../modules/avatars"

  project_name    = var.project_name
  environment     = var.environment
  allowed_origins = local.portal_cors_origins

  tags = local.common_tags
}

# =============================================================================
# EventBridge (Leads event bus, rules)
# =============================================================================
module "eventbridge" {
  source = "../../modules/eventbridge"

  project_name       = var.project_name
  environment        = var.environment
  enable_sqs         = var.enable_sqs
  enable_voice_agent = var.enable_voice_agent
  enable_logging     = var.enable_api_logging

  # Connect voice-start Lambda as EventBridge target if enabled
  voice_start_lambda_arn    = var.enable_voice_agent ? module.lambda.voice_start_function_arn : null
  voice_start_function_name = var.enable_voice_agent ? module.lambda.voice_start_function_name : null

  log_retention_days = 30 # Longer retention in prod

  tags = local.common_tags
}

# =============================================================================
# Lambda Functions (lead-handler, health-handler, voice-start, voice-webhook)
# =============================================================================
module "lambda" {
  source = "../../modules/lambda"

  project_name       = var.project_name
  environment        = var.environment
  root_domain        = var.root_domain
  funnel_ids         = local.funnel_ids
  enable_voice_agent = var.enable_voice_agent

  # DynamoDB integration
  all_funnel_table_arns     = module.dynamodb.all_funnel_table_arns
  all_funnel_gsi_arns       = module.dynamodb.all_funnel_gsi_arns
  rate_limits_table_name    = module.dynamodb.rate_limits_table_name
  rate_limits_table_arn     = module.dynamodb.rate_limits_table_arn
  idempotency_table_name    = module.dynamodb.idempotency_table_name
  idempotency_table_arn     = module.dynamodb.idempotency_table_arn
  platform_leads_table_name = local.platform_leads_table_name
  platform_leads_table_arn  = local.platform_leads_table_arn
  platform_leads_gsi_arns   = local.platform_leads_gsi_arns

  # EventBridge integration
  event_bus_name = module.eventbridge.event_bus_name
  event_bus_arn  = module.eventbridge.event_bus_arn

  # Secrets integration
  twilio_secret_arn       = module.secrets.twilio_secret_arn
  elevenlabs_secret_arn   = module.secrets.elevenlabs_secret_arn
  ip_hash_salt_secret_arn = module.secrets.ip_hash_salt_secret_arn
  webhook_secret_arn      = module.secrets.webhook_secret_arn

  # SSM integration
  ssm_parameter_arns = concat(module.ssm.all_parameter_arns, local.platform_ssm_parameter_arns)

  # CORS allowlist for Lambda responses
  allowed_origins = local.cors_origins

  # Avatar uploads
  avatars_bucket_name    = module.avatars.bucket_name
  avatars_bucket_arn     = module.avatars.bucket_arn
  avatar_public_base_url = "https://${module.avatars.bucket_regional_domain_name}"

  # Cognito (admin + portal)
  admin_cognito_client_id  = local.platform_admin_cognito_client_id
  admin_cognito_issuer     = local.platform_admin_cognito_issuer
  portal_cognito_client_id = local.platform_portal_cognito_client_id
  portal_cognito_issuer    = local.platform_portal_cognito_issuer
  portal_cognito_pool_id   = local.platform_portal_cognito_pool_id
  allowed_emails_ssm_path  = "/${var.project_name}/${var.environment}/admin/allowed_emails"

  # Admin/portal exports + audit
  exports_bucket_name = var.admin_exports_bucket_name
  exports_table_name  = local.platform_exports_table_name
  audit_table_name    = local.platform_admin_audit_table_name

  # Lambda configuration (production optimized)
  lead_handler_zip_path             = var.lead_handler_zip_path
  health_handler_zip_path           = var.health_handler_zip_path
  lead_handler_memory_mb            = var.lambda_memory_mb
  lead_handler_reserved_concurrency = var.lambda_reserved_concurrency
  voice_functions_memory_mb         = 512
  voice_reserved_concurrency        = 50

  enable_xray        = var.enable_xray
  log_retention_days = 30

  tags = local.common_tags
}

# =============================================================================
# API Gateway (HTTP API with routes)
# =============================================================================
module "api_gateway" {
  source = "../../modules/api-gateway"

  project_name        = var.project_name
  environment         = var.environment
  root_domain         = var.root_domain
  acm_certificate_arn = module.acm.validated_certificate_arn

  # CORS configuration (production - strict)
  cors_allowed_origins = local.cors_origins

  # Lambda integrations
  lead_handler_function_name = module.lambda.lead_handler_function_name
  lead_handler_invoke_arn    = module.lambda.lead_handler_invoke_arn

  health_handler_function_name = module.lambda.health_handler_function_name
  health_handler_invoke_arn    = module.lambda.health_handler_invoke_arn

  # Voice agent (optional)
  enable_voice_agent          = var.enable_voice_agent
  voice_start_function_name   = module.lambda.voice_start_function_name
  voice_start_invoke_arn      = module.lambda.voice_start_invoke_arn
  voice_webhook_function_name = module.lambda.voice_webhook_function_name
  voice_webhook_invoke_arn    = module.lambda.voice_webhook_invoke_arn

  # Production throttling
  throttling_rate_limit  = 100
  throttling_burst_limit = 200

  # Logging
  enable_logging     = var.enable_api_logging
  log_retention_days = 30

  tags = local.common_tags
}

# =============================================================================
# WAF (Enabled by default in prod)
# =============================================================================
module "waf" {
  count  = var.enable_waf ? 1 : 0
  source = "../../modules/waf"

  providers = {
    aws = aws.us_east_1
  }

  project_name = var.project_name
  environment  = var.environment

  rate_limit_requests = 500
  enable_logging      = true
  log_retention_days  = 30

  tags = local.common_tags
}

# =============================================================================
# Static Site (CloudFront + S3)
# =============================================================================
module "static_site" {
  source = "../../modules/static_site"

  project_name = var.project_name
  environment  = var.environment

  domain_aliases = [
    var.root_domain,
    "www.${var.root_domain}",
  ]

  acm_certificate_arn = module.acm.validated_certificate_arn
  waf_web_acl_arn     = local.waf_web_acl_arn

  # Production settings
  price_class    = "PriceClass_200" # Includes Asia, Middle East, Africa
  enable_logging = var.enable_cloudfront_logging

  content_security_policy = var.content_security_policy

  # Basic authentication
  enable_basic_auth   = var.enable_basic_auth
  basic_auth_username = var.basic_auth_username
  basic_auth_password = var.basic_auth_password

  tags = local.common_tags
}

# =============================================================================
# DNS (Route 53)
# =============================================================================
module "dns" {
  source = "../../modules/dns"

  project_name = var.project_name
  environment  = var.environment
  root_domain  = var.root_domain

  cloudfront_domain_name    = module.static_site.domain_name
  cloudfront_hosted_zone_id = module.static_site.hosted_zone_id

  api_gateway_domain_name    = module.api_gateway.custom_domain_name
  api_gateway_hosted_zone_id = module.api_gateway.custom_domain_zone_id

  acm_validation_records = module.acm.validation_records

  tags = local.common_tags
}

# =============================================================================
# SES (Optional)
# =============================================================================
module "ses" {
  count  = var.enable_ses ? 1 : 0
  source = "../../modules/ses"

  project_name = var.project_name
  environment  = var.environment
  root_domain  = var.root_domain

  route53_zone_id    = module.dns.zone_id
  notification_email = var.notification_email
  enable_mail_from   = true

  tags = local.common_tags
}

# =============================================================================
# Monitoring (Enabled by default in prod)
# =============================================================================
module "monitoring" {
  count  = var.enable_alarms ? 1 : 0
  source = "../../modules/monitoring"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  alert_email = var.alert_email

  # Resource references
  lambda_function_name = module.lambda.lead_handler_function_name
  api_gateway_id       = module.api_gateway.api_id
  dynamodb_table_name  = module.dynamodb.funnel_table_names["real-estate"]
  sqs_queue_name       = var.enable_sqs ? module.eventbridge.queue_name : ""
  sqs_dlq_name         = var.enable_sqs ? module.eventbridge.dlq_name : ""

  # Alarm thresholds (strict for prod)
  lambda_error_rate_threshold = 1  # 1% error rate threshold
  lambda_duration_threshold   = 10 # 10 seconds
  api_error_rate_threshold    = 1  # 1% error rate threshold

  # Dashboard and advanced features
  create_dashboard        = true # Create dashboard in prod
  create_composite_alarms = true # Enable composite alarms in prod
  enable_sns_encryption   = true # Encrypt SNS in prod

  tags = local.common_tags
}

# =============================================================================
# Synthetic Monitoring (Enabled by default in prod)
# =============================================================================
module "synthetics" {
  count  = var.enable_synthetics ? 1 : 0
  source = "../../modules/synthetics"

  project_name = var.project_name
  environment  = var.environment

  # API Health Check Canary
  enable_api_canary   = true
  api_health_endpoint = "https://${local.api_subdomain}.${var.root_domain}/health"
  api_canary_schedule = "rate(5 minutes)" # More frequent in prod

  # Website Availability Canary
  enable_website_canary   = true
  website_url             = "https://${var.root_domain}"
  website_canary_schedule = "rate(5 minutes)" # More frequent in prod

  # Alerting (safe access via locals)
  sns_topic_arn = local.monitoring_sns_topic_arn

  # Canary configuration
  enable_xray_tracing     = var.enable_xray
  artifact_retention_days = 30 # Longer retention in prod

  tags = local.common_tags
}

# =============================================================================
# CloudTrail (Recommended for production - AWS API audit logging)
# =============================================================================
module "cloudtrail" {
  count  = var.enable_cloudtrail ? 1 : 0
  source = "../../modules/cloudtrail"

  project_name = var.project_name
  environment  = var.environment

  is_multi_region_trail     = true  # Multi-region for comprehensive coverage
  enable_cloudwatch_logs    = true  # Real-time monitoring
  enable_access_logging     = true  # S3 access logging for the trail bucket
  enable_s3_data_events     = false # Can be enabled for compliance (increases costs)
  enable_lambda_data_events = false # Can be enabled for compliance (increases costs)

  log_retention_days            = 365 # 1 year retention for compliance
  cloudwatch_log_retention_days = 90

  tags = local.common_tags
}

# =============================================================================
# Admin Console (Optional - DISABLED by default)
# =============================================================================
module "admin" {
  count  = var.enable_admin_console ? 1 : 0
  source = "../../modules/admin"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  # Feature flags
  enable_admin_console      = var.enable_admin_console
  enable_admin_ip_allowlist = var.enable_admin_ip_allowlist
  enable_cloudtrail         = false # Use standalone cloudtrail module instead

  # Admin access control (stricter in prod)
  admin_allowed_emails = var.admin_allowed_emails
  admin_allowed_cidrs  = var.admin_allowed_cidrs

  # Cognito configuration
  cognito_domain_prefix              = var.admin_cognito_domain_prefix
  mfa_configuration                  = "ON"  # Always require MFA in production
  enable_localhost_callbacks         = false # NO localhost in production
  use_existing_cognito               = var.enable_platform
  existing_cognito_user_pool_id      = local.platform_admin_cognito_pool_id
  existing_cognito_user_pool_arn     = local.platform_admin_cognito_pool_arn
  existing_cognito_client_id         = local.platform_admin_cognito_client_id
  existing_cognito_domain            = local.platform_admin_cognito_domain
  existing_cognito_admin_group_name  = "SuperAdmin"
  existing_cognito_viewer_group_name = "OrgViewer"

  # Production callback URLs only - NO localhost
  admin_console_callback_urls = [
    "https://${var.root_domain}/admin/callback",
    "https://www.${var.root_domain}/admin/callback",
  ]
  admin_console_logout_urls = [
    "https://${var.root_domain}/admin",
    "https://www.${var.root_domain}/admin",
  ]

  # Exports configuration (longer retention in prod)
  exports_bucket_name      = var.admin_exports_bucket_name
  exports_retention_days   = 30
  enable_bucket_versioning = true
  enable_access_logging    = true

  # Platform table names for admin API
  platform_orgs_table_name             = local.platform_orgs_table_name
  platform_users_table_name            = local.platform_users_table_name
  platform_memberships_table_name      = local.platform_memberships_table_name
  platform_assignment_rules_table_name = local.platform_assignment_rules_table_name
  platform_leads_table_name            = local.platform_leads_table_name
  platform_notifications_table_name    = local.platform_notifications_table_name
  platform_unassigned_table_name       = local.platform_unassigned_table_name

  # Lambda configuration
  lambda_zip_path    = var.admin_lambda_zip_path
  lambda_zip_hash    = var.admin_lambda_zip_hash != "" ? var.admin_lambda_zip_hash : filebase64sha256(var.admin_lambda_zip_path)
  log_retention_days = 30
  xray_enabled       = var.enable_xray

  # API Gateway integration
  api_gateway_id            = module.api_gateway.api_id
  api_gateway_execution_arn = module.api_gateway.api_execution_arn

  # Production data protection
  audit_log_retention_days   = 365 # 1 year retention for compliance
  enable_audit_pitr          = true
  enable_deletion_protection = true

  tags = local.common_tags
}
