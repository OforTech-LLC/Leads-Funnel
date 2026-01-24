# =============================================================================
# Terraform Variables - Prod Environment
# =============================================================================
# This file contains environment-specific values for the prod environment.
#
# IMPORTANT: Review all values before deploying to production!
# =============================================================================

# Core settings
environment = "prod"
root_domain = "kanjona.com"
aws_region  = "us-east-1"

# =============================================================================
# FEATURE FLAGS - COST TIERS
# =============================================================================
# Toggle via GitHub Action: .github/workflows/toggle-features.yml
#
# EXPENSIVE features (~$10-15/month combined):
#   - WAF: ~$5-6/month base + per-request
#   - CloudFront logging: ~$1-2/month (S3 storage)
#   - API logging: ~$1-2/month (CloudWatch)
#   - X-Ray: ~$1-2/month
#   - Alarms: ~$1-2/month (CloudWatch)
#   - PITR: ~$0.20/GB/month
#
# CHEAP/FREE features:
#   - SQS: ~$0.50/month
#   - SES: Free (sandbox)
#
# STATUS: Development mode (expensive features OFF)
# When ready for release, run GitHub Action "Enable Production Features"
# =============================================================================

# --- EXPENSIVE FEATURES (enable for production release) ---
enable_waf                = false
enable_cloudfront_logging = false
enable_api_logging        = false
enable_xray               = false
enable_alarms             = false
enable_pitr               = false

# --- CHEAP/FREE FEATURES ---
enable_sqs = false
enable_ses = false

# =============================================================================
# RESOURCE CONFIGURATION
# =============================================================================

# Lambda settings
lambda_memory_mb            = 256
lambda_reserved_concurrency = 50

# CORS - production domains only (no localhost)
additional_cors_origins = []

# Notifications - UPDATE BEFORE RELEASE
alert_email        = ""
notification_email = ""

# =============================================================================
# BASIC AUTHENTICATION (Password Protection)
# =============================================================================
# Protects the site during development. Disable when ready for public release.
# Toggle via GitHub Action or set enable_basic_auth = false
# =============================================================================

enable_basic_auth   = true
basic_auth_username = "admin"
basic_auth_password = "admin"
