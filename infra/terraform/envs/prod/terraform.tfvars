# =============================================================================
# Terraform Variables - Prod Environment
# =============================================================================
# Project: kanjona
# 47-funnel lead generation platform
#
# IMPORTANT: Review all values before deploying to production!
# =============================================================================

# Core settings
project_name = "kanjona"
environment  = "prod"
root_domain  = "kanjona.com"
aws_region   = "us-east-1"

# =============================================================================
# FEATURE FLAGS
# =============================================================================
# Toggle via GitHub Action: .github/workflows/toggle-features.yml
#
# Production defaults:
#   - WAF: ENABLED for security
#   - CloudFront logging: ENABLED for auditing
#   - API logging: ENABLED for debugging
#   - X-Ray: ENABLED for tracing
#   - Alarms: ENABLED for monitoring
#   - PITR: ENABLED for data recovery
#
# Voice Agent features (disabled by default - enable when ready):
#   - enable_voice_agent: Master toggle for voice functionality
#   - enable_twilio: Twilio integration for calls/SMS
#   - enable_elevenlabs: ElevenLabs AI voice synthesis
# =============================================================================

# --- PRODUCTION FEATURES (enable for production release) ---
enable_waf                = true   # Prod: WAF enabled for security
enable_cloudfront_logging = true   # Prod: Logging enabled for auditing
enable_api_logging        = true   # Prod: Logging enabled for debugging
enable_xray               = true   # Prod: Tracing enabled
enable_alarms             = true   # Prod: Monitoring enabled
enable_pitr               = true   # Prod: PITR enabled for data recovery

# --- VOICE AGENT FEATURES (enable when ready) ---
enable_voice_agent = false
enable_twilio      = false
enable_elevenlabs  = false

# --- ASYNC PROCESSING ---
enable_sqs = true   # Enable SQS for async lead processing
enable_ses = false  # Enable when ready for email notifications

# =============================================================================
# RESOURCE CONFIGURATION
# =============================================================================

# Lambda settings (production optimized)
lambda_memory_mb            = 512
lambda_reserved_concurrency = 100

# CORS - production domains only (no localhost)
additional_cors_origins = []

# Notifications - UPDATE BEFORE RELEASE
alert_email        = ""
notification_email = ""

# =============================================================================
# BASIC AUTHENTICATION (Password Protection)
# =============================================================================
# Disable for public release
# =============================================================================

enable_basic_auth   = false
basic_auth_username = ""
basic_auth_password = ""
