# =============================================================================
# Terraform Variables - Dev Environment
# =============================================================================
# Project: kanjona
# 47-funnel lead generation platform
# =============================================================================

# Core settings
project_name = "kanjona"
environment  = "dev"
root_domain  = "kanjona.com"
aws_region   = "us-east-1"

# =============================================================================
# FEATURE FLAGS
# =============================================================================
# Toggle via GitHub Action: .github/workflows/toggle-features.yml
#
# EXPENSIVE features (disabled in dev to save costs):
#   - WAF: ~$5-6/month base + per-request
#   - CloudFront logging: ~$1-2/month (S3 storage)
#   - API logging: ~$1-2/month (CloudWatch)
#   - X-Ray: ~$1-2/month
#   - Alarms: ~$1-2/month (CloudWatch)
#   - PITR: ~$0.20/GB/month
#
# Voice Agent features (disabled by default):
#   - enable_voice_agent: Master toggle for voice functionality
#   - enable_twilio: Twilio integration for calls/SMS
#   - enable_elevenlabs: ElevenLabs AI voice synthesis
# =============================================================================

# --- EXPENSIVE FEATURES (disabled for development) ---
enable_waf                = false
enable_cloudfront_logging = false
enable_api_logging        = false
enable_xray               = false
enable_alarms             = false
enable_pitr               = false # Dev: PITR disabled

# --- VOICE AGENT FEATURES (disabled by default) ---
enable_voice_agent = false
enable_twilio      = false
enable_elevenlabs  = false

# --- CHEAP/FREE FEATURES ---
enable_sqs = false
enable_ses = false

# =============================================================================
# RESOURCE CONFIGURATION
# =============================================================================

# Lambda settings (cost optimized for dev)
lambda_memory_mb            = 128
lambda_reserved_concurrency = null

# CORS - allow localhost for development
additional_cors_origins = ["http://localhost:3000", "http://localhost:5173"]

# Notifications (optional)
alert_email        = ""
notification_email = ""

# =============================================================================
# BASIC AUTHENTICATION (Password Protection)
# =============================================================================
# Protects the site during development. Disable when ready for public release.
# =============================================================================

enable_basic_auth = true
# basic_auth_username - Set via TF_VAR_basic_auth_username environment variable
# basic_auth_password - Set via TF_VAR_basic_auth_password environment variable
