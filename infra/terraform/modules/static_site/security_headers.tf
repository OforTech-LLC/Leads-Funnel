# =============================================================================
# CloudFront Response Headers Policy - Security Headers
# =============================================================================
# Implements security headers per OWASP recommendations:
# - Strict-Transport-Security (HSTS)
# - X-Content-Type-Options
# - X-Frame-Options
# - X-XSS-Protection
# - Referrer-Policy
# - Content-Security-Policy
# =============================================================================

resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "${var.project_name}-${var.environment}-security-headers"
  comment = "Security headers for ${var.project_name} ${var.environment}"

  # Security headers configuration
  security_headers_config {
    # HSTS - Force HTTPS for 1 year, include subdomains, allow preload
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    # Prevent MIME type sniffing
    content_type_options {
      override = true
    }

    # Prevent clickjacking
    frame_options {
      frame_option = "DENY"
      override     = true
    }

    # XSS Protection (legacy but still useful)
    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }

    # Referrer policy
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    # Content Security Policy
    content_security_policy {
      content_security_policy = var.content_security_policy
      override                = true
    }
  }

  # Custom headers
  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
      override = true
    }
  }
}
