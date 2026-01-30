# SECURITY NOTE: CloudFront Functions cannot access external secrets.
# The basic auth credentials are embedded in the function source code.
# Ensure credentials are strong and rotated regularly.
# The Terraform state file also contains these credentials.
# Consider using Lambda@Edge for production authentication.

# =============================================================================
# CloudFront Function - Basic Authentication
# =============================================================================
# Protects the site with HTTP Basic Auth during development.
# Disable this (enable_basic_auth = false) when ready for public release.
# =============================================================================

resource "aws_cloudfront_function" "basic_auth" {
  name    = "${var.project_name}-${var.environment}-basic-auth"
  runtime = "cloudfront-js-2.0"
  comment = "Basic authentication for ${var.project_name} ${var.environment}"
  publish = true

  lifecycle {
    create_before_destroy = true
  }

  code = <<-EOF
    function handler(event) {
      var request = event.request;
      var headers = request.headers;
      var authEnabled = ${var.enable_basic_auth ? "true" : "false"};

      if (authEnabled) {
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
      }

      // SPA rewrite for extensionless routes
      var uri = request.uri;

      if (uri === "/") {
        request.uri = "/index.html";
        return request;
      }

      var lastSlash = uri.lastIndexOf("/");
      var lastSegment = uri.substring(lastSlash + 1);

      // Skip files with extensions (e.g., .js, .css, .png)
      if (lastSegment.indexOf(".") !== -1) {
        return request;
      }

      // Append index.html for extensionless paths
      if (uri.charAt(uri.length - 1) === "/") {
        request.uri = uri + "index.html";
        return request;
      }

      request.uri = uri + "/index.html";
      return request;
    }
  EOF
}
