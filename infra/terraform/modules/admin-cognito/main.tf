/**
 * Admin Cognito User Pool
 *
 * Provides authentication for the admin console.
 * Features:
 * - MFA support (optional/required)
 * - Email verification
 * - Password policies
 * - App client for Next.js
 * - Advanced security (ENFORCED for prod, AUDIT for dev)
 */

# =====================================================
# Data Sources
# =====================================================

data "aws_region" "current" {}

# =====================================================
# Cognito User Pool
# =====================================================

resource "aws_cognito_user_pool" "admin" {
  name = "${var.project_name}-${var.environment}-admin-userpool"

  # Username configuration
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # Password policy
  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  # MFA configuration
  mfa_configuration = var.mfa_configuration

  software_token_mfa_configuration {
    enabled = true
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # User pool add-ons - Advanced security for threat protection
  # ENFORCED for prod (blocks suspicious sign-ins)
  # AUDIT for dev (logs but doesn't block)
  user_pool_add_ons {
    advanced_security_mode = var.environment == "prod" ? "ENFORCED" : "AUDIT"
  }

  # Schema attributes
  schema {
    name                     = "email"
    attribute_data_type      = "String"
    required                 = true
    mutable                  = true
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 5
      max_length = 254
    }
  }

  schema {
    name                     = "role"
    attribute_data_type      = "String"
    required                 = false
    mutable                  = true
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 1
      max_length = 50
    }
  }

  # Admin create user config
  admin_create_user_config {
    allow_admin_create_user_only = true

    invite_message_template {
      email_subject = "${var.project_name} Admin Console - Your Credentials"
      email_message = "Your admin account has been created. Username: {username}, Temporary password: {####}. Please log in and change your password."
      sms_message   = "Your admin account has been created. Username: {username}, Temporary password: {####}"
    }
  }

  # Verification message
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "${var.project_name} Admin - Verify Your Email"
    email_message        = "Your verification code is {####}"
  }

  # Device configuration
  device_configuration {
    challenge_required_on_new_device      = true
    device_only_remembered_on_user_prompt = true
  }

  tags = var.tags
}

# =====================================================
# Cognito User Pool Domain
# =====================================================

resource "aws_cognito_user_pool_domain" "admin" {
  domain       = "${var.project_name}-${var.environment}-admin"
  user_pool_id = aws_cognito_user_pool.admin.id
}

# =====================================================
# Cognito User Pool Client (Next.js App)
# =====================================================

resource "aws_cognito_user_pool_client" "admin_web" {
  name         = "${var.project_name}-${var.environment}-admin-web-client"
  user_pool_id = aws_cognito_user_pool.admin.id

  # OAuth configuration
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  supported_identity_providers         = ["COGNITO"]

  # Callback URLs - Environment-specific (no localhost in production)
  # Production environments should only have production URLs
  callback_urls = var.environment == "prod" ? var.admin_callback_urls : concat(
    var.admin_callback_urls,
    var.enable_localhost_callbacks ? ["http://localhost:3000/admin/auth/callback"] : []
  )

  logout_urls = var.environment == "prod" ? var.admin_logout_urls : concat(
    var.admin_logout_urls,
    var.enable_localhost_callbacks ? ["http://localhost:3000/admin"] : []
  )

  # Token validity
  access_token_validity  = var.environment == "prod" ? 1 : 4  # hours (shorter in prod)
  id_token_validity      = var.environment == "prod" ? 1 : 4  # hours
  refresh_token_validity = var.environment == "prod" ? 7 : 30 # days (shorter in prod)

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # Security settings
  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true

  # Auth flows
  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
  ]

  # Read/Write attributes
  read_attributes = [
    "email",
    "email_verified",
    "custom:role",
  ]

  write_attributes = [
    "email",
    # custom:role removed - role should only be set by admin API, not self-service
  ]

  generate_secret = false
}

# =====================================================
# Cognito User Groups (RBAC)
# =====================================================

resource "aws_cognito_user_group" "admin" {
  name         = "Admin"
  user_pool_id = aws_cognito_user_pool.admin.id
  description  = "Full admin access - read/write/export"
  precedence   = 1
}

resource "aws_cognito_user_group" "viewer" {
  name         = "Viewer"
  user_pool_id = aws_cognito_user_pool.admin.id
  description  = "Read-only access with export"
  precedence   = 2
}

# =====================================================
# Resource Server (optional - for API scopes)
# =====================================================

resource "aws_cognito_resource_server" "admin_api" {
  identifier   = "admin-api"
  name         = "Admin API"
  user_pool_id = aws_cognito_user_pool.admin.id

  scope {
    scope_name        = "read"
    scope_description = "Read access to admin API"
  }

  scope {
    scope_name        = "write"
    scope_description = "Write access to admin API"
  }

  scope {
    scope_name        = "export"
    scope_description = "Export access to admin API"
  }
}
