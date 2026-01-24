# =============================================================================
# Main Configuration - Dev Environment
# =============================================================================
# This file orchestrates all modules for the dev environment.
# Feature flags control which optional components are created.
# =============================================================================

# -----------------------------------------------------------------------------
# Local Values
# -----------------------------------------------------------------------------
locals {
  # Common tags for all resources
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  # CORS origins including the domain and any additional origins
  cors_origins = concat(
    [
      "https://${var.root_domain}",
      "https://www.${var.root_domain}",
    ],
    var.additional_cors_origins
  )
}

# =============================================================================
# ACM Certificate (Must be in us-east-1 for CloudFront)
# =============================================================================
module "acm" {
  source = "../../modules/acm"

  providers = {
    aws = aws.us_east_1
  }

  project_name = var.project_name
  environment  = var.environment
  root_domain  = var.root_domain

  tags = local.common_tags
}

# =============================================================================
# DynamoDB Table
# =============================================================================
module "dynamodb" {
  source = "../../modules/dynamodb"

  project_name = var.project_name
  environment  = var.environment

  enable_pitr                = var.enable_pitr
  enable_deletion_protection = false # Allow deletion in dev

  tags = local.common_tags
}

# =============================================================================
# EventBridge + SQS (Eventing)
# =============================================================================
module "eventing" {
  source = "../../modules/eventing"

  project_name = var.project_name
  environment  = var.environment
  enable_sqs   = var.enable_sqs

  tags = local.common_tags
}

# =============================================================================
# API Gateway + Lambda
# =============================================================================
module "api" {
  source = "../../modules/api"

  project_name = var.project_name
  environment  = var.environment
  root_domain  = var.root_domain

  acm_certificate_arn = module.acm.validated_certificate_arn

  # CORS configuration
  cors_allowed_origins = local.cors_origins

  # DynamoDB integration
  dynamodb_table_name = module.dynamodb.table_name
  dynamodb_table_arn  = module.dynamodb.table_arn

  # EventBridge integration
  event_bus_name = module.eventing.event_bus_name
  event_bus_arn  = module.eventing.event_bus_arn

  # Lambda configuration (dev optimized)
  lambda_memory_mb            = var.lambda_memory_mb
  lambda_reserved_concurrency = var.lambda_reserved_concurrency
  enable_xray                 = var.enable_xray
  enable_logging              = var.enable_api_logging
  log_retention_days          = 7 # Short retention in dev

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

  domain_aliases = [
    var.root_domain,
    "www.${var.root_domain}",
  ]

  acm_certificate_arn = module.acm.validated_certificate_arn
  waf_web_acl_arn     = var.enable_waf ? module.waf[0].web_acl_arn : null

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

  api_gateway_domain_name    = module.api.custom_domain_name
  api_gateway_hosted_zone_id = module.api.custom_domain_zone_id

  acm_validation_records = module.acm.validation_records

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

  lambda_function_name = module.api.lambda_function_name
  api_gateway_id       = module.api.api_id
  dynamodb_table_name  = module.dynamodb.table_name
  sqs_queue_name       = var.enable_sqs ? module.eventing.queue_name : ""
  sqs_dlq_name         = var.enable_sqs ? module.eventing.dlq_name : ""

  create_dashboard = false # No dashboard in dev

  tags = local.common_tags
}
