# =============================================================================
# Core Services - Dev Environment
# =============================================================================
# Secrets Manager, SSM, EventBridge, Lambda, API Gateway, WAF, Static Site,
# DNS, SES, Monitoring, Synthetics, CloudTrail, and Admin Console modules.
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
  enable_email_notifications = false
  enable_sms_notifications   = false
  enable_deduplication       = true
  enable_rate_limiting       = true
  enable_debug               = true # Enable debug in dev

  # Runtime config - dev uses api-dev subdomain
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

  log_retention_days = 7

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

  # Lambda configuration (dev optimized)
  lead_handler_zip_path             = var.lead_handler_zip_path
  health_handler_zip_path           = var.health_handler_zip_path
  lead_handler_memory_mb            = var.lambda_memory_mb
  lead_handler_reserved_concurrency = var.lambda_reserved_concurrency
  voice_functions_memory_mb         = 256
  voice_reserved_concurrency        = null

  enable_xray        = var.enable_xray
  log_retention_days = 7

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

  # CORS configuration
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

  # Logging
  enable_logging     = var.enable_api_logging
  log_retention_days = 7

  tags = local.common_tags
}

# =============================================================================
# WAF (Optional - disabled by default in dev)
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
  enable_logging      = false # Disable logging in dev

  tags = local.common_tags
}

# =============================================================================
# Static Site (CloudFront + S3)
# =============================================================================
module "static_site" {
  source = "../../modules/static_site"

  project_name = var.project_name
  environment  = var.environment

  # Dev uses only subdomain - prod owns root domain and www
  domain_aliases = [
    "${local.env_subdomain}.${var.root_domain}",
  ]

  acm_certificate_arn = module.acm.validated_certificate_arn
  waf_web_acl_arn     = local.waf_web_acl_arn

  # Cost optimization for dev
  price_class    = "PriceClass_100" # North America + Europe only
  enable_logging = var.enable_cloudfront_logging

  content_security_policy = var.content_security_policy

  # Basic authentication (password protection during development)
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

  # Dev only uses subdomain - prod owns root and www
  create_root_records   = false
  additional_subdomains = [local.env_subdomain]

  tags = local.common_tags
}

# =============================================================================
# SES (Optional - disabled by default)
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
# Monitoring (Optional - disabled by default in dev)
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

  # Alarm thresholds (relaxed for dev)
  lambda_error_rate_threshold = 5  # 5% error rate threshold
  lambda_duration_threshold   = 15 # 15 seconds
  api_error_rate_threshold    = 5  # 5% error rate threshold

  # Dashboard and advanced features
  create_dashboard        = false # No dashboard in dev
  create_composite_alarms = false

  tags = local.common_tags
}

# =============================================================================
# Synthetic Monitoring (Optional - disabled by default in dev)
# =============================================================================
module "synthetics" {
  count  = var.enable_synthetics ? 1 : 0
  source = "../../modules/synthetics"

  project_name = var.project_name
  environment  = var.environment

  # API Health Check Canary
  enable_api_canary   = true
  api_health_endpoint = "https://${local.api_subdomain}.${var.root_domain}/health"
  api_canary_schedule = "rate(1 hour)" # Hourly in dev to save ~$20/mo

  # Website Availability Canary
  enable_website_canary   = true
  website_url             = "https://${local.env_subdomain}.${var.root_domain}"
  website_canary_schedule = "rate(1 hour)" # Hourly in dev to save ~$20/mo

  # Alerting (safe access via locals)
  sns_topic_arn = local.monitoring_sns_topic_arn

  # Canary configuration
  enable_xray_tracing     = var.enable_xray
  artifact_retention_days = 7

  tags = local.common_tags
}

# =============================================================================
# CloudTrail (Optional - for AWS API audit logging)
# =============================================================================
# Can be enabled independently of admin console for security auditing
# =============================================================================
module "cloudtrail" {
  count  = var.enable_cloudtrail ? 1 : 0
  source = "../../modules/cloudtrail"

  project_name = var.project_name
  environment  = var.environment

  is_multi_region_trail     = false # Single region for dev to save costs
  enable_cloudwatch_logs    = true
  enable_access_logging     = true
  enable_s3_data_events     = false # Disabled in dev to save costs
  enable_lambda_data_events = false

  log_retention_days            = 90 # Shorter retention in dev
  cloudwatch_log_retention_days = 14

  tags = local.common_tags
}

# =============================================================================
# Admin Console (Optional - DISABLED by default)
# =============================================================================
# IMPORTANT: Admin console is feature-flagged and OFF by default.
# Must be explicitly enabled via enable_admin_console = true
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

  # Admin access control
  admin_allowed_emails = var.admin_allowed_emails
  admin_allowed_cidrs  = var.admin_allowed_cidrs

  # Cognito configuration
  cognito_domain_prefix      = var.admin_cognito_domain_prefix
  mfa_configuration          = "ON" # Require MFA for all admin users
  enable_localhost_callbacks = true # Allow localhost in dev

  admin_console_callback_urls = [
    "https://${local.env_subdomain}.${var.root_domain}/admin/callback",
  ]
  admin_console_logout_urls = [
    "https://${local.env_subdomain}.${var.root_domain}/admin",
  ]

  # Exports configuration
  exports_bucket_name      = var.admin_exports_bucket_name
  exports_retention_days   = 7 # Short retention in dev
  enable_bucket_versioning = false
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
  log_retention_days = 7
  xray_enabled       = var.enable_xray

  # API Gateway integration
  api_gateway_id            = module.api_gateway.api_id
  api_gateway_execution_arn = module.api_gateway.api_execution_arn

  # Data protection (relaxed for dev)
  audit_log_retention_days   = 30
  enable_audit_pitr          = false
  enable_deletion_protection = false

  tags = local.common_tags
}
