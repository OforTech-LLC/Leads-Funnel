# =============================================================================
# Terraform Backend Configuration - Prod Environment
# =============================================================================
# The state bucket uses native S3 locking via .tflock files.
# Run ./scripts/bootstrap-state.sh to create the state bucket.
# =============================================================================

terraform {
  backend "s3" {
    # Bucket name format: {project}-terraform-state-{account_id}
    # Update with your actual bucket name after running bootstrap script
    bucket = "kanjona-funnel-terraform-state"

    key    = "env/prod/terraform.tfstate"
    region = "us-east-1"

    # Use native S3 locking instead of DynamoDB
    use_lockfile = true

    # Enable encryption at rest
    encrypt = true
  }
}
