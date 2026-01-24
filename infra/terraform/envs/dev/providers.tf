# =============================================================================
# Terraform Providers Configuration - Dev Environment
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

# -----------------------------------------------------------------------------
# Default AWS Provider
# -----------------------------------------------------------------------------
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Repository  = "kanjona-funnel-infra"
    }
  }
}

# -----------------------------------------------------------------------------
# US-East-1 Provider (Required for CloudFront, WAF, ACM)
# -----------------------------------------------------------------------------
# CloudFront, WAF (CLOUDFRONT scope), and ACM certificates for CloudFront
# MUST be created in us-east-1 regardless of your default region.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Repository  = "kanjona-funnel-infra"
    }
  }
}
