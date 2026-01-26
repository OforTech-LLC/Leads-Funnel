# =============================================================================
# Secrets Module - AWS Secrets Manager
# =============================================================================
# This module creates:
# - Twilio credentials secret (placeholder)
# - ElevenLabs API key secret (placeholder)
# - Generic API keys secret for future integrations
#
# IMPORTANT: Secrets are created with placeholder values.
# Update them manually via AWS Console or CLI after creation.
# =============================================================================

# -----------------------------------------------------------------------------
# Local Values
# -----------------------------------------------------------------------------
locals {
  secret_prefix = "${var.project_name}/${var.environment}"
}

# -----------------------------------------------------------------------------
# Twilio Credentials Secret
# -----------------------------------------------------------------------------
# Stores Twilio Account SID, Auth Token, and Phone Number
# Used by voice-start and voice-webhook Lambda functions
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "twilio" {
  name        = "${local.secret_prefix}/twilio"
  description = "Twilio API credentials for voice agent"

  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-twilio"
    Service = "twilio"
    Type    = "api-credentials"
  })
}

resource "aws_secretsmanager_secret_version" "twilio" {
  secret_id = aws_secretsmanager_secret.twilio.id
  secret_string = jsonencode({
    account_sid    = var.twilio_account_sid != "" ? var.twilio_account_sid : "PLACEHOLDER_ACCOUNT_SID"
    auth_token     = var.twilio_auth_token != "" ? var.twilio_auth_token : "PLACEHOLDER_AUTH_TOKEN"
    phone_number   = var.twilio_phone_number != "" ? var.twilio_phone_number : "+1XXXXXXXXXX"
    api_key_sid    = var.twilio_api_key_sid != "" ? var.twilio_api_key_sid : "PLACEHOLDER_API_KEY_SID"
    api_key_secret = var.twilio_api_key_secret != "" ? var.twilio_api_key_secret : "PLACEHOLDER_API_KEY_SECRET"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# -----------------------------------------------------------------------------
# ElevenLabs API Key Secret
# -----------------------------------------------------------------------------
# Stores ElevenLabs API key and voice configuration
# Used by voice agent for text-to-speech synthesis
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "elevenlabs" {
  name        = "${local.secret_prefix}/elevenlabs"
  description = "ElevenLabs API credentials for AI voice synthesis"

  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-elevenlabs"
    Service = "elevenlabs"
    Type    = "api-credentials"
  })
}

resource "aws_secretsmanager_secret_version" "elevenlabs" {
  secret_id = aws_secretsmanager_secret.elevenlabs.id
  secret_string = jsonencode({
    api_key    = var.elevenlabs_api_key != "" ? var.elevenlabs_api_key : "PLACEHOLDER_API_KEY"
    voice_id   = var.elevenlabs_voice_id != "" ? var.elevenlabs_voice_id : "21m00Tcm4TlvDq8ikWAM"
    model_id   = var.elevenlabs_model_id != "" ? var.elevenlabs_model_id : "eleven_monolingual_v1"
    stability  = 0.5
    similarity = 0.75
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# -----------------------------------------------------------------------------
# IP Hash Salt Secret
# -----------------------------------------------------------------------------
# Salt used for hashing IP addresses for rate limiting
# Ensures privacy compliance while maintaining rate limit functionality
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "ip_hash_salt" {
  name        = "${local.secret_prefix}/ip-hash-salt"
  description = "Salt for IP address hashing in rate limiting"

  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-ip-hash-salt"
    Service = "rate-limiting"
    Type    = "security"
  })
}

resource "aws_secretsmanager_secret_version" "ip_hash_salt" {
  secret_id = aws_secretsmanager_secret.ip_hash_salt.id
  secret_string = jsonencode({
    salt = var.ip_hash_salt != "" ? var.ip_hash_salt : random_password.ip_hash_salt.result
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Generate random salt if not provided
resource "random_password" "ip_hash_salt" {
  length  = 32
  special = false
}

# -----------------------------------------------------------------------------
# Webhook Signing Secret
# -----------------------------------------------------------------------------
# Secret for signing and verifying webhook payloads
# Used to ensure webhook authenticity
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "webhook_secret" {
  name        = "${local.secret_prefix}/webhook-secret"
  description = "Secret for signing and verifying webhook payloads"

  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-webhook-secret"
    Service = "webhooks"
    Type    = "security"
  })
}

resource "aws_secretsmanager_secret_version" "webhook_secret" {
  secret_id = aws_secretsmanager_secret.webhook_secret.id
  secret_string = jsonencode({
    secret = var.webhook_secret != "" ? var.webhook_secret : random_password.webhook_secret.result
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Generate random webhook secret if not provided
resource "random_password" "webhook_secret" {
  length  = 64
  special = true
}

# -----------------------------------------------------------------------------
# Generic API Keys Secret
# -----------------------------------------------------------------------------
# Placeholder for additional third-party API integrations
# Can be extended as new integrations are added
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "api_keys" {
  name        = "${local.secret_prefix}/api-keys"
  description = "Generic API keys for third-party integrations"

  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-api-keys"
    Service = "integrations"
    Type    = "api-credentials"
  })
}

resource "aws_secretsmanager_secret_version" "api_keys" {
  secret_id = aws_secretsmanager_secret.api_keys.id
  secret_string = jsonencode({
    openai_api_key     = "PLACEHOLDER"
    sendgrid_api_key   = "PLACEHOLDER"
    slack_webhook_url  = "PLACEHOLDER"
    zapier_webhook_url = "PLACEHOLDER"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}
