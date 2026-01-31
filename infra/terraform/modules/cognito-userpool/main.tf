# =============================================================================
# Cognito User Pool Module - Reusable Authentication Pool
# =============================================================================
# Creates a configurable Cognito User Pool with:
# - Password policy
# - MFA configuration (TOTP)
# - App client with OAuth configuration
# - Hosted UI domain
# - Pre-token generation Lambda trigger support
# - User groups for RBAC
#
# Used for both admin and portal authentication pools.
# =============================================================================

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------
data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# Optional SMS MFA Support
# -----------------------------------------------------------------------------
resource "random_id" "sms_external_id" {
  count       = var.enable_sms_mfa && var.sms_external_id == null ? 1 : 0
  byte_length = 8
}

resource "aws_iam_role" "sms_role" {
  count = var.enable_sms_mfa && var.sms_sns_caller_arn == null ? 1 : 0
  name  = "${var.pool_name}-sms-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "cognito-idp.amazonaws.com"
        },
        Action = "sts:AssumeRole",
        Condition = {
          StringEquals = {
            "sts:ExternalId" = var.sms_external_id != null ? var.sms_external_id : random_id.sms_external_id[0].hex
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "sms_publish" {
  count = var.enable_sms_mfa && var.sms_sns_caller_arn == null ? 1 : 0
  name  = "${var.pool_name}-sms-publish"
  role  = aws_iam_role.sms_role[0].id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect   = "Allow",
        Action   = ["sns:Publish"],
        Resource = "*"
      }
    ]
  })
}

locals {
  sms_external_id = var.sms_external_id != null ? var.sms_external_id : (
    var.enable_sms_mfa && length(random_id.sms_external_id) > 0 ? random_id.sms_external_id[0].hex : null
  )
  sms_sns_caller_arn = var.sms_sns_caller_arn != null ? var.sms_sns_caller_arn : (
    var.enable_sms_mfa && length(aws_iam_role.sms_role) > 0 ? aws_iam_role.sms_role[0].arn : null
  )
  webauthn_relying_party_id = var.webauthn_relying_party_id != null ? var.webauthn_relying_party_id : "${var.domain_prefix}.auth.${data.aws_region.current.name}.amazoncognito.com"
  recovery_mechanisms = var.enable_email_mfa ? [
    { name = "verified_email", priority = 1 },
    { name = "verified_phone_number", priority = 2 },
    ] : [
    { name = "verified_email", priority = 1 },
  ]
}

# -----------------------------------------------------------------------------
# Cognito User Pool
# -----------------------------------------------------------------------------
resource "aws_cognito_user_pool" "this" {
  name = var.pool_name

  # Username configuration
  username_attributes      = var.username_attributes
  auto_verified_attributes = var.auto_verified_attributes

  # Password policy
  password_policy {
    minimum_length                   = var.password_minimum_length
    require_lowercase                = var.password_require_lowercase
    require_uppercase                = var.password_require_uppercase
    require_numbers                  = var.password_require_numbers
    require_symbols                  = var.password_require_symbols
    temporary_password_validity_days = var.temporary_password_validity_days
  }

  # MFA configuration
  mfa_configuration = var.mfa_configuration

  software_token_mfa_configuration {
    enabled = true
  }

  dynamic "sms_configuration" {
    for_each = var.enable_sms_mfa ? [1] : []
    content {
      external_id    = local.sms_external_id
      sns_caller_arn = local.sms_sns_caller_arn
    }
  }

  dynamic "web_authn_configuration" {
    for_each = var.enable_webauthn ? [1] : []
    content {
      relying_party_id  = local.webauthn_relying_party_id
      user_verification = var.webauthn_user_verification
    }
  }

  dynamic "email_mfa_configuration" {
    for_each = var.enable_email_mfa ? [1] : []
    content {
      subject = var.email_mfa_subject
      message = var.email_mfa_message
    }
  }

  # Account recovery
  account_recovery_setting {
    dynamic "recovery_mechanism" {
      for_each = local.recovery_mechanisms
      content {
        name     = recovery_mechanism.value.name
        priority = recovery_mechanism.value.priority
      }
    }
  }

  # Email configuration
  email_configuration {
    email_sending_account = var.ses_email_arn != null ? "DEVELOPER" : "COGNITO_DEFAULT"
    source_arn            = var.ses_email_arn
    from_email_address    = var.from_email_address
  }

  # User pool add-ons - Advanced security
  user_pool_add_ons {
    advanced_security_mode = var.advanced_security_mode
  }

  # Schema attributes - email is always required
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

  # Additional custom schema attributes
  dynamic "schema" {
    for_each = var.custom_attributes
    content {
      name                     = schema.value.name
      attribute_data_type      = schema.value.attribute_data_type
      required                 = lookup(schema.value, "required", false)
      mutable                  = lookup(schema.value, "mutable", true)
      developer_only_attribute = false

      dynamic "string_attribute_constraints" {
        for_each = schema.value.attribute_data_type == "String" ? [1] : []
        content {
          min_length = lookup(schema.value, "min_length", 1)
          max_length = lookup(schema.value, "max_length", 256)
        }
      }

      dynamic "number_attribute_constraints" {
        for_each = schema.value.attribute_data_type == "Number" ? [1] : []
        content {
          min_value = lookup(schema.value, "min_value", null)
          max_value = lookup(schema.value, "max_value", null)
        }
      }
    }
  }

  # Admin create user config
  admin_create_user_config {
    allow_admin_create_user_only = var.allow_admin_create_user_only

    invite_message_template {
      email_subject = var.invite_email_subject
      email_message = var.invite_email_message
      sms_message   = "Your account has been created. Username: {username}, Temporary password: {####}"
    }
  }

  # Verification message
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "${var.pool_name} - Verify Your Email"
    email_message        = "Your verification code is {####}"
  }

  # Device configuration
  device_configuration {
    challenge_required_on_new_device      = var.challenge_on_new_device
    device_only_remembered_on_user_prompt = true
  }

  # Pre-token generation Lambda trigger (optional)
  dynamic "lambda_config" {
    for_each = var.enable_pre_token_trigger ? [1] : []
    content {
      pre_token_generation = var.pre_token_generation_lambda_arn
    }
  }

  tags = merge(var.tags, {
    Name = var.pool_name
  })
}

# -----------------------------------------------------------------------------
# Cognito User Pool Domain (Hosted UI)
# -----------------------------------------------------------------------------
resource "aws_cognito_user_pool_domain" "this" {
  domain       = var.domain_prefix
  user_pool_id = aws_cognito_user_pool.this.id
}

# -----------------------------------------------------------------------------
# Cognito User Pool Client (Web Application)
# -----------------------------------------------------------------------------
resource "aws_cognito_user_pool_client" "web" {
  name         = "${var.pool_name}-web-client"
  user_pool_id = aws_cognito_user_pool.this.id

  # OAuth configuration
  allowed_oauth_flows                  = var.allowed_oauth_flows
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = var.allowed_oauth_scopes
  supported_identity_providers         = var.supported_identity_providers

  # Callback URLs
  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  # Token validity
  access_token_validity  = var.access_token_validity
  id_token_validity      = var.id_token_validity
  refresh_token_validity = var.refresh_token_validity

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # Security settings
  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true

  # Auth flows
  explicit_auth_flows = var.explicit_auth_flows

  # Read/Write attributes
  read_attributes  = var.read_attributes
  write_attributes = var.write_attributes

  generate_secret = var.generate_client_secret
}

# -----------------------------------------------------------------------------
# Cognito User Groups (RBAC)
# -----------------------------------------------------------------------------
resource "aws_cognito_user_group" "groups" {
  for_each = { for g in var.user_groups : g.name => g }

  name         = each.value.name
  user_pool_id = aws_cognito_user_pool.this.id
  description  = each.value.description
  precedence   = each.value.precedence
}

# -----------------------------------------------------------------------------
# Lambda Permission for Pre-Token Generation Trigger
# -----------------------------------------------------------------------------
resource "aws_lambda_permission" "cognito_trigger" {
  count = var.enable_pre_token_trigger ? 1 : 0

  statement_id  = "AllowCognitoInvoke-${replace(var.pool_name, "-", "")}"
  action        = "lambda:InvokeFunction"
  function_name = var.pre_token_generation_lambda_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.this.arn
}
