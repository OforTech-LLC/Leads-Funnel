# =============================================================================
# Terraform Backend Configuration
# =============================================================================
# Stores state in S3 and uses DynamoDB for locking.
# Mitigates Gotcha #7 (Team State Locking).
#
# Resources are created via scripts/bootstrap-state.sh
# =============================================================================

terraform {
  backend "s3" {
    # These values are placeholders. They are filled in by `terraform init -backend-config=...`
    # or by manually editing this file after running bootstrap-state.sh.
    # We use a partial configuration here to allow flexibility.

    bucket         = "kanjona-terraform-state-prod" # Replace with actual bucket name from bootstrap
    key            = "kanjona/prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "kanjona-terraform-locks" # Replace with actual table name from bootstrap
  }
}
