# =============================================================================
# Terraform Backend Configuration - Prod Environment
# =============================================================================
# The state bucket and DynamoDB lock table must be created first.
# Run ./scripts/bootstrap-state.sh to create these resources.
# =============================================================================

terraform {
  backend "s3" {
    # Bucket name format: {project}-terraform-state-{account_id}
    # Update with your actual bucket name after running bootstrap script
    bucket = "kanjona-funnel-terraform-state"

    key    = "env/prod/terraform.tfstate"
    region = "us-east-1"

    # DynamoDB table for state locking
    dynamodb_table = "kanjona-funnel-terraform-locks"

    # Enable encryption at rest
    encrypt = true
  }
}
