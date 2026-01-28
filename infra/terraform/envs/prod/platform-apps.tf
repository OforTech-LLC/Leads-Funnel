# =============================================================================
# Platform CloudFront Apps - Prod Environment (Admin + Portal)
# =============================================================================
# CloudFront distributions with S3 origins for the admin and portal
# single-page applications. Controlled by enable_platform feature flag.
# Production: WAF enabled, PriceClass_200 for broader geographic coverage.
# =============================================================================

# --- Admin App ---
module "admin_app" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/cloudfront-app"

  app_name    = "${local.prefix}-admin-app"
  bucket_name = "${local.prefix}-admin-app-origin"

  domain_aliases      = ["${local.admin_subdomain}.${var.root_domain}"]
  acm_certificate_arn = module.acm.validated_certificate_arn
  route53_zone_id     = module.dns.zone_id
  waf_web_acl_arn     = local.waf_web_acl_arn

  price_class = "PriceClass_200"

  tags = merge(local.common_tags, { Type = "platform-admin-app" })
}

# --- Portal App ---
module "portal_app" {
  count  = var.enable_platform ? 1 : 0
  source = "../../modules/cloudfront-app"

  app_name    = "${local.prefix}-portal-app"
  bucket_name = "${local.prefix}-portal-app-origin"

  domain_aliases      = ["${local.portal_subdomain}.${var.root_domain}"]
  acm_certificate_arn = module.acm.validated_certificate_arn
  route53_zone_id     = module.dns.zone_id
  waf_web_acl_arn     = local.waf_web_acl_arn

  price_class = "PriceClass_200"

  tags = merge(local.common_tags, { Type = "platform-portal-app" })
}
