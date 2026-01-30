# =============================================================================
# CloudFront Function - SPA Rewrite (index.html)
# =============================================================================
# Rewrites extensionless paths to /index.html so S3 (with OAC) can serve
# Next.js static exports without S3 website hosting.
# =============================================================================

resource "aws_cloudfront_function" "spa_rewrite" {
  name    = "${var.app_name}-spa-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "SPA index.html rewrite for ${var.app_name}"
  publish = true

  code = <<-EOF
    function handler(event) {
      var request = event.request;
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
