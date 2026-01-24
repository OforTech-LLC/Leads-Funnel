# =============================================================================
# CloudFront Function - Basic Authentication
# =============================================================================
# Protects the site with HTTP Basic Auth during development.
# Disable this (enable_basic_auth = false) when ready for public release.
# =============================================================================

resource "aws_cloudfront_function" "basic_auth" {
  count = var.enable_basic_auth ? 1 : 0

  name    = "${var.project_name}-${var.environment}-basic-auth"
  runtime = "cloudfront-js-2.0"
  comment = "Basic authentication for ${var.project_name} ${var.environment}"
  publish = true

  code = <<-EOF
    function handler(event) {
      var request = event.request;
      var headers = request.headers;

      // Base64 encoded credentials: admin:admin
      // To generate: echo -n "admin:admin" | base64
      var authString = "Basic ${base64encode("${var.basic_auth_username}:${var.basic_auth_password}")}";

      // Check for Authorization header
      if (
        typeof headers.authorization === "undefined" ||
        headers.authorization.value !== authString
      ) {
        return {
          statusCode: 401,
          statusDescription: "Unauthorized",
          headers: {
            "www-authenticate": { value: "Basic realm=\"${var.project_name} ${var.environment}\"" },
            "content-type": { value: "text/html" }
          },
          body: {
            encoding: "text",
            data: "<html><body><h1>401 Unauthorized</h1><p>Authentication required.</p></body></html>"
          }
        };
      }

      // Authentication successful - continue to origin
      return request;
    }
  EOF
}
