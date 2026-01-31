# =============================================================================
# Platform Cognito User Pools - Dev Environment (Admin + Portal)
# =============================================================================
# Controlled by enable_platform feature flag.
# =============================================================================

# --- Admin User Pool ---
module "cognito_admin" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/cognito-userpool"

  # Note: Lambda triggers temporarily disabled for initial deployment
  # depends_on = [module.pre_token_admin]

  pool_name     = "${local.prefix}-admin-userpool"
  domain_prefix = var.platform_admin_cognito_domain

  mfa_configuration            = "OPTIONAL" # Set to OPTIONAL for easier dev testing
  advanced_security_mode       = "AUDIT"
  allow_admin_create_user_only = true
  challenge_on_new_device      = true
  enable_sms_mfa               = true
  enable_webauthn              = true
  webauthn_user_verification   = "preferred"

  custom_attributes = [
    {
      name                = "role"
      attribute_data_type = "String"
      min_length          = 1
      max_length          = 50
    },
    {
      name                = "orgId"
      attribute_data_type = "String"
      min_length          = 1
      max_length          = 100
    },
  ]

  callback_urls = concat(
    [
      "https://${local.admin_subdomain}.${var.root_domain}/callback",
      "https://${local.env_subdomain}.${var.root_domain}/admin/callback",
    ],
    [
      "http://localhost:3001/callback",
      "http://localhost:3000/admin/callback",
    ]
  )
  logout_urls = concat(
    [
      "https://${local.admin_subdomain}.${var.root_domain}/login",
      "https://${local.env_subdomain}.${var.root_domain}/admin",
    ],
    [
      "http://localhost:3001/login",
      "http://localhost:3000/admin",
    ]
  )

  read_attributes = ["email", "email_verified", "custom:role", "custom:orgId"]
  # custom:role removed from write_attributes - role should only be set by admin API, not self-service
  write_attributes = ["email", "custom:orgId"]

  # Token validity
  access_token_validity  = 30 # 30 minutes
  id_token_validity      = 30 # 30 minutes
  refresh_token_validity = 30 # 30 days

  user_groups = [
    { name = "SuperAdmin", description = "Platform super administrator", precedence = 1 },
    { name = "OrgAdmin", description = "Organization administrator", precedence = 2 },
    { name = "OrgViewer", description = "Organization read-only viewer", precedence = 3 },
  ]

  # Pre-token generation trigger (adds custom claims)
  enable_pre_token_trigger         = true
  pre_token_generation_lambda_arn  = local.pre_token_admin_function_arn
  pre_token_generation_lambda_name = local.pre_token_admin_function_name

  invite_email_subject = "Kanjona Admin - Your Account"
  invite_email_message = "Your admin account has been created. Username: {username}, Temporary password: {####}. Please log in and change your password."

  tags = merge(local.common_tags, { Type = "platform-admin-cognito" })
}

# --- Portal User Pool ---
module "cognito_portal" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/cognito-userpool"

  depends_on = [module.pre_token_portal]

  pool_name     = "${local.prefix}-portal-userpool"
  domain_prefix = var.platform_portal_cognito_domain

  mfa_configuration            = "OPTIONAL"
  advanced_security_mode       = "AUDIT"
  allow_admin_create_user_only = true # Admin-only portal provisioning
  challenge_on_new_device      = true
  enable_sms_mfa               = true
  enable_webauthn              = true
  webauthn_user_verification   = "preferred"

  custom_attributes = [
    {
      name                = "orgId"
      attribute_data_type = "String"
      min_length          = 1
      max_length          = 100
    },
    {
      name                = "membershipRole"
      attribute_data_type = "String"
      min_length          = 1
      max_length          = 50
    },
  ]

  callback_urls = concat(
    ["https://${local.portal_subdomain}.${var.root_domain}/callback"],
    ["http://localhost:3002/callback"]
  )
  logout_urls = concat(
    ["https://${local.portal_subdomain}.${var.root_domain}/login"],
    ["http://localhost:3002/login"]
  )

  read_attributes  = ["email", "email_verified", "custom:orgId", "custom:membershipRole"]
  write_attributes = ["email", "custom:orgId", "custom:membershipRole"]

  # Pre-token generation trigger (adds org/user claims)
  enable_pre_token_trigger         = true
  pre_token_generation_lambda_arn  = local.pre_token_portal_function_arn
  pre_token_generation_lambda_name = local.pre_token_portal_function_name

  # Token validity
  access_token_validity  = 30 # 30 minutes
  id_token_validity      = 30 # 30 minutes
  refresh_token_validity = 30 # 30 days

  user_groups = [
    { name = "OrgOwner", description = "Organization owner", precedence = 1 },
    { name = "OrgMember", description = "Organization member", precedence = 2 },
  ]

  invite_email_subject = "Kanjona Portal - Your Account"
  invite_email_message = "Your portal account has been created. Username: {username}, Temporary password: {####}. Please log in and change your password."

  tags = merge(local.common_tags, { Type = "platform-portal-cognito" })
}
