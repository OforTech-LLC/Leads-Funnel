# =============================================================================
# Secrets Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# Twilio Secret
# -----------------------------------------------------------------------------
output "twilio_secret_arn" {
  description = "ARN of the Twilio credentials secret"
  value       = aws_secretsmanager_secret.twilio.arn
}

output "twilio_secret_name" {
  description = "Name of the Twilio credentials secret"
  value       = aws_secretsmanager_secret.twilio.name
}

# -----------------------------------------------------------------------------
# ElevenLabs Secret
# -----------------------------------------------------------------------------
output "elevenlabs_secret_arn" {
  description = "ARN of the ElevenLabs credentials secret"
  value       = aws_secretsmanager_secret.elevenlabs.arn
}

output "elevenlabs_secret_name" {
  description = "Name of the ElevenLabs credentials secret"
  value       = aws_secretsmanager_secret.elevenlabs.name
}

# -----------------------------------------------------------------------------
# IP Hash Salt Secret
# -----------------------------------------------------------------------------
output "ip_hash_salt_secret_arn" {
  description = "ARN of the IP hash salt secret"
  value       = aws_secretsmanager_secret.ip_hash_salt.arn
}

output "ip_hash_salt_secret_name" {
  description = "Name of the IP hash salt secret"
  value       = aws_secretsmanager_secret.ip_hash_salt.name
}

# -----------------------------------------------------------------------------
# Webhook Secret
# -----------------------------------------------------------------------------
output "webhook_secret_arn" {
  description = "ARN of the webhook signing secret"
  value       = aws_secretsmanager_secret.webhook_secret.arn
}

output "webhook_secret_name" {
  description = "Name of the webhook signing secret"
  value       = aws_secretsmanager_secret.webhook_secret.name
}

# -----------------------------------------------------------------------------
# API Keys Secret
# -----------------------------------------------------------------------------
output "api_keys_secret_arn" {
  description = "ARN of the generic API keys secret"
  value       = aws_secretsmanager_secret.api_keys.arn
}

output "api_keys_secret_name" {
  description = "Name of the generic API keys secret"
  value       = aws_secretsmanager_secret.api_keys.name
}

# -----------------------------------------------------------------------------
# All Secret ARNs (for IAM policies)
# -----------------------------------------------------------------------------
output "all_secret_arns" {
  description = "List of all secret ARNs for IAM policies"
  value = [
    aws_secretsmanager_secret.twilio.arn,
    aws_secretsmanager_secret.elevenlabs.arn,
    aws_secretsmanager_secret.ip_hash_salt.arn,
    aws_secretsmanager_secret.webhook_secret.arn,
    aws_secretsmanager_secret.api_keys.arn,
  ]
}

# -----------------------------------------------------------------------------
# Secret ARN Pattern (for IAM wildcard policies)
# -----------------------------------------------------------------------------
output "secret_arn_pattern" {
  description = "ARN pattern for IAM wildcard policies"
  value       = "arn:aws:secretsmanager:*:*:secret:${var.project_name}/${var.environment}/*"
}
