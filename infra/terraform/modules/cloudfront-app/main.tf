# =============================================================================
# CloudFront App Module - S3 + CloudFront for SPA Applications
# =============================================================================
# Creates a CloudFront distribution with S3 origin for admin and portal apps:
# - S3 bucket for static assets (private, no website hosting)
# - CloudFront distribution with OAC (Origin Access Control)
# - S3 bucket policy allowing only CloudFront access
# - Security response headers
# - SPA routing (404/403 -> index.html)
# - Optional Route53 record
# - ACM certificate reference
#
# Used for admin.kanjona.com and portal.kanjona.com
# =============================================================================

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------
data "aws_caller_identity" "current" {}

# -----------------------------------------------------------------------------
# S3 Bucket - App Origin
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "app" {
  bucket = var.bucket_name

  tags = merge(var.tags, {
    Name = var.bucket_name
  })
}

# Block ALL public access
resource "aws_s3_bucket_public_access_block" "app" {
  bucket = aws_s3_bucket.app.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable versioning
resource "aws_s3_bucket_versioning" "app" {
  bucket = aws_s3_bucket.app.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "app" {
  bucket = aws_s3_bucket.app.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Bucket policy - allow ONLY CloudFront OAC
resource "aws_s3_bucket_policy" "app" {
  bucket = aws_s3_bucket.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.app.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.app.arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.app]
}

# -----------------------------------------------------------------------------
# CloudFront Origin Access Control (OAC)
# -----------------------------------------------------------------------------
resource "aws_cloudfront_origin_access_control" "app" {
  name                              = "${var.app_name}-oac"
  description                       = "OAC for ${var.app_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# -----------------------------------------------------------------------------
# Response Headers Policy (Security Headers)
# -----------------------------------------------------------------------------
resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "${var.app_name}-security-headers"
  comment = "Security headers for ${var.app_name}"

  security_headers_config {
    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }

    content_security_policy {
      content_security_policy = var.content_security_policy
      override                = true
    }
  }
}

# -----------------------------------------------------------------------------
# CloudFront Cache Policy
# -----------------------------------------------------------------------------
resource "aws_cloudfront_cache_policy" "app" {
  name        = "${var.app_name}-cache-policy"
  comment     = "Cache policy for ${var.app_name}"
  default_ttl = 86400    # 1 day
  max_ttl     = 31536000 # 1 year
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }

    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# -----------------------------------------------------------------------------
# CloudFront Distribution
# -----------------------------------------------------------------------------
resource "aws_cloudfront_distribution" "app" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = var.app_name
  price_class         = var.price_class
  aliases             = var.domain_aliases
  web_acl_id          = var.waf_web_acl_arn

  # Origin configuration (S3 with OAC)
  origin {
    domain_name              = aws_s3_bucket.app.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.app.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.app.id
  }

  # Default cache behavior
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.app.id}"

    cache_policy_id            = aws_cloudfront_cache_policy.app.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  # SPA routing: 403/404 -> index.html
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  # SSL/TLS configuration
  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # Geographic restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = merge(var.tags, {
    Name = var.app_name
  })
}

# -----------------------------------------------------------------------------
# Route53 Records (Optional)
# -----------------------------------------------------------------------------
resource "aws_route53_record" "app" {
  for_each = var.route53_zone_id != null ? toset(var.domain_aliases) : toset([])

  zone_id = var.route53_zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.app.domain_name
    zone_id                = aws_cloudfront_distribution.app.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "app_aaaa" {
  for_each = var.route53_zone_id != null ? toset(var.domain_aliases) : toset([])

  zone_id = var.route53_zone_id
  name    = each.value
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.app.domain_name
    zone_id                = aws_cloudfront_distribution.app.hosted_zone_id
    evaluate_target_health = false
  }
}
